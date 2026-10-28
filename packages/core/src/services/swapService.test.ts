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

describe('golden: people with no chosen tradition get exactly the pre-branch output', () => {
  // Recorded by running the code at 88d044a (before cultural food) for the ten popular cravings.
  const profiles = { none: {}, low: { score: 10 }, high: { score: 90, foodBudgetWeekly: 70 } };
  const svc = swapService(createCoreServices(new InMemoryProfileStore()));
  const cravings = createCoreServices(new InMemoryProfileStore()).catalogue.popularCravings();
  const originalIds = new Set(Object.values(golden as Record<string, { swaps: unknown[][] }>).flatMap((g) => g.swaps.map((x) => x[0])));

  it('pins all ten popular cravings to the pre-branch output', () => {
    expect(cravings).toHaveLength(10);
    expect(Object.keys(golden)).toHaveLength(30);
    expect(originalIds.has('greek-salad')).toBe(false);
  });

  for (const [name, profile] of Object.entries(profiles)) {
    it(`matches exactly (${name} profile): no foodProfile, an empty one, and rules or allergies with no tradition that exclude nothing`, async () => {
      for (const c of cravings) {
        const want = (golden as Record<string, unknown>)[`${c.id}:${name}`];
        const plain = await svc.getSwapsWithBaseline(c.id, profile);
        expect(compact(plain)).toEqual(want);
        expect(plain.swaps).toEqual(plain.profiled.map((p) => p.swap));
        expect(plain.hidden).toBe(0);
        expect(plain.unmatchedAllergies).toEqual([]);
        expect(plain.profiled.every((p) => p.fit === 'fits' && !p.kitchen && p.certifiedMeat === null)).toBe(true);
        expect(compact(await svc.getSwapsWithBaseline(c.id, { ...profile, foodProfile: emptyFood() }))).toEqual(want);
        // Allergy words that match no allergen and no tradition change nothing at all.
        const kiwi = await svc.getSwapsWithBaseline(c.id, { ...profile, foodProfile: emptyFood({ allergies: ['kiwi'] }) });
        expect(compact(kiwi)).toEqual(want);
        expect(kiwi.unmatchedAllergies).toEqual(['kiwi']);
      }
    });
    it(`rules and allergies with no tradition only ever remove or re-mark original items (${name})`, async () => {
      for (const c of cravings) {
        const want = (golden as Record<string, { swaps: unknown[][] }>)[`${c.id}:${name}`]!;
        const wantIds = want.swaps.map((x) => x[0]);
        for (const food of [emptyFood({ rules: ['halal', 'vegetarian', 'glutenFree'] }), emptyFood({ allergies: ['peanut', 'milk', 'egg'] })]) {
          const res = await svc.getSwapsWithBaseline(c.id, { ...profile, foodProfile: food });
          const ids = res.swaps.map((s) => s.candidate.alternative.id);
          expect(ids.every((id) => originalIds.has(id) && wantIds.includes(id)), `${c.id}`).toBe(true);
          expect(res.profiled.every((p) => !p.kitchen)).toBe(true);
          expect(ids.length + res.hidden).toBe(wantIds.length);
        }
      }
    });
  }
});

describe('cultural items need a chosen tradition', () => {
  const svc = swapService(createCoreServices(new InMemoryProfileStore()));
  const idsOf = async (food: FoodProfile | undefined, craving = 'burger') =>
    (await svc.getSwapsWithBaseline(craving, { foodProfile: food })).swaps.map((s) => s.candidate.alternative.id);

  it('Greek shows Greek items and the originals, and no other tradition', async () => {
    const ids = await idsOf(emptyFood({ traditions: ['greek'] }));
    expect(ids).toEqual(expect.arrayContaining(['smash-burger', 'chicken-salad-roll', 'greek-salad', 'gigantes-plaki']));
    for (const other of ['baked-kibbeh', 'tofu-banh-mi', 'karniyarik']) expect(ids).not.toContain(other);
    const info = createCoreServices(new InMemoryProfileStore()).catalogue;
    for (const id of ids) {
      const t = info.foodInfo(id)?.traditions ?? [];
      expect(t.length === 0 || t.includes('greek'), id).toBe(true);
    }
  });
  it('a person who chose Greek and Levantine sees both, but not Vietnamese', async () => {
    const ids = await idsOf(emptyFood({ traditions: ['greek', 'levantine'] }));
    expect(ids).toContain('greek-salad');
    expect(ids).toContain('baked-kibbeh');
    expect(ids).not.toContain('tofu-banh-mi');
  });
  it('own-text traditions never unlock a starter tradition', async () => {
    expect(await idsOf(emptyFood({ traditions: ['my nan\'s cooking', 'constructor'] }))).toEqual(await idsOf(undefined));
  });
  it('cultural-only cravings have no swaps without their tradition', async () => {
    expect((await svc.getSwapsWithBaseline('butter-chicken-jar-sauce', {})).swaps).toEqual([]);
    const withIt = await idsOf(emptyFood({ traditions: ['indian-north'] }), 'butter-chicken-jar-sauce');
    expect(withIt).toContain('chana-masala');
  });
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
    const res = await swapService(withPorkItem()).getSwapsWithBaseline('burger', { foodProfile: emptyFood({ rules: ['halal'], traditions: ['levantine'] }) });
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
    const res = await svc.getSwapsWithBaseline('burger', { foodProfile: emptyFood({ traditions: ['greek'] }) });
    expect(res.profiled.filter((p) => p.kitchen).map((p) => p.swap.candidate.alternative.id).sort()).toEqual(['gigantes-plaki', 'greek-salad']);
    const ids = res.swaps.map((s) => s.candidate.alternative.id);
    expect(ids).toEqual(expect.arrayContaining(['smash-burger', 'chicken-salad-roll']));
    expect(res.hidden).toBe(0);
    // The nudge never lifts an item by more than the boost: a kitchen item's blended value sits within it of its own.
    for (const p of res.profiled.filter((x) => x.kitchen)) expect(p.swap.value).not.toBeNull();
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
