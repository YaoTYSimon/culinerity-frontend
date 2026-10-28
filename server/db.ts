import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/** Apply the idempotent schema, then add columns that older databases lack. */
export function applySchema(db: Database.Database): void {
  db.exec(SCHEMA);
  const cols = (db.prepare('PRAGMA table_info(nutrition)').all() as Array<{ name: string }>).map((c) => c.name);
  if (!cols.includes('sodium_modelled')) db.exec('ALTER TABLE nutrition ADD COLUMN sodium_modelled INTEGER NOT NULL DEFAULT 1');
}

/** Open (creating if needed) a SQLite database and apply the idempotent schema. ':memory:' for tests. */
export function openDatabase(path: string = ':memory:'): Database.Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  if (path !== ':memory:') db.pragma('journal_mode = WAL');
  applySchema(db);
  return db;
}
