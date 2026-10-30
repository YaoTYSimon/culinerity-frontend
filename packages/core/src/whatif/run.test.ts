import { describe, expect, it } from 'vitest';
import { LIMITS } from './scenario';
import { runWhatIf } from './run';
import type { Baseline, Scenario, Step, WhatIfResult } from './types';

const NOW = new Date(2026, 9, 28, 12);
const BASE: Baseline = { incomeWeekly: 90000, housingWeekly: 45000, otherFixedWeekly: 15000, foodBudgetWeekly: 12000 };
const ok = (r: WhatIfResult) => {
  if (r.status !== 'ok') throw new Error(`expected ok, got ${JSON.stringify(r)}`);
  return r;
};
const run = (s: Scenario, b: Baseline = BASE) => ok(runWhatIf(b, s, NOW));

const rentUp: Step = { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 1000 } };
const shift = (o: Partial<Extract<Step, { kind: 'lose-work' }>> = {}): Step => ({ kind: 'lose-work', unit: 'shifts', count: 1, payPerUnit: 12000, everyWeeks: 1, ...o });

describe('before', () => {
  it('computes one baseline week', () => {
    const r = run(rentUp);
    expect(r.before).toMatchObject({ income: 90000, housing: 45000, otherFixed: 15000, oneOff: 0, food: 12000, leftAfterCosts: 30000, leftAfterFood: 18000, foodDays: 7 });
    expect(r.before4.leftAfterCosts).toBe(120000);
  });
});

describe('steps', () => {
  it('rent up 10%', () => {
    const r = run(rentUp);
    expect(r.weeks[0]).toMatchObject({ housing: 49500, leftAfterCosts: 25500, leftAfterFood: 13500 });
    expect(r.change4.leftAfterCosts).toBe(-18000);
    expect(r.firstAffectedWeek).toBe(1);
    expect(r.clamped).toEqual([]);
  });
  it('rent in dollars per month', () => {
    const r = run({ kind: 'rent-change', direction: 'down', by: { mode: 'dollars', amount: { cents: 100000, per: 'month' } } });
    expect(r.weeks[0].housing).toBe(45000 - 23077);
  });
  it('lose one shift every week', () => {
    const r = run(shift());
    expect(r.weeks[0]).toMatchObject({ income: 78000, leftAfterCosts: 18000 });
  });
  it('lose 3 shifts leaves a shortfall and no food days', () => {
    const r = run(shift({ count: 3 }));
    expect(r.weeks[0]).toMatchObject({ leftAfterCosts: -6000, foodDays: 0, leftAfterFood: -18000 });
  });
  it('every second week', () => {
    const r = run(shift({ everyWeeks: 2 }));
    expect(r.weeks.map((w) => w.income)).toEqual([78000, 90000, 78000, 90000]);
  });
  it('every fourth week', () => {
    expect(run(shift({ everyWeeks: 4 })).weeks.map((w) => w.income)).toEqual([78000, 90000, 90000, 90000]);
  });
  it('half a shift rounds half up to a cent', () => {
    expect(run(shift({ count: 0.5, payPerUnit: 12001 })).weeks[0].income).toBe(90000 - 6001);
    expect(run(shift({ unit: 'hours', count: 7.5, payPerUnit: 2644 })).weeks[0].income).toBe(90000 - 19830);
  });
  it('one-off bill changes only its week', () => {
    const r = run({ kind: 'one-off-bill', cents: 20000, week: 3 });
    expect(r.weeks.map((w) => w.oneOff)).toEqual([0, 0, 20000, 0]);
    expect(r.weeks.map((w) => w.leftAfterCosts)).toEqual([30000, 30000, 10000, 30000]);
    expect(r.firstAffectedWeek).toBe(3);
    expect(r.change4.oneOff).toBe(20000);
  });
  it('pay change and payment change', () => {
    expect(run({ kind: 'pay-change', direction: 'down', bp: 1000 }).weeks[0].income).toBe(81000);
    expect(run({ kind: 'payment-change', direction: 'up', amount: { cents: 45000, per: 'fortnight' } }).weeks[0].income).toBe(112500);
  });
  it('food price up 10%', () => {
    const r = run({ kind: 'food-price-change', direction: 'up', bp: 1000 });
    expect(r.weeks[0]).toMatchObject({ food: 13200, leftAfterFood: 16800 });
  });
  it('food days cover part of the week', () => {
    expect(run(rentUp, { ...BASE, incomeWeekly: 70000 }).before.foodDays).toBe(5);
  });
});

