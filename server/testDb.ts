import type Database from 'better-sqlite3';
import { openDatabase } from './db';
import { seedDatabase } from './seed';

/** A fresh in-memory database seeded from core's sample data (tests only). */
export function seededMemoryDb(): Database.Database {
  const db = openDatabase(':memory:');
  seedDatabase(db);
  return db;
}
