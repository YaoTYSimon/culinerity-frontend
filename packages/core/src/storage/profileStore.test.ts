import { describe, expect, it } from 'vitest';
import { InMemoryProfileStore } from './inMemoryProfileStore';
import { budgetPerServe, parseProfile, sanitizeProfile } from './profileStore';

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
