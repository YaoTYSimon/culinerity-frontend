import { describe, expect, it } from 'vitest';
import { InMemoryProfileStore } from './inMemoryProfileStore';
import { budgetPerServe, parseProfile, sanitizeProfile } from './profileStore';

describe('sanitizeProfile spendEntries', () => {
  const good = { id: 'a', amount: 12.5, category: 'groceries', at: '2026-10-27T01:00:00.000Z' };
  it('keeps well-typed entries, with an optional short note', () => {
    const withNote = { ...good, id: 'b', note: 'milk' };
    expect(sanitizeProfile({ spendEntries: [good, withNote] }).spendEntries).toEqual([good, withNote]);
  });
  it('drops invalid entries without touching the others', () => {
    const bad = [
      { ...good, amount: '5' }, { ...good, amount: 0 }, { ...good, amount: -1 }, { ...good, amount: NaN },
      { ...good, amount: 10_001 }, { ...good, category: 'rent' }, { ...good, note: 'x'.repeat(41) },
      { ...good, at: 'nope' }, { ...good, id: '' }, null, 'x',
    ];
    expect(sanitizeProfile({ spendEntries: [...bad, good] }).spendEntries).toEqual([good]);
  });
  it('ignores a non-array spendEntries and strips unknown fields from entries', () => {
    expect(sanitizeProfile({ spendEntries: 'x' })).toEqual({});
    expect(sanitizeProfile({ spendEntries: [{ ...good, secret: 1 }] }).spendEntries).toEqual([good]);
  });
  it('keeps the newest 200 by date', () => {
    const many = Array.from({ length: 210 }, (_v, i) => ({ ...good, id: `e${i}`, at: new Date(Date.UTC(2026, 9, 1) + i * 60_000).toISOString() }));
    const out = sanitizeProfile({ spendEntries: many }).spendEntries!;
    expect(out).toHaveLength(200);
    expect(out[0].id).toBe('e10');
    expect(out[199].id).toBe('e209');
  });
  it('survives a JSON round trip through parseProfile', () => {
    expect(parseProfile(JSON.stringify({ spendEntries: [good] })).spendEntries).toEqual([good]);
  });
});

describe('sanitizeProfile / parseProfile', () => {
  it('returns {} for non-objects and arrays', () => {
    for (const v of [null, undefined, 5, 'x', [1, 2]]) expect(sanitizeProfile(v)).toEqual({});
  });
  it('drops wrong-typed and unknown fields', () => {
    expect(
      sanitizeProfile({ foodBudgetWeekly: '60', incomeWeekly: 500, score: null, suburb: 5, scoreTakenAt: '2026-10-01', extra: 1 }),
    ).toEqual({ incomeWeekly: 500, scoreTakenAt: '2026-10-01' });
  });
  it('keeps well-typed welcomeSeen, scoreHistory and weekSwaps', () => {
    const scoreHistory = [{ score: 40, at: '2026-10-01' }];
    const weekSwaps = [{ itemId: 'a', name: 'A', saving: 1.5, at: '2026-10-01T00:00:00Z' }];
    expect(sanitizeProfile({ welcomeSeen: true, scoreHistory, weekSwaps })).toEqual({ welcomeSeen: true, scoreHistory, weekSwaps });
  });
  it('drops a weekSwaps entry with a string saving, without clamping the others', () => {
    const good = { itemId: 'a', name: 'A', saving: 1, at: '2026-10-01' };
    const out = sanitizeProfile({ weekSwaps: [{ ...good, saving: '1' }, good, { ...good, saving: -2 }, { ...good, at: 'nope' }, null] });
    expect(out.weekSwaps).toEqual([good]);
  });
  it('drops invalid scoreHistory entries (out of range, bad date, wrong type)', () => {
    const good = { score: 50, at: '2026-10-01' };
    const out = sanitizeProfile({ scoreHistory: [good, { score: 101, at: good.at }, { score: NaN, at: good.at }, { score: 5, at: 'x' }, 'z'] });
    expect(out.scoreHistory).toEqual([good]);
  });
  it('ignores non-array history, non-boolean welcomeSeen, and caps 12 / 50 (newest kept)', () => {
    expect(sanitizeProfile({ scoreHistory: 'x', weekSwaps: {}, welcomeSeen: 'yes' })).toEqual({});
    const h = Array.from({ length: 15 }, (_, i) => ({ score: i, at: '2026-10-01' }));
    const w = Array.from({ length: 55 }, (_, i) => ({ itemId: `i${i}`, name: 'n', saving: 1, at: '2026-10-01' }));
    const out = sanitizeProfile({ scoreHistory: h, weekSwaps: w });
    expect(out.scoreHistory).toHaveLength(12);
    expect(out.scoreHistory![11].score).toBe(14);
    expect(out.weekSwaps).toHaveLength(50);
    expect(out.weekSwaps![49].itemId).toBe('i54');
  });
  it('parseProfile never throws', () => {
    expect(parseProfile(null)).toEqual({});
    expect(parseProfile('{nope')).toEqual({});
    expect(parseProfile('null')).toEqual({});
    expect(parseProfile('{"score":40}')).toEqual({ score: 40 });
  });
});

