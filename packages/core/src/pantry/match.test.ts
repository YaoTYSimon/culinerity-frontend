import { describe, expect, it } from 'vitest';
import { costCents, matchRecipes, recipeCostPerServeCents, scaledGrams, suggestAdditions } from './match';
import { NOW, food, item, pantry, recipe } from './fixtures.testutil';
import type { Substitution } from '../recipes/types';

const prices = new Map<string, number>([['a', 10], ['b', 4], ['c', 7.3], ['d', 5]]);
const subs: Substitution[] = [{ from: 'a', to: 'a2', note: 'works too' }];
const run = (recipes: ReturnType<typeof recipe>[], p: ReturnType<typeof pantry>, extra: Partial<Parameters<typeof matchRecipes>[0]> = {}) =>
  matchRecipes({ recipes, pantry: p, now: NOW, prices, substitutions: subs, highRisk: new Set(), ...extra });

describe('scaledGrams', () => {
  it('scales, rounds, and is at least 1', () => {
    expect(scaledGrams(100, 4, 2)).toBe(200);
    expect(scaledGrams(5, 1, 3)).toBe(2);
    expect(scaledGrams(1, 1, 8)).toBe(1);
  });
});

describe('tiers', () => {
  const r = recipe('r', ['a', 'b']);
  it('everything present is now', () => {
    const { matches } = run([r], pantry([item('a'), item('b')]));
    expect(matches[0]).toMatchObject({ tier: 'now', have: 2, core: 2, missing: [], missingCostCents: 0 });
  });
  it('one missing is one with the rounded cost; null with no price', () => {
    // 100g of b at $4/kg = 40c -> 40c; scaled by serves 2/2
    expect(run([r], pantry([item('a')])).matches[0]).toMatchObject({ tier: 'one', missingCostCents: 40 });
    const c = recipe('c', [{ ingredient: 'c', grams: 100 }, 'a']);
    // 100g * 7.3/kg = 73c -> 80c
    expect(run([c], pantry([item('a')])).matches[0].missingCostCents).toBe(80);
    const noPrice = recipe('n', ['a', 'zz']);
    expect(run([noPrice], pantry([item('a')])).matches[0].missingCostCents).toBeNull();
    expect(run([noPrice], pantry([item('a')])).matches[0].missing[0].costCents).toBeNull();
  });
  it('2-3 missing is few; 4 is dropped', () => {
    const four = recipe('f', ['a', 'b', 'c', 'd']);
    expect(run([four], pantry([item('a')])).matches[0].tier).toBe('few');
    expect(run([four], pantry([])).matches).toEqual([]);
  });
  it('staple counts as present; water, salt and pepper never missing', () => {
    const w = recipe('w', ['a', 'water', 'salt', 'pepper']);
    const res = run([w], pantry([], { staples: ['a'] })).matches[0];
    expect(res.tier).toBe('now');
    expect(res.core).toBe(1);
  });
  it('a listed substitution counts and is recorded', () => {
    const m = run([recipe('s', ['a'])], pantry([item('a2')])).matches[0];
    expect(m).toMatchObject({ tier: 'now', subs: [{ from: 'a', to: 'a2', note: 'works too' }] });
  });
  it('a substitute past its use-by does not count', () => {
    const m = run([recipe('s', ['a', 'b'])], pantry([item('a2', { dateKind: 'use-by', date: '2026-10-28' }), item('b')])).matches[0];
    expect(m).toMatchObject({ tier: 'one', subs: [] });
    expect(m.missing[0]).toMatchObject({ ingredient: 'a', reason: 'absent' });
  });
  it('entered grams below the scaled need is not-enough; serves scale the need', () => {
    const r2 = recipe('g', [{ ingredient: 'a', grams: 100 }]);
    expect(run([r2], pantry([item('a', { grams: 150 })], { serves: 2 })).matches[0].tier).toBe('now');
    const m = run([r2], pantry([item('a', { grams: 150 })], { serves: 4 })).matches[0];
    expect(m.tier).toBe('one');
    expect(m.missing[0]).toMatchObject({ ingredient: 'a', reason: 'not-enough', grams: 50 });
  });
  it('blank grams means enough', () => {
    expect(run([recipe('g', [{ ingredient: 'a', grams: 900 }])], pantry([item('a')])).matches[0].tier).toBe('now');
  });
  it('an absent optional ingredient keeps now and is not core', () => {
    const o = recipe('o', ['a', { ingredient: 'b', grams: 10, optional: true }]);
    expect(run([o], pantry([item('a')])).matches[0]).toMatchObject({ tier: 'now', core: 1, have: 1 });
  });
  it('a free-text item never covers an ingredient', () => {
    const m = run([recipe('t', ['a'])], pantry([{ id: 'x', name: 'a', addedAt: '2026-10-01T00:00:00.000Z' }])).matches[0];
    expect(m.tier).toBe('one');
  });
  it('cooked items are never inputs', () => {
    const m = run([recipe('t', ['a'])], pantry([item('a', { dateKind: 'cooked', date: '2026-10-29' })])).matches[0];
    expect(m.tier).toBe('one');
  });
});

