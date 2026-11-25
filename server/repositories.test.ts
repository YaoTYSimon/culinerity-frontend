import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { SEED_DATA } from '@culinerity/core';
import { openDatabase } from './db';
import {
  SqliteCatalogueRepository,
  SqliteNutritionRepository,
  SqlitePriceRepository,
  SqliteSupportRepository,
} from './repositories';
import { applySchema } from './db';
import { seedDatabase } from './seed';
import { seededMemoryDb } from './testDb';

const tableCount = (db: ReturnType<typeof seededMemoryDb>, t: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

describe('seeding', () => {
  it('is idempotent: running twice leaves the same rows', () => {
    const db = seededMemoryDb();
    const before = ['items', 'keywords', 'swaps', 'prices', 'nutrition', 'support_places', 'food_info'].map((t) => tableCount(db, t));
    seedDatabase(db);
    const after = ['items', 'keywords', 'swaps', 'prices', 'nutrition', 'support_places', 'food_info'].map((t) => tableCount(db, t));
    expect(after).toEqual(before);
    expect(before.every((n) => n > 0)).toBe(true);
  });
  it('re-opening a database re-applies the schema without error', () => {
    const db = openDatabase(':memory:');
    expect(() => db.exec('SELECT 1')).not.toThrow();
  });
});

describe('SqliteCatalogueRepository', () => {
  const db = seededMemoryDb();
  const repo = new SqliteCatalogueRepository(db);

  it('returns the 10 popular cravings in display order', async () => {
    const popular = await repo.popularCravings();
    expect(popular.map((c) => c.id)).toEqual(SEED_DATA.popularCravingIds);
    expect(popular[0]).toEqual(SEED_DATA.items.find((i) => i.id === 'burger'));
  });
  it('gives every craving at least two swaps, with full items and a note', async () => {
    for (const c of await repo.popularCravings()) {
      const swaps = await repo.swapsFor(c.id);
      expect(swaps.length).toBeGreaterThanOrEqual(2);
      for (const s of swaps) {
        expect(s.craving.id).toBe(c.id);
        expect(s.alternative.name).toBeTruthy();
        expect(s.note.length).toBeGreaterThan(0);
      }
    }
  });
  it('finds cravings by name or keyword, case-insensitively', async () => {
    expect((await repo.findCravings('  BIG MAC ')).map((c) => c.id)).toEqual(['burger']);
    expect((await repo.findCravings('chocolate')).map((c) => c.id)).toEqual(['chocolate', 'tim-tams']);
  });
  it('lists all cravings: the popular ten in order, then the rest in seed order', async () => {
    expect((await repo.allCravings()).map((c) => c.id)).toEqual(SEED_DATA.allCravingIds);
  });
  it('finds a new craving by keyword', async () => {
    expect((await repo.findCravings('butter chicken')).map((c) => c.id)).toContain('butter-chicken-jar-sauce');
  });
  it('stores FoodInfo as JSON per item and returns it intact', async () => {
    expect(await repo.foodInfo('smash-burger')).toEqual(SEED_DATA.foodInfo.find((f) => f.itemId === 'smash-burger'));
    expect(await repo.foodInfo('nope')).toBeUndefined();
    expect(await repo.allFoodInfo()).toEqual(SEED_DATA.foodInfo);
  });
  it('does not return alternatives as cravings', async () => {
    expect(await repo.findCravings('smash')).toEqual([]);
  });
  it('returns [] for blank or unmatched queries', async () => {
    expect(await repo.findCravings('  ')).toEqual([]);
    expect(await repo.findCravings('zzzz')).toEqual([]);
  });
  it('treats LIKE wildcards literally', async () => {
    expect(await repo.findCravings('%')).toEqual([]);
    expect(await repo.findCravings('_')).toEqual([]);
  });
  it('returns [] for an injection-style query and leaves the tables intact', async () => {
    expect(await repo.findCravings("'; DROP TABLE items;--")).toEqual([]);
    expect(await repo.findCravings("' OR '1'='1")).toEqual([]);
    expect(tableCount(db, 'items')).toBe(SEED_DATA.items.length);
    expect((await repo.popularCravings()).length).toBe(10);
  });
  it('returns [] for an unknown craving', async () => {
    expect(await repo.swapsFor('nope')).toEqual([]);
    expect(await repo.swapsFor("x' OR 1=1 --")).toEqual([]);
  });
});

describe('prices and nutrition', () => {
  const db = seededMemoryDb();
  const catalogue = new SqliteCatalogueRepository(db);
  const prices = new SqlitePriceRepository(db);
  const nutrition = new SqliteNutritionRepository(db);

  it('keeps the sodiumModelled flag for cultural recipes and omits it otherwise', async () => {
    expect(((await nutrition.getNutrition('dal-red-lentil')) as { sodiumModelled?: boolean } | null)?.sodiumModelled).toBe(false);
    expect(await nutrition.getNutrition('burger')).not.toHaveProperty('sodiumModelled');
  });
  it('adds the sodium_modelled column to an older nutrition table', () => {
    const old = new Database(':memory:');
    old.exec('CREATE TABLE nutrition (item_id TEXT PRIMARY KEY, energy_kj REAL NOT NULL, protein_g REAL NOT NULL, fibre_g REAL NOT NULL, sugar_g REAL NOT NULL, sodium_mg REAL NOT NULL)');
    applySchema(old);
    const cols = (old.prepare('PRAGMA table_info(nutrition)').all() as Array<{ name: string }>).map((c) => c.name);
    expect(cols).toContain('sodium_modelled');
  });
  it('every swap item has prices and nutrition', async () => {
    for (const c of await catalogue.popularCravings()) {
      expect((await prices.getPrices(c.id)).length).toBeGreaterThan(0);
      expect(await nutrition.getNutrition(c.id)).not.toBeNull();
      for (const s of await catalogue.swapsFor(c.id)) {
        expect((await prices.getPrices(s.alternative.id)).length).toBeGreaterThan(0);
        expect(await nutrition.getNutrition(s.alternative.id)).not.toBeNull();
      }
    }
  });
  it('matches the shared sample data exactly (isSample is a boolean)', async () => {
    const got = await prices.getPrices('burger');
    const want = SEED_DATA.prices.filter((p) => p.itemId === 'burger');
    expect(got).toHaveLength(want.length);
    expect(got).toEqual(expect.arrayContaining(want));
    expect(await nutrition.getNutrition('burger')).toEqual(SEED_DATA.nutrition.find((n) => n.itemId === 'burger'));
  });
  it('returns [] / null for unknown ids', async () => {
    expect(await prices.getPrices('nope')).toEqual([]);
    expect(await nutrition.getNutrition('nope')).toBeNull();
    expect(await prices.getPrices("'; DROP TABLE prices;--")).toEqual([]);
    expect(tableCount(db, 'prices')).toBe(SEED_DATA.prices.length);
  });
  it('prefers live prices over sample prices for the same store', async () => {
    await prices.upsertLivePrices([
      { itemId: 'burger', store: 'Coles', pricePerServe: 9.99, unitLabel: '1 burger', observedAt: '2026-10-20', isSample: false },
    ]);
    const got = await prices.getPrices('burger');
    const coles = got.filter((p) => p.store === 'Coles');
    expect(coles).toEqual([expect.objectContaining({ pricePerServe: 9.99, isSample: false })]);
    expect(got.filter((p) => p.store !== 'Coles').every((p) => p.isSample)).toBe(true);
  });
});

describe('SqliteSupportRepository', () => {
  const repo = new SqliteSupportRepository(seededMemoryDb());

  it('returns all places when no suburb is given, matching the shared data', async () => {
    expect(await repo.findSupport()).toEqual(SEED_DATA.supportPlaces);
  });
  it('lists places in the suburb first, case-insensitively', async () => {
    const got = await repo.findSupport(' clayton ');
    expect(got[0]!.suburb).toBe('Clayton');
    expect(got).toHaveLength(SEED_DATA.supportPlaces.length);
  });
  it('is safe against injection-style suburbs', async () => {
    const got = await repo.findSupport("'; DROP TABLE support_places;--");
    expect(got).toHaveLength(SEED_DATA.supportPlaces.length);
    expect(await repo.findSupport()).toHaveLength(SEED_DATA.supportPlaces.length);
  });
});