describe('combined', () => {
  it('rent +10% and one lost shift', () => {
    expect(run({ kind: 'combined', steps: [rentUp, shift()] }).weeks[0].leftAfterCosts).toBe(13500);
  });
  it('is permutation invariant, including percentages on the baseline', () => {
    const steps: Step[] = [rentUp, shift(), { kind: 'pay-change', direction: 'down', bp: 1000 }, { kind: 'one-off-bill', cents: 5000, week: 2 }];
    const a = run({ kind: 'combined', steps });
    const b = run({ kind: 'combined', steps: [...steps].reverse() });
    const c = run({ kind: 'combined', steps: [steps[2], steps[0], steps[3], steps[1]] });
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    expect(a.weeks[0].income).toBe(90000 - 12000 - 9000);
  });
});

describe('clamping', () => {
  it('income never below zero', () => {
    const r = run(shift(), { ...BASE, incomeWeekly: 5000 });
    expect(r.weeks[0].income).toBe(0);
    expect(r.clamped).toContain('income');
  });
  it('a rent cut in dollars with no rent entered does not flag the rent as below zero', () => {
    const r = run({ kind: 'rent-change', direction: 'down', by: { mode: 'dollars', amount: { cents: 20000, per: 'week' } } }, { incomeWeekly: 90000 });
    expect(r.clamped).not.toContain('housing');
  });
  it('housing and food never below zero', () => {
    const r = run({ kind: 'combined', steps: [{ kind: 'rent-change', direction: 'down', by: { mode: 'dollars', amount: { cents: 60000, per: 'week' } } }, { kind: 'food-price-change', direction: 'down', bp: 10000 }] });
    expect(r.weeks[0].housing).toBe(0);
    expect(r.weeks[0].food).toBe(0);
    expect(r.weeks[0].foodDays).toBeNull();
    expect(r.clamped).toEqual(expect.arrayContaining(['housing']));
  });
});

describe('needs and invalid', () => {
  it('percent rent with no rent needs housingWeekly', () => {
    expect(runWhatIf({ incomeWeekly: 90000 }, rentUp, NOW)).toEqual({ status: 'needs', missing: ['housingWeekly'] });
  });
  it('pay change needs income, food change needs food budget', () => {
    expect(runWhatIf({}, { kind: 'pay-change', direction: 'up', bp: 100 }, NOW)).toEqual({ status: 'needs', missing: ['incomeWeekly'] });
    expect(runWhatIf({ incomeWeekly: 1 }, { kind: 'food-price-change', direction: 'up', bp: 100 }, NOW)).toEqual({ status: 'needs', missing: ['foodBudgetWeekly'] });
  });
  it('combined lists every missing field once', () => {
    const r = runWhatIf({}, { kind: 'combined', steps: [rentUp, { kind: 'pay-change', direction: 'up', bp: 100 }, { kind: 'food-price-change', direction: 'up', bp: 100 }] }, NOW);
    expect(r).toEqual({ status: 'needs', missing: ['incomeWeekly', 'housingWeekly', 'foodBudgetWeekly'] });
  });
  it('invalid scenario or baseline is reported before needs', () => {
    expect(runWhatIf({}, { kind: 'pay-change', direction: 'up', bp: 0 }, NOW)).toEqual({ status: 'invalid', field: 'bp' });
    expect(runWhatIf({ incomeWeekly: -1 }, rentUp, NOW)).toEqual({ status: 'invalid', field: 'incomeWeekly' });
    expect(runWhatIf({ incomeWeekly: 1.5 }, rentUp, NOW)).toEqual({ status: 'invalid', field: 'incomeWeekly' });
    expect(runWhatIf({ foodBudgetWeekly: LIMITS.food + 1 }, rentUp, NOW)).toEqual({ status: 'invalid', field: 'foodBudgetWeekly' });
    expect(runWhatIf(BASE, rentUp, new Date(Number.NaN))).toEqual({ status: 'invalid', field: 'now' });
    expect(() => runWhatIf(null as unknown as Baseline, null as unknown as Scenario, NOW)).not.toThrow();
  });
  it('no income: still ok, shows changes only', () => {
    const r = ok(runWhatIf({ housingWeekly: 45000 }, rentUp, NOW));
    expect(r.before.income).toBeNull();
    expect(r.weeks[0].income).toBeNull();
    expect(r.weeks[0].leftAfterCosts).toBeNull();
    expect(r.weeks[0].foodDays).toBeNull();
    expect(r.change4.housing).toBe(18000);
    expect(r.change4.leftAfterCosts).toBeNull();
  });
});