describe('dates', () => {
  const r = recipe('r', ['a', 'b']);
  it('use-by yesterday is set aside and the recipe needs one more thing', () => {
    const old = item('a', { dateKind: 'use-by', date: '2026-10-28' });
    const out = run([r], pantry([old, item('b')]));
    expect(out.setAside).toEqual([old]);
    expect(out.matches[0]).toMatchObject({ tier: 'one' });
    expect(out.matches[0].missing[0]).toMatchObject({ ingredient: 'a', reason: 'past-date' });
  });
  it('use-by today is usable and counts as use soon', () => {
    const t = item('a', { dateKind: 'use-by', date: '2026-10-29' });
    const out = run([r], pantry([t, item('b')]));
    expect(out.setAside).toEqual([]);
    expect(out.matches[0]).toMatchObject({ tier: 'now', usesSoon: [t.id] });
  });
  it('use-by in 4 days is not use soon', () => {
    expect(run([r], pantry([item('a', { dateKind: 'use-by', date: '2026-11-02' }), item('b')])).matches[0].usesSoon).toEqual([]);
  });
  it('high-risk past best-before is excluded; others are kept with checkDates', () => {
    const hr = item('a', { dateKind: 'best-before', date: '2026-10-20' });
    const o1 = run([r], pantry([hr, item('b')]), { highRisk: new Set(['a']) });
    expect(o1.setAside).toEqual([hr]);
    expect(o1.matches[0].tier).toBe('one');
    const o2 = run([r], pantry([hr, item('b')]));
    expect(o2.matches[0]).toMatchObject({ tier: 'now', checkDates: [hr.id] });
    expect(o2.setAside).toEqual([]);
  });
  it('an unused expired item still shows in setAside', () => {
    const z = item('zz', { dateKind: 'use-by', date: '2026-10-01' });
    expect(run([], pantry([z])).setAside).toEqual([z]);
  });
  it('a cooked item past the guide is not in setAside (leftovers are reminders)', () => {
    expect(run([], pantry([item('a', { dateKind: 'cooked', date: '2026-10-20' })])).setAside).toEqual([]);
  });
});

describe('profile', () => {
  it('one unknown flag with a rule on gives check', () => {
    const r = recipe('r', ['a'], {}, { vegetarian: 'unknown' });
    const m = run([r], pantry([item('a')]), { food: food({ rules: ['vegetarian'] }) });
    expect(m.matches[0].fit).toBe('check');
    expect(m.hidden).toBe(0);
  });
  it('out is hidden and counted even when the pantry covers it', () => {
    const r = recipe('r', ['a'], {}, { vegetarian: 'no' });
    const m = run([r, recipe('ok', ['a'])], pantry([item('a')]), { food: food({ rules: ['vegetarian'] }) });
    expect(m.matches.map((x) => x.recipeId)).toEqual(['ok']);
    expect(m.hidden).toBe(1);
  });
  it('an allergen that is listed hides the recipe', () => {
    const r = recipe('r', ['a'], {}, { allergens: ['egg'] });
    expect(run([r], pantry([item('a')]), { food: food({ allergies: ['egg'] }) }).hidden).toBe(1);
  });
  it('kitchen follows a chosen tradition, ignoring case; certified meat note', () => {
    const r = recipe('r', ['a'], { traditions: ['Greek'] }, { certifiedMeat: true });
    const m = run([r], pantry([item('a')]), { food: food({ traditions: ['greek'], rules: ['halal'] }) }).matches[0];
    expect(m).toMatchObject({ kitchen: true, certifiedMeat: 'halal' });
    expect(run([r], pantry([item('a')])).matches[0]).toMatchObject({ kitchen: false, certifiedMeat: null });
  });
});

