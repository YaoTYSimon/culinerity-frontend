import { describe, expect, it } from 'vitest';
import { SEED_DATA } from './seedData';

describe('SEED_DATA', () => {
  it('exposes the mock reference data for seeding a database', () => {
    expect(SEED_DATA.popularCravingIds).toHaveLength(10);
    expect(SEED_DATA.items.length).toBeGreaterThanOrEqual(29);
    expect(SEED_DATA.swaps.length).toBeGreaterThanOrEqual(20);
    expect(SEED_DATA.prices.every((p) => p.isSample)).toBe(true);
    expect(SEED_DATA.nutrition).toHaveLength(SEED_DATA.items.length);
    expect(SEED_DATA.supportPlaces.length).toBeGreaterThan(0);
  });
});
