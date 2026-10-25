import type Database from 'better-sqlite3';
import type { FoodItem, Nutrition, PricePoint, SupportPlace, SwapCandidate } from '@culinerity/core';

/** Repository interfaces: routes and ingest depend on these, never on SQLite. */
export interface CatalogueRepository {
  findCravings(text: string): Promise<FoodItem[]> | FoodItem[];
  popularCravings(): Promise<FoodItem[]> | FoodItem[];
  swapsFor(cravingId: string): Promise<SwapCandidate[]> | SwapCandidate[];
}

export interface PriceReader {
  getPrices(itemId: string): Promise<PricePoint[]> | PricePoint[];
}

export interface PriceWriter {
  /** Upsert live prices (stored with is_sample = 0). Returns how many rows were written. */
  upsertLivePrices(points: PricePoint[]): Promise<number> | number;
}

export interface PriceRepository extends PriceReader, PriceWriter {}

export interface NutritionRepository {
  getNutrition(itemId: string): Promise<Nutrition | null> | Nutrition | null;
}

export interface SupportRepository {
  findSupport(suburb?: string): Promise<SupportPlace[]> | SupportPlace[];
}

export interface Repositories {
  catalogue: CatalogueRepository;
  prices: PriceReader;
  nutrition: NutritionRepository;
  support: SupportRepository;
}

// ---- SQLite implementations (parameterised SQL only) ----

interface ItemRow {
  id: string;
  name: string;
  category: string;
}

function withKeywords(db: Database.Database, rows: ItemRow[]): FoodItem[] {
  const keywords = db.prepare('SELECT keyword FROM keywords WHERE item_id = ? ORDER BY rowid');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    keywords: (keywords.all(r.id) as Array<{ keyword: string }>).map((k) => k.keyword),
  }));
}

/** Escape LIKE wildcards so user text matches literally. */
const likeContains = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export class SqliteCatalogueRepository implements CatalogueRepository {
  constructor(private readonly db: Database.Database) {}

  findCravings(text: string): FoodItem[] {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const pattern = likeContains(q);
    const rows = this.db
      .prepare(
        `SELECT id, name, category FROM items
         WHERE popular_rank IS NOT NULL
           AND (lower(name) LIKE ? ESCAPE '\\'
                OR EXISTS (SELECT 1 FROM keywords k WHERE k.item_id = items.id AND lower(k.keyword) LIKE ? ESCAPE '\\'))
         ORDER BY popular_rank`,
      )
      .all(pattern, pattern) as ItemRow[];
    return withKeywords(this.db, rows);
  }

  popularCravings(): FoodItem[] {
    const rows = this.db
      .prepare('SELECT id, name, category FROM items WHERE popular_rank IS NOT NULL ORDER BY popular_rank')
      .all() as ItemRow[];
    return withKeywords(this.db, rows);
  }

  swapsFor(cravingId: string): SwapCandidate[] {
    const craving = this.db.prepare('SELECT id, name, category FROM items WHERE id = ?').get(cravingId) as
      | ItemRow
      | undefined;
    if (!craving) return [];
    const rows = this.db
      .prepare(
        `SELECT i.id, i.name, i.category, s.note FROM swaps s
         JOIN items i ON i.id = s.alternative_id
         WHERE s.craving_id = ? ORDER BY s.rowid`,
      )
      .all(cravingId) as Array<ItemRow & { note: string }>;
    const [cravingItem] = withKeywords(this.db, [craving]);
    const alternatives = withKeywords(this.db, rows);
    return rows.map((r, i) => ({ craving: cravingItem!, alternative: alternatives[i]!, note: r.note }));
  }
}

interface PriceRow {
  item_id: string;
  store: PricePoint['store'];
  price_per_serve: number;
  unit_label: string;
  observed_at: string;
  is_sample: number;
}

export class SqlitePriceRepository implements PriceRepository {
  constructor(private readonly db: Database.Database) {}

  /** Live rows win over sample rows for the same store. */
  getPrices(itemId: string): PricePoint[] {
    const rows = this.db
      .prepare(
        `SELECT p.item_id, p.store, p.price_per_serve, p.unit_label, p.observed_at, p.is_sample
         FROM prices p
         WHERE p.item_id = ?
           AND (p.is_sample = 0 OR NOT EXISTS (
             SELECT 1 FROM prices l WHERE l.item_id = p.item_id AND l.store = p.store AND l.is_sample = 0))
         ORDER BY p.rowid`,
      )
      .all(itemId) as PriceRow[];
    return rows.map((r) => ({
      itemId: r.item_id,
      store: r.store,
      pricePerServe: r.price_per_serve,
      unitLabel: r.unit_label,
      observedAt: r.observed_at,
      isSample: r.is_sample === 1,
    }));
  }

  upsertLivePrices(points: PricePoint[]): number {
    const upsert = this.db.prepare(
      `INSERT INTO prices (item_id, store, price_per_serve, unit_label, observed_at, is_sample)
       VALUES (?, ?, ?, ?, ?, 0)
       ON CONFLICT(item_id, store, is_sample) DO UPDATE SET
         price_per_serve = excluded.price_per_serve, unit_label = excluded.unit_label,
         observed_at = excluded.observed_at`,
    );
    this.db.transaction(() => {
      for (const p of points) upsert.run(p.itemId, p.store, p.pricePerServe, p.unitLabel, p.observedAt);
    })();
    return points.length;
  }
}

export class SqliteNutritionRepository implements NutritionRepository {
  constructor(private readonly db: Database.Database) {}

  getNutrition(itemId: string): Nutrition | null {
    const r = this.db
      .prepare('SELECT item_id, energy_kj, protein_g, fibre_g, sugar_g, sodium_mg FROM nutrition WHERE item_id = ?')
      .get(itemId) as
      | { item_id: string; energy_kj: number; protein_g: number; fibre_g: number; sugar_g: number; sodium_mg: number }
      | undefined;
    return r
      ? {
          itemId: r.item_id,
          energyKj: r.energy_kj,
          proteinG: r.protein_g,
          fibreG: r.fibre_g,
          sugarG: r.sugar_g,
          sodiumMg: r.sodium_mg,
        }
      : null;
  }
}

export class SqliteSupportRepository implements SupportRepository {
  constructor(private readonly db: Database.Database) {}

  /** Places in the given suburb come first (case-insensitive); others follow. */
  findSupport(suburb?: string): SupportPlace[] {
    const wanted = suburb?.trim().toLowerCase() ?? '';
    const rows = this.db
      .prepare(
        `SELECT id, name, kind, suburb, notes, is_sample FROM support_places
         ORDER BY (lower(suburb) = ?) DESC, rowid`,
      )
      .all(wanted) as Array<Omit<SupportPlace, 'isSample'> & { is_sample: number }>;
    return rows.map(({ is_sample, ...rest }) => ({ ...rest, isSample: is_sample === 1 }));
  }
}
