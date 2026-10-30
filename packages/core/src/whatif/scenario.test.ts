import { describe, expect, it } from 'vitest';
import { LIMITS, validateScenario } from './scenario';

const ok = (s: unknown) => expect(validateScenario(s).ok).toBe(true);
const bad = (s: unknown, field: string) => expect(validateScenario(s)).toEqual({ ok: false, field });

const lose = (o: object = {}) => ({ kind: 'lose-work', unit: 'shifts', count: 1, payPerUnit: 12000, everyWeeks: 1, ...o });

describe('validateScenario limits', () => {
  it('lose-work count and pay', () => {
    ok(lose({ count: 14 })); bad(lose({ count: 14.5 }), 'count');
    ok(lose({ count: 0.5 })); bad(lose({ count: 0 }), 'count');
    ok(lose({ unit: 'hours', count: 60 })); bad(lose({ unit: 'hours', count: 60.5 }), 'count');
    bad(lose({ count: 1.25 }), 'count');
    ok(lose({ payPerUnit: LIMITS.payPerUnit })); bad(lose({ payPerUnit: LIMITS.payPerUnit + 1 }), 'payPerUnit');
    ok(lose({ everyWeeks: 4 })); bad(lose({ everyWeeks: 3 }), 'everyWeeks');
    bad(lose({ unit: 'days' }), 'unit');
  });
  it('percent steps accept 1 to 10000 bp', () => {
    for (const kind of ['pay-change', 'food-price-change']) {
      ok({ kind, direction: 'up', bp: LIMITS.maxBp }); bad({ kind, direction: 'up', bp: LIMITS.maxBp + 1 }, 'bp');
      ok({ kind, direction: 'down', bp: 1 }); bad({ kind, direction: 'down', bp: 0 }, 'bp');
      bad({ kind, direction: 'sideways', bp: 5 }, 'direction');
    }
    ok({ kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 10000 } });
    bad({ kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 10001 } }, 'by.bp');
  });
  it('payment change limit is per week after conversion', () => {
    const p = (cents: number, per: string) => ({ kind: 'payment-change', direction: 'down', amount: { cents, per } });
    ok(p(LIMITS.paymentWeekly, 'week')); bad(p(LIMITS.paymentWeekly + 1, 'week'), 'amount.cents');
    ok(p(LIMITS.paymentWeekly * 2, 'fortnight')); bad(p(LIMITS.paymentWeekly * 2 + 2, 'fortnight'), 'amount.cents');
    bad(p(100, 'year'), 'amount.per');
  });
  it('rent dollars share the payment limit', () => {
    const r = (cents: number) => ({ kind: 'rent-change', direction: 'up', by: { mode: 'dollars', amount: { cents, per: 'week' } } });
    ok(r(LIMITS.paymentWeekly)); bad(r(LIMITS.paymentWeekly + 1), 'by.amount.cents');
  });
  it('one-off bill', () => {
    const b = (o: object) => ({ kind: 'one-off-bill', cents: 20000, week: 3, ...o });
    ok(b({ cents: LIMITS.oneOff })); bad(b({ cents: LIMITS.oneOff + 1 }), 'cents');
    ok(b({ week: 4 })); bad(b({ week: 5 }), 'week'); bad(b({ week: 0 }), 'week');
  });
  it('refuses non-integer, NaN, infinite and negative cents', () => {
    bad(lose({ payPerUnit: 12.5 }), 'payPerUnit');
    bad(lose({ payPerUnit: Number.NaN }), 'payPerUnit');
    bad(lose({ payPerUnit: Infinity }), 'payPerUnit');
    bad(lose({ payPerUnit: -100 }), 'payPerUnit');
    bad({ kind: 'one-off-bill', cents: -1, week: 1 }, 'cents');
  });
  it('refuses junk shapes', () => {
    bad(null, 'scenario'); bad('x', 'scenario'); bad({ kind: 'nope' }, 'kind');
  });
});

describe('combined', () => {
  const rent = { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 1000 } };
  const shift = lose();
  const bill = { kind: 'one-off-bill', cents: 100, week: 1 };
  const food = { kind: 'food-price-change', direction: 'up', bp: 500 };
  const pay = { kind: 'pay-change', direction: 'down', bp: 500 };
  it('accepts 2 to 4 distinct steps', () => {
    ok({ kind: 'combined', steps: [rent, shift] });
    ok({ kind: 'combined', steps: [rent, shift, bill, food] });
  });
  it('refuses 1 or 5 steps, duplicates and nesting', () => {
    bad({ kind: 'combined', steps: [rent] }, 'steps');
    bad({ kind: 'combined', steps: [rent, shift, bill, food, pay] }, 'steps');
    bad({ kind: 'combined', steps: [rent, rent] }, 'steps');
    bad({ kind: 'combined', steps: [rent, { kind: 'combined', steps: [shift, bill] }] }, 'steps.1.kind');
    bad({ kind: 'combined', steps: 'x' }, 'steps');
  });
  it('names the nested field of an invalid step', () => {
    bad({ kind: 'combined', steps: [rent, lose({ count: 99 })] }, 'steps.1.count');
  });
});
