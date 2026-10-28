import { describe, expect, it } from 'vitest';
import type { PriceSource } from '../sources/interfaces';
import { createCoreServices, type Services } from './container';
import { InMemoryProfileStore } from '../storage/inMemoryProfileStore';
import { swapService } from './swapService';
import type { FoodInfo, FoodProfile } from '../food/types';
import golden from './swapService.golden.json';

const CRAVING = 'chocolate';

describe('swapService.getSwaps', () => {
  it('orders cheapest-first for a low score', async () => {
    const swaps = await swapService(createCoreServices(new InMemoryProfileStore())).getSwaps(CRAVING, { score: 10 });
    expect(swaps.length).toBeGreaterThan(0);
    const costs = swaps.map((s) => s.cost as number);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
  });

  it('orders healthiest-first for a high score', async () => {
    const swaps = await swapService(createCoreServices(new InMemoryProfileStore())).getSwaps(CRAVING, { score: 90 });
    expect(swaps.length).toBeGreaterThan(0);
    const health = swaps.map((s) => s.health);
    expect(health).toEqual([...health].sort((a, b) => b - a));
  });

  it('resolves to [] for an unknown craving', async () => {
    expect(await swapService(createCoreServices(new InMemoryProfileStore())).getSwaps('nope', { score: 50 })).toEqual([]);
  });

  it('gives cost null and does not throw when the price source rejects', async () => {
    const failing: PriceSource = { getPrices: () => Promise.reject(new Error('down')) };
    const s: Services = { ...createCoreServices(new InMemoryProfileStore()), prices: failing };
    const swaps = await swapService(s).getSwaps(CRAVING, { score: 50 });
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.every((x) => x.cost === null)).toBe(true);
  });
});

describe('swapService.getSwapsWithBaseline', () => {
  it('returns the same swaps as getSwaps plus the craving cost and health', async () => {
    const svc = swapService(createCoreServices(new InMemoryProfileStore()));
    const res = await svc.getSwapsWithBaseline(CRAVING, { score: 50 });
    expect(res.swaps).toEqual(await svc.getSwaps(CRAVING, { score: 50 }));
    expect(res.cravingCost).toBeGreaterThan(0);
    expect(res.cravingHealth).toEqual(expect.any(Number));
  });

  it('gives null baselines for an unknown craving or failing sources', async () => {
    const svc = swapService(createCoreServices(new InMemoryProfileStore()));
    expect(await svc.getSwapsWithBaseline('nope', {})).toEqual({
      swaps: [], cravingCost: null, cravingHealth: null, profiled: [], hidden: 0, unmatchedAllergies: [],
    });
    const s: Services = {
      ...createCoreServices(new InMemoryProfileStore()),
      prices: { getPrices: () => Promise.reject(new Error('down')) },
      nutrition: { getNutrition: () => Promise.reject(new Error('down')) },
    };
    const res = await swapService(s).getSwapsWithBaseline(CRAVING, {});
    expect(res.cravingCost).toBeNull();
    expect(res.cravingHealth).toBeNull();
  });
});

const emptyFood = (over: Partial<FoodProfile> = {}): FoodProfile => ({ traditions: [], rules: [], allergies: [], occasions: [], dismissed: [], ...over });
const PORK = 'smash-burger';

/** The mock services with one item re-flagged, to stand in for a pork dish the sample data does not hold. */
function withPorkItem(): Services {
  const base = createCoreServices(new InMemoryProfileStore());
  const catalogue = Object.create(base.catalogue) as Services['catalogue'];
  catalogue.foodInfo = (id: string): FoodInfo | undefined => {
    const info = base.catalogue.foodInfo(id);
    return id === PORK && info ? { ...info, flags: { ...info.flags, halal: 'no', pork: 'yes' } } : info;
  };
  return { ...base, catalogue };
}

const compact = (r: Awaited<ReturnType<ReturnType<typeof swapService>['getSwapsWithBaseline']>>) => ({
  cravingCost: r.cravingCost,
  cravingHealth: r.cravingHealth,
  swaps: r.swaps.map((w) => [w.candidate.alternative.id, w.cost, w.health, w.value, w.withinBudget, w.price?.store ?? null, w.price?.observedAt ?? null]),
});

