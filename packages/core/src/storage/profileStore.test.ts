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
