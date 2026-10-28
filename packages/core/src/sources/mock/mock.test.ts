import { describe, expect, it } from 'vitest';
import type { ScoredNutrition } from '../../domain/swaps/health';
import { MockCatalogue } from './mockCatalogue';
import { MockFoodSupportSource } from './mockFoodSupportSource';
import { MockNutritionSource } from './mockNutritionSource';
import { MockPriceSource } from './mockPriceSource';

const catalogue = new MockCatalogue();
const prices = new MockPriceSource();
const nutrition = new MockNutritionSource();
const support = new MockFoodSupportSource();

describe('MockCatalogue', () => {
  it.each(['chocolate', 'milk chocolate', 'dark chocolate', 'chocolate bar'])('finds the chocolate bar for "%s"', async (q) => {
    const hits = await catalogue.findCravings(q);
    expect(hits[0]?.id).toBe('chocolate');
    expect(hits[0]?.name).toBe('Chocolate bar');
  });

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

describe('MockCatalogue cultural catalogue', () => {
  const EXISTING_POPULAR = ['burger', 'hot-chips', 'bubble-tea', 'instant-noodles', 'pizza', 'chocolate', 'fried-chicken', 'kebab', 'pastry', 'soft-drink'];

  it('finds the new butter chicken craving by search', () => {
    expect(catalogue.findCravings('butter chicken').map((c) => c.id)).toContain('butter-chicken-jar-sauce');
  });
  it('keeps popular cravings exactly the existing ten, in order', () => {
    expect(catalogue.popularCravings().map((c) => c.id)).toEqual(EXISTING_POPULAR);
  });
  it('allCravings lists the popular ten first, then the new cravings, each with a swap', () => {
    const all = catalogue.allCravings();
    expect(all.slice(0, 10).map((c) => c.id)).toEqual(EXISTING_POPULAR);
    expect(all.length).toBeGreaterThan(10);
    for (const c of all) expect(catalogue.swapsFor(c.id).length, c.id).toBeGreaterThan(0);
  });
  it('searches the ten popular cravings and the new ones, nothing else', () => {
    expect(catalogue.findCravings('smash').length).toBe(0);
    expect(catalogue.findCravings('burger').map((c) => c.id)).toContain('burger');
  });
  it('gives the smash burger beef yes and unknown ids no FoodInfo', () => {
    expect(catalogue.foodInfo('smash-burger')?.flags.beef).toBe('yes');
    expect(catalogue.foodInfo('nope')).toBeUndefined();
  });
  it('returns a copy of FoodInfo', () => {
    const a = catalogue.foodInfo('smash-burger')!;
    a.flags.beef = 'no';
    expect(catalogue.foodInfo('smash-burger')?.flags.beef).toBe('yes');
  });
  it('every existing alternative has a FoodInfo', () => {
    for (const c of catalogue.popularCravings()) {
      for (const s of catalogue.swapsFor(c.id)) expect(catalogue.foodInfo(s.alternative.id), s.alternative.id).toBeDefined();
    }
  });
  it('flags cultural home recipes as sodium not modelled and leaves other items alone', async () => {
    expect(((await nutrition.getNutrition('dal-red-lentil')) as ScoredNutrition | null)?.sodiumModelled).toBe(false);
    expect(((await nutrition.getNutrition('butter-chicken-jar-sauce')) as ScoredNutrition | null)?.sodiumModelled).toBeUndefined();
    expect(((await nutrition.getNutrition('smash-burger')) as ScoredNutrition | null)?.sodiumModelled).toBeUndefined();
  });
  it('every item in the catalogue has sample prices (0.20 to 15) and nutrition', async () => {
    const ids = new Set<string>();
    for (const c of catalogue.allCravings()) for (const s of catalogue.swapsFor(c.id)) [s.craving.id, s.alternative.id].forEach((i) => ids.add(i));
    for (const id of ids) {
      expect(await nutrition.getNutrition(id), id).not.toBeNull();
      const p = await prices.getPrices(id);
      expect(p.length, id).toBeGreaterThan(0);
      for (const x of p) {
        expect(x.isSample).toBe(true);
        expect(x.pricePerServe).toBeGreaterThanOrEqual(0.2);
        expect(x.pricePerServe).toBeLessThanOrEqual(15);
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
    expect(r[0].notes).toBe('Tuesdays from 1pm. Limited stock, registration needed.');
  });
  it('carries times and conditions in short notes, and never claims no proof is needed', async () => {
    const all = await support.findSupport();
    expect(all.map((p) => p.notes)).toEqual(expect.arrayContaining([
      'Open every day. Take what you need, leave what you can.',
      'Weekly shared meal, open to everyone. No registration.',
      'Weekdays, 10 to 3. Groceries and fresh produce when available.',
    ]));
    expect(all.every((p) => p.notes.length <= 90 && !/proof|prove/i.test(p.notes))).toBe(true);
  });
});
