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
  it('carries FoodInfo, all craving ids and consistent swaps', () => {
    expect(SEED_DATA.allCravingIds.slice(0, 10)).toEqual(SEED_DATA.popularCravingIds);
    expect(SEED_DATA.allCravingIds.length).toBeGreaterThan(10);
    const ids = new Set(SEED_DATA.items.map((i) => i.id));
    expect(SEED_DATA.foodInfo.length).toBeGreaterThanOrEqual(20);
    expect(SEED_DATA.foodInfo.every((f) => ids.has(f.itemId))).toBe(true);
    expect(SEED_DATA.swaps.every((s) => ids.has(s.cravingId) && ids.has(s.alternativeId))).toBe(true);
    expect(SEED_DATA.allCravingIds.every((id) => ids.has(id))).toBe(true);
    expect(SEED_DATA.foodInfo.find((f) => f.itemId === 'smash-burger')?.flags.beef).toBe('yes');
  });
});
