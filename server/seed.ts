import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { SEED_DATA, type SeedData } from '@culinerity/core';
import { DEFAULT_DB_PATH } from './config';
import { openDatabase } from './db';

/**
 * Load reference data into the database. Idempotent: sample rows are upserted
 * (never duplicated) and live price rows are left untouched.
 */
export function seedDatabase(db: Database.Database, data: SeedData = SEED_DATA): void {
  const run = db.transaction(() => {
    const upsertItem = db.prepare(
      `INSERT INTO items (id, name, category) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, category = excluded.category`,
    );
    const addKeyword = db.prepare('INSERT OR IGNORE INTO keywords (item_id, keyword) VALUES (?, ?)');
    const upsertSwap = db.prepare(
      `INSERT INTO swaps (craving_id, alternative_id, note) VALUES (?, ?, ?)
       ON CONFLICT(craving_id, alternative_id) DO UPDATE SET note = excluded.note`,
    );
    const upsertPrice = db.prepare(
      `INSERT INTO prices (item_id, store, price_per_serve, unit_label, observed_at, is_sample)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_id, store, is_sample) DO UPDATE SET
         price_per_serve = excluded.price_per_serve, unit_label = excluded.unit_label,
         observed_at = excluded.observed_at`,
    );
    const upsertNutrition = db.prepare(
      `INSERT INTO nutrition (item_id, energy_kj, protein_g, fibre_g, sugar_g, sodium_mg, sodium_modelled)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET energy_kj = excluded.energy_kj, protein_g = excluded.protein_g,
         fibre_g = excluded.fibre_g, sugar_g = excluded.sugar_g, sodium_mg = excluded.sodium_mg,
         sodium_modelled = excluded.sodium_modelled`,
    );
    const upsertInfo = db.prepare(
      `INSERT INTO food_info (item_id, info) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET info = excluded.info`,
    );
    const upsertPlace = db.prepare(
      `INSERT INTO support_places (id, name, kind, suburb, notes, is_sample) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind, suburb = excluded.suburb,
         notes = excluded.notes, is_sample = excluded.is_sample`,
    );

    for (const i of data.items) {
      upsertItem.run(i.id, i.name, i.category);
      for (const k of i.keywords) addKeyword.run(i.id, k);
    }
    for (const s of data.swaps) upsertSwap.run(s.cravingId, s.alternativeId, s.note);

    db.prepare('UPDATE items SET popular_rank = NULL').run();
    const setRank = db.prepare('UPDATE items SET popular_rank = ? WHERE id = ?');
    data.popularCravingIds.forEach((id, index) => setRank.run(index + 1, id));

    for (const p of data.prices) upsertPrice.run(p.itemId, p.store, p.pricePerServe, p.unitLabel, p.observedAt, p.isSample ? 1 : 0);
    for (const n of data.nutrition) upsertNutrition.run(n.itemId, n.energyKj, n.proteinG, n.fibreG, n.sugarG, n.sodiumMg, n.sodiumModelled === false ? 0 : 1);
    for (const f of data.foodInfo) upsertInfo.run(f.itemId, JSON.stringify(f));
    for (const p of data.supportPlaces) upsertPlace.run(p.id, p.name, p.kind, p.suburb, p.notes, p.isSample ? 1 : 0);
  });
  run();
}

// `npm run seed`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const path = process.env.DB_PATH ?? DEFAULT_DB_PATH;
  const db = openDatabase(path);
  seedDatabase(db);
  const count = (db.prepare('SELECT COUNT(*) AS n FROM items').get() as { n: number }).n;
  console.log(`Seeded ${count} items into ${path}`);
  db.close();
}