describe('zero and extremes', () => {
  it('zero income is valid and never divides', () => {
    const r = run(rentUp, { ...BASE, incomeWeekly: 0 });
    expect(r.before.leftAfterCosts).toBe(-60000);
    expect(r.before.foodDays).toBe(0);
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/NaN|Infinity/);
    const nums = [r.before, ...r.weeks].flatMap((w) => [w.income, w.housing, w.otherFixed, w.oneOff, w.food, w.leftAfterCosts, w.leftAfterFood]);
    expect(nums.every((n) => n !== null && Number.isInteger(n))).toBe(true);
  });
  it('zero food budget gives no days line', () => {
    expect(run(rentUp, { ...BASE, foodBudgetWeekly: 0 }).before.foodDays).toBeNull();
  });
  it('all maxima at once stay integer and safe', () => {
    const base: Baseline = { incomeWeekly: LIMITS.income, housingWeekly: LIMITS.housing, otherFixedWeekly: LIMITS.otherFixed, foodBudgetWeekly: LIMITS.food };
    const r = run({ kind: 'combined', steps: [
      { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: LIMITS.maxBp } },
      shift({ unit: 'hours', count: 60, payPerUnit: LIMITS.payPerUnit }),
      { kind: 'one-off-bill', cents: LIMITS.oneOff, week: 4 },
      { kind: 'food-price-change', direction: 'up', bp: LIMITS.maxBp },
    ] }, base);
    for (const w of [r.before, ...r.weeks]) for (const v of Object.values(w)) if (v !== null) expect(Number.isSafeInteger(v)).toBe(true);
    for (const t of [r.before4, r.after4, r.change4]) for (const v of Object.values(t)) if (v !== null) expect(Number.isSafeInteger(v)).toBe(true);
  });
});

describe('weekStarts', () => {
  const starts = (now: Date) => ok(runWhatIf(BASE, rentUp, now)).weekStarts;
  const gaps = (s: string[]) => s.slice(1).map((x, i) => Math.round((Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8)) - Date.UTC(+s[i].slice(0, 4), +s[i].slice(5, 7) - 1, +s[i].slice(8))) / 86400000));
  it('starts at the Monday of the current week', () => {
    expect(starts(NOW)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16']);
  });
  it('Sunday 23:59 and Monday 00:00 differ by a week', () => {
    expect(starts(new Date(2026, 9, 4, 23, 59))[0]).toBe('2026-09-28');
    expect(starts(new Date(2026, 9, 5, 0, 0))[0]).toBe('2026-10-05');
  });
  it('stay seven calendar days apart across daylight saving (4 Oct and 5 Apr)', () => {
    for (const now of [new Date(2026, 9, 1, 12), new Date(2026, 3, 1, 12), new Date(2026, 3, 5, 12)]) expect(gaps(starts(now))).toEqual([7, 7, 7]);
  });
});
