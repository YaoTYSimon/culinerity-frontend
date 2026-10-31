import { describe, expect, it } from 'vitest';
import { compare } from './compare';
import { runWhatIf } from './run';
import type { Baseline, Scenario, Step, WhatIfResult } from './types';

const NOW = new Date(2026, 9, 28, 12);
const BASE: Baseline = { incomeWeekly: 90000, housingWeekly: 45000, otherFixedWeekly: 15000, foodBudgetWeekly: 12000 };
const ok = (r: WhatIfResult) => {
  if (r.status !== 'ok') throw new Error('expected ok');
  return r;
};
const run = (s: Scenario, b: Baseline = BASE) => ok(runWhatIf(b, s, NOW));
const rentUp: Step = { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 1000 } };
const shift: Step = { kind: 'lose-work', unit: 'shifts', count: 1, payPerUnit: 12000, everyWeeks: 1 };

describe('compare', () => {
  it('rent +10% against one lost shift', () => {
    const c = compare(run(rentUp), run(shift));
    expect(c.sentence).toBe('Second leaves $75 a week less than first.');
    const left = c.rows.find((r) => r.key === 'leftAfterCosts')!;
    expect(left).toMatchObject({ a: 25500, b: 18000, diff: -7500, sentence: 'Second leaves $75 a week less than first.' });
    expect(c.rows.find((r) => r.key === 'leftAfterFood')!.sentence).toBe('Second leaves $75 a week less after food than first.');
    expect(c.rows.find((r) => r.key === 'income')!.sentence).toBeNull();
    expect(c.rows.map((r) => r.key)).toHaveLength(7);
  });
  it('names the period: a week only when the difference recurs every week', () => {
    const oneOff: Step = { kind: 'one-off-bill', cents: 40000, week: 1 };
    const oneOff3: Step = { kind: 'one-off-bill', cents: 40000, week: 3 };
    // both recurring: every week
    expect(compare(run(rentUp), run(shift)).sentence).toContain('a week');
    // two one-offs in the same week: that week only
    const same = compare(run(oneOff), run({ ...oneOff, cents: 60000 })).sentence;
    expect(same).toBe('Second leaves $200 less in week 1 than first.');
    expect(same).not.toContain('a week');
    // recurring against a one-off: the difference does not repeat
    const mixed = compare(run(shift), run(oneOff));
    expect(mixed.sentence).toBe('Second leaves $280 less in week 1 than first.');
    expect(mixed.rows.find((r) => r.key === 'leftAfterFood')!.sentence).toBe('Second leaves $280 less after food in week 1 than first.');
    // different first weeks
    const apart = compare(run(oneOff), run({ ...oneOff3, cents: 60000 })).sentence;
    expect(apart).toContain('in the first week each change touches');
    expect(apart).not.toContain('a week');
    expect(JSON.stringify([mixed, apart])).not.toMatch(/better|worse/i);
  });
  it('more is more', () => {
    expect(compare(run(shift), run(rentUp)).sentence).toBe('Second leaves $75 a week more than first.');
  });
  it('equal reads both the same', () => {
    const c = compare(run(rentUp), run(rentUp));
    expect(c.sentence).toBe('Both leave the same.');
    expect(c.rows.find((r) => r.key === 'leftAfterCosts')!.diff).toBe(0);
  });
  it('carries food days', () => {
    const c = compare(run(rentUp), run({ ...shift, count: 2 }));
    expect(c.foodDays).toEqual({ a: 7, b: 3 });
  });
  it('without income there is nothing to compare for what is left', () => {
    const c = compare(run(rentUp, { housingWeekly: 45000 }), run(shift, { housingWeekly: 45000 }));
    expect(c.rows.find((r) => r.key === 'leftAfterCosts')).toMatchObject({ a: null, b: null, diff: null, sentence: null });
    expect(c.sentence).toBe("Add your weekly income to compare what's left.");
    expect(c.foodDays).toEqual({ a: null, b: null });
  });
  it('never uses better or worse', () => {
    const c = compare(run(rentUp), run(shift));
    expect(JSON.stringify(c)).not.toMatch(/better|worse/i);
  });
});
