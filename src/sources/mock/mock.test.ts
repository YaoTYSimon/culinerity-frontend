import { describe, expect, it } from 'vitest';
import { MockCatalogue } from './mockCatalogue';
import { MockFoodSupportSource } from './mockFoodSupportSource';
import { MockNutritionSource } from './mockNutritionSource';
import { MockPriceSource } from './mockPriceSource';

const catalogue = new MockCatalogue();
const prices = new MockPriceSource();
const nutrition = new MockNutritionSource();
const support = new MockFoodSupportSource();

describe('MockCatalogue', () => {
  it('finds cravings by name or keyword, case-insensitively', () => {
    expect(catalogue.findCravings('burger').length).toBeGreaterThan(0);
    expect(catalogue.findCravings('BURGER').length).toBeGreaterThan(0);
  });
  it('returns [] for blank or unmatched text', () => {
    expect(catalogue.findCravings('  ')).toEqual([]);
    expect(catalogue.findCravings('zzzz')).toEqual([]);
  });
  it('offers at least 10 popular cravings, each with at least 2 swaps', () => {
    const popular = catalogue.popularCravings();
    expect(popular.length).toBeGreaterThanOrEqual(10);
    for (const c of popular) expect(catalogue.swapsFor(c.id).length).toBeGreaterThanOrEqual(2);
  });
  it('returns [] swaps for an unknown craving', () => {
    expect(catalogue.swapsFor('nope')).toEqual([]);
  });
  it('gives every swap item nutrition and a price', async () => {
    for (const c of catalogue.popularCravings()) {
      for (const s of catalogue.swapsFor(c.id)) {
        for (const id of [s.craving.id, s.alternative.id]) {
          expect(await nutrition.getNutrition(id)).not.toBeNull();
          expect((await prices.getPrices(id)).length).toBeGreaterThan(0);
        }
        expect(s.note.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('MockPriceSource', () => {
  it('marks every price as sample and has 2+ stores per item incl. Coles/Woolworths', async () => {
    for (const c of catalogue.popularCravings()) {
      for (const s of catalogue.swapsFor(c.id)) {
        for (const id of [s.craving.id, s.alternative.id]) {
          const ps = await prices.getPrices(id);
          expect(ps.every((p) => p.isSample === true)).toBe(true);
          expect(new Set(ps.map((p) => p.store)).size).toBeGreaterThanOrEqual(2);
          const stores = ps.map((p) => p.store);
          expect(stores.includes('Coles') || stores.includes('Woolworths')).toBe(true);
          expect(ps.every((p) => p.observedAt && p.pricePerServe > 0)).toBe(true);
        }
      }
    }
  });
  it('resolves [] for unknown items', async () => {
    await expect(prices.getPrices('unknown')).resolves.toEqual([]);
  });
});

describe('MockNutritionSource', () => {
  it('resolves null for unknown items', async () => {
    await expect(nutrition.getNutrition('unknown')).resolves.toBeNull();
  });
});

describe('MockFoodSupportSource', () => {
  it('has 3+ sample places', async () => {
    const all = await support.findSupport();
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all.every((p) => p.isSample === true)).toBe(true);
  });
  it('lists the Monash Caulfield pantry first for Caulfield', async () => {
    const r = await support.findSupport('Caulfield');
    expect(r[0].name).toMatch(/Monash/);
    expect(r[0].notes).toMatch(/registration/i);
  });
});