describe('InMemoryProfileStore', () => {
  it('saves, loads copies, records saves and clears', () => {
    const s = new InMemoryProfileStore({ score: 1 });
    expect(s.load()).toEqual({ score: 1 });
    s.save({ score: 2 });
    expect(s.load()).toEqual({ score: 2 });
    expect(s.saved).toEqual([{ score: 2 }]);
    s.clear();
    expect(s.load()).toEqual({});
  });
});

describe('budgetPerServe', () => {
  it('is weekly budget / 21', () => {
    expect(budgetPerServe({ foodBudgetWeekly: 42 })).toBe(2);
  });
  it.each([0, -5, undefined, NaN])('is null for %s', (v) => {
    expect(budgetPerServe({ foodBudgetWeekly: v })).toBeNull();
  });
});

describe('sanitizeProfile food fields', () => {
  const food = { traditions: ['greek'], rules: ['halal'], allergies: ['peanuts'], occasions: ['ramadan'], dismissed: ['ramadan-2027'] };
  const meal = { id: 'm1', at: '2026-10-27T01:00:00.000Z', tradition: 'greek' };
  it('keeps a valid foodProfile and valid culturalMeals', () => {
    const out = sanitizeProfile({ foodProfile: food, culturalMeals: [meal] });
    expect(out.foodProfile).toEqual(food);
    expect(out.culturalMeals).toEqual([meal]);
  });
  it('drops invalid foodProfile and culturalMeals without throwing', () => {
    for (const bad of ['x', [], null, 7, { traditions: 'x' }, {}]) {
      expect(sanitizeProfile({ foodProfile: bad }).foodProfile).toBeUndefined();
    }
    expect(sanitizeProfile({ culturalMeals: 'x' })).toEqual({});
    expect(sanitizeProfile({ culturalMeals: [{ id: '' }, null, 3] })).toEqual({});
  });
  it('a profile without the food fields round-trips unchanged (existing profiles need no migration)', () => {
    const old = { foodBudgetWeekly: 100, suburb: 'Footscray', welcomeSeen: true };
    expect(sanitizeProfile(old)).toEqual(old);
    expect(parseProfile(JSON.stringify(old))).toEqual(old);
  });
  it('survives a stored round trip', () => {
    const p = sanitizeProfile({ foodProfile: food, culturalMeals: [meal] });
    expect(parseProfile(JSON.stringify(p))).toEqual(p);
  });
});

describe('sanitizeProfile tradeoffs', () => {
  const t = { id: 't1', at: '2026-10-27T01:00:00.000Z', category: 'meal-skipped' };
  it('junk and empty arrays load as absent', () => {
    expect(sanitizeProfile({ tradeoffs: 'junk' })).toEqual({});
    expect(sanitizeProfile({ tradeoffs: [] })).toEqual({});
    expect(sanitizeProfile({ tradeoffs: [{ id: '' }, null, 3] })).toEqual({});
  });
  it('valid entries survive a save/load', () => {
    const p = sanitizeProfile({ tradeoffs: [t] });
    expect(p.tradeoffs).toEqual([t]);
    expect(parseProfile(JSON.stringify(p))).toEqual(p);
  });
});

describe('sanitizeProfile pantry and shoppingList', () => {
  const pantry = { items: [{ id: 'a', name: 'Rice', ingredientId: 'rice', grams: 500, addedAt: '2026-10-29T01:00:00.000Z' }], staples: ['canola-oil'], serves: 3 };
  const shoppingList = [{ id: 's1', name: 'Onion', recipeId: 'r1', addedAt: '2026-10-29T01:00:00.000Z' }];
  it('an old profile without the fields leaves them absent', () => {
    const p = sanitizeProfile({ score: 40, welcomeSeen: true });
    expect('pantry' in p).toBe(false);
    expect('shoppingList' in p).toBe(false);
  });
  it('junk loads as absent', () => {
    expect(sanitizeProfile({ pantry: 'x', shoppingList: 7 })).toEqual({});
    expect(sanitizeProfile({ pantry: { items: 'no' }, shoppingList: [] })).toEqual({});
  });
  it('valid fields survive a save/load', () => {
    const p = sanitizeProfile({ pantry, shoppingList });
    expect(p.pantry).toEqual(pantry);
    expect(p.shoppingList).toEqual(shoppingList);
    expect(parseProfile(JSON.stringify(p))).toEqual(p);
  });
});