describe('ordering', () => {
  const ids = (m: ReturnType<typeof run>) => m.matches.map((x) => x.recipeId);
  it('tier first', () => {
    expect(ids(run([recipe('one', ['a', 'b']), recipe('now', ['a'])], pantry([item('a')])))).toEqual(['now', 'one']);
  });
  it('fits before check', () => {
    const chk = recipe('chk', ['a'], {}, { vegetarian: 'unknown' });
    expect(ids(run([chk, recipe('zfits', ['a'])], pantry([item('a')]), { food: food({ rules: ['vegetarian'] }) }))).toEqual(['zfits', 'chk']);
  });
  it('more use-soon, then kitchen, then coverage, then cost, then name', () => {
    const soon = item('a', { dateKind: 'use-by', date: '2026-10-30' });
    const p = pantry([soon, item('b')]);
    expect(ids(run([recipe('plain', ['b']), recipe('soon', ['a'])], p))).toEqual(['soon', 'plain']);
    const k = recipe('k', ['b'], { traditions: ['greek'] });
    expect(ids(run([recipe('a-plain', ['b']), k], p, { food: food({ traditions: ['Greek'] }) }))).toEqual(['k', 'a-plain']);
    // coverage: 2 of 3 beats 1 of 2 within the same tier (few vs one differ, so use equal missing)
    const cov1 = recipe('cov1', ['b', 'c']); // have 1/2, missing c
    const cov2 = recipe('cov2', ['b', 'a', 'c']); // have 2/3, missing c
    expect(ids(run([cov1, cov2], pantry([item('a'), item('b')])))).toEqual(['cov2', 'cov1']);
    // cost: both 1 missing, same coverage; cheaper first, null last
    const cheap = recipe('z-cheap', ['b', 'd']);
    const dear = recipe('dear', ['b', 'a']);
    expect(ids(run([dear, cheap], pantry([item('b')])))).toEqual(['z-cheap', 'dear']);
    const none = recipe('aa-none', ['b', 'unpriced']);
    expect(ids(run([none, cheap], pantry([item('b')])))).toEqual(['z-cheap', 'aa-none']);
    // name, and ties keep nothing else
    expect(ids(run([recipe('y', ['b']), recipe('x', ['b'])], pantry([item('b')])))).toEqual(['x', 'y']);
  });
});

describe('edges', () => {
  it('empty inputs return empty', () => {
    expect(run([], pantry([]))).toEqual({ matches: [], hidden: 0, setAside: [] });
    expect(run([recipe('r', ['a'])], pantry([])).matches[0].tier).toBe('one');
    expect(run([recipe('r', ['a', 'b', 'c', 'd'])], pantry([])).matches).toEqual([]);
  });
});

describe('suggestAdditions', () => {
  it('returns the single missing ingredient that unlocks the most recipes', () => {
    const p = pantry([item('a'), item('b')]);
    const { matches } = run([recipe('1', ['a', 'c']), recipe('2', ['b', 'c']), recipe('3', ['a', 'd']), recipe('4', ['a', 'b', 'c', 'd', 'e'])], p);
    expect(suggestAdditions(matches)).toEqual(['c', 'd']);
    expect(suggestAdditions(matches, 1)).toEqual(['c']);
    expect(suggestAdditions([])).toEqual([]);
  });
});

describe('costs', () => {
  it('costCents rounds the total up to 10c and is null when any item is unpriced', () => {
    const m = (costCents_: number | null) => ({ ingredient: 'x', grams: 1, reason: 'absent' as const, costCents: costCents_ });
    expect(costCents([m(33), m(41)])).toBe(80);
    expect(costCents([m(40), m(40)])).toBe(80);
    expect(costCents([m(33), m(null)])).toBeNull();
    expect(costCents([])).toBe(0);
  });
  it('recipeCostPerServeCents uses all counted ingredients', () => {
    // a 100g*10/kg = 100c, b 100g*4/kg = 40c; 140c / 2 serves = 70c
    expect(recipeCostPerServeCents(recipe('r', ['a', 'b']), prices)).toBe(70);
    expect(recipeCostPerServeCents(recipe('r', ['a', 'nope']), prices)).toBeNull();
  });
});