describe('golden: no food profile means today\'s output', () => {
  const profiles = { none: {}, low: { score: 10 }, high: { score: 90, foodBudgetWeekly: 70 } };
  const svc = swapService(createCoreServices(new InMemoryProfileStore()));
  const cravings = createCoreServices(new InMemoryProfileStore()).catalogue.popularCravings();

  it('pins all ten popular cravings to the recorded base output', () => {
    expect(cravings).toHaveLength(10);
    expect(Object.keys(golden)).toHaveLength(30);
  });

  for (const [name, profile] of Object.entries(profiles)) {
    it(`matches the recorded output (${name} profile), with and without an empty food profile`, async () => {
      for (const c of cravings) {
        const want = (golden as Record<string, unknown>)[`${c.id}:${name}`];
        const plain = await svc.getSwapsWithBaseline(c.id, profile);
        expect(compact(plain)).toEqual(want);
        expect(plain.swaps).toEqual(plain.profiled.map((p) => p.swap));
        expect(plain.hidden).toBe(0);
        expect(plain.unmatchedAllergies).toEqual([]);
        expect(plain.profiled.every((p) => p.fit === 'fits' && !p.kitchen && p.certifiedMeat === null)).toBe(true);
        expect(compact(await svc.getSwapsWithBaseline(c.id, { ...profile, foodProfile: emptyFood() }))).toEqual(want);
      }
    });
  }
});

describe('swapService with a food profile', () => {
  const halal = { foodProfile: emptyFood({ rules: ['halal'] }) };

  it('never shows the pork item under a halal rule, for any craving, and counts it hidden', async () => {
    const svc = swapService(withPorkItem());
    let hiddenTotal = 0;
    for (const c of createCoreServices(new InMemoryProfileStore()).catalogue.allCravings()) {
      const plain = await svc.getSwapsWithBaseline(c.id, {});
      const res = await svc.getSwapsWithBaseline(c.id, halal);
      expect(res.swaps.map((s) => s.candidate.alternative.id)).not.toContain(PORK);
      expect(res.swaps.length + res.hidden).toBe(plain.swaps.length);
      hiddenTotal += res.hidden;
    }
    expect(hiddenTotal).toBeGreaterThan(0);
  });

  it('lists fits before check, and an unknown-halal item last as check', async () => {
    const res = await swapService(withPorkItem()).getSwapsWithBaseline('burger', halal);
    const fits = res.profiled.map((p) => p.fit);
    expect(fits).toContain('fits');
    expect(fits).toContain('check');
    expect(fits.lastIndexOf('fits')).toBeLessThan(fits.indexOf('check'));
    const last = res.profiled[res.profiled.length - 1]!;
    expect(last.fit).toBe('check');
    expect(res.profiled.find((p) => p.swap.candidate.alternative.id === 'baked-kibbeh')).toMatchObject({ fit: 'fits', certifiedMeat: 'halal' });
  });

  it('marks and nudges a Greek tradition item by at most the boost', async () => {
    const svc = swapService(createCoreServices(new InMemoryProfileStore()));
    const plain = await svc.getSwapsWithBaseline('burger', {});
    const res = await svc.getSwapsWithBaseline('burger', { foodProfile: emptyFood({ traditions: ['greek'] }) });
    expect(res.profiled.filter((p) => p.kitchen).map((p) => p.swap.candidate.alternative.id).sort()).toEqual(['gigantes-plaki', 'greek-salad']);
    const rank = (r: typeof plain, id: string) => r.swaps.findIndex((s) => s.candidate.alternative.id === id);
    expect(rank(res, 'greek-salad')).toBeLessThanOrEqual(rank(plain, 'greek-salad'));
    expect(res.swaps).toHaveLength(plain.swaps.length);
    expect(res.hidden).toBe(0);
  });

  it('returns unmatched allergy words and marks every item check', async () => {
    const res = await swapService(createCoreServices(new InMemoryProfileStore())).getSwapsWithBaseline('burger', {
      foodProfile: emptyFood({ allergies: ['kiwi fruit'] }),
    });
    expect(res.unmatchedAllergies).toEqual(['kiwi fruit']);
    expect(res.profiled.length).toBeGreaterThan(0);
    expect(res.profiled.every((p) => p.fit === 'check')).toBe(true);
  });

  it('hides everything when every swap breaks the rules', async () => {
    const base = createCoreServices(new InMemoryProfileStore());
    const catalogue = Object.create(base.catalogue) as Services['catalogue'];
    catalogue.foodInfo = (id) => {
      const i = base.catalogue.foodInfo(id);
      return i ? { ...i, flags: { ...i.flags, vegan: 'no' } } : i;
    };
    const plain = await swapService(base).getSwapsWithBaseline('chocolate', {});
    const res = await swapService({ ...base, catalogue }).getSwapsWithBaseline('chocolate', { foodProfile: emptyFood({ rules: ['vegan'] }) });
    expect(res.swaps).toEqual([]);
    expect(res.hidden).toBe(plain.swaps.length);
  });
});
