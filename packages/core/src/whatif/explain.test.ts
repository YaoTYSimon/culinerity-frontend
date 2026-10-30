import { describe, expect, it } from 'vitest';
import { hasBannedWord } from './banned';
import { DESCRIBE_NAME, explain } from './explain';
import { runWhatIf } from './run';
import type { Baseline, Scenario, Step, WhatIfResult } from './types';

const NOW = new Date(2026, 9, 28, 12);
const BASE: Baseline = { incomeWeekly: 90000, housingWeekly: 45000, otherFixedWeekly: 15000, foodBudgetWeekly: 12000 };
const ok = (r: WhatIfResult) => {
  if (r.status !== 'ok') throw new Error(`expected ok, got ${JSON.stringify(r)}`);
  return r;
};
const ex = (s: Scenario, b: Baseline = BASE) => explain(ok(runWhatIf(b, s, NOW)), s, b);

const rentUp: Step = { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 1000 } };
const shift = (o: Partial<Extract<Step, { kind: 'lose-work' }>> = {}): Step => ({ kind: 'lose-work', unit: 'shifts', count: 1, payPerUnit: 12000, everyWeeks: 1, ...o });

const hasBanned = hasBannedWord;

describe('headline', () => {
  it('rent up 10%', () => {
    expect(ex(rentUp).headline).toBe("With this change you'd have $45 less each week after the costs you told us about: $255 left instead of $300.");
  });
  it('says more when pay goes up', () => {
    const e = ex({ kind: 'pay-change', direction: 'up', bp: 1000 });
    expect(e.headline).toBe("With this change you'd have $90 more each week after the costs you told us about: $390 left instead of $300.");
  });
  it('names the week when only some weeks change', () => {
    expect(ex({ kind: 'one-off-bill', cents: 20000, week: 3 }).headline).toContain('in week 3');
  });
  it('negative left says it would be more than income, and flags a shortfall', () => {
    const e = ex(shift({ count: 3 }));
    expect(e.headline).toContain('would be $60 more than your income');
    expect(e.shortfall).toBe(true);
  });
  it('exactly zero left uses all of income', () => {
    const e = ex(shift({ payPerUnit: 30000 }));
    expect(e.headline).toBe('With this change the costs you told us about would use up all of your income each week.');
  });
  it('a food price rise talks about what is left after food', () => {
    const e = ex({ kind: 'food-price-change', direction: 'up', bp: 1000 });
    expect(e.headline).toBe("With this change you'd have $12 less each week after food: $168 left instead of $180.");
  });
  it('no income: states the change only', () => {
    const b: Baseline = { housingWeekly: 45000 };
    const e = ex(rentUp, b);
    expect(e.headline).toBe('Rent would go up $45 a week, $180 over four weeks.');
    for (const r of e.rows.filter((x) => x.key.startsWith('leftAfter'))) expect([r.before, r.after, r.change]).toEqual([null, null, null]);
  });
  it('rent in dollars with no rent entered still states the amount', () => {
    const s: Scenario = { kind: 'rent-change', direction: 'up', by: { mode: 'dollars', amount: { cents: 5000, per: 'week' } } };
    const e = ex(s, {});
    expect(e.headline).toBe('Rent would go up $50 a week, $200 over four weeks.');
    const housing = e.rows.find((r) => r.key === 'housing')!;
    expect(housing).toMatchObject({ before: null, after: 5000, change: 5000 });
    expect(e.unknown.join(' ')).toContain("You didn't tell us your rent, so we only know the change.");
  });
  it('a one-off bill without income', () => {
    expect(ex({ kind: 'one-off-bill', cents: 20000, week: 2 }, {}).headline).toBe('A one-off bill of $200 would land in week 2.');
  });
  it('lose work every second week without income', () => {
    expect(ex(shift({ everyWeeks: 2 }), {}).headline).toBe('Income would go down $120 every second week, $240 over four weeks.');
  });
  it('a change that moves nothing', () => {
    expect(ex(rentUp, { incomeWeekly: 90000, housingWeekly: 0, otherFixedWeekly: 15000 }).headline).toBe("This change doesn't move any of the numbers you gave us: $750 left, same as now.");
  });
});

describe('rows', () => {
  it('lists the seven lines with plain labels and the first affected week', () => {
    const e = ex(rentUp);
    expect(e.rows.map((r) => r.key)).toEqual(['income', 'housing', 'otherFixed', 'oneOff', 'food', 'leftAfterCosts', 'leftAfterFood']);
    expect(e.rows.find((r) => r.key === 'housing')).toMatchObject({ label: 'Rent or housing', before: 45000, after: 49500, change: 4500 });
    expect(e.rows.find((r) => r.key === 'leftAfterCosts')).toMatchObject({ before: 30000, after: 25500, change: -4500 });
    expect(e.rows.find((r) => r.key === 'oneOff')).toMatchObject({ before: 0, after: 0, change: 0 });
  });
});

describe('how, assumed, unknown', () => {
  it('echoes the rent sums', () => {
    const how = ex(rentUp).how;
    expect(how).toContain('You told us rent is $450 a week. 10% of $450 is $45, so rent would be $495.');
    expect(how).toContain('Left after costs = income - rent - other costs.');
    expect(how).toContain('Over four weeks that is $180 less left after costs ($1,020 instead of $1,200).');
  });
  it('echoes the lost shift', () => {
    expect(ex(shift()).how).toContain("You told us you'd lose 1 shift a week and that a shift pays you $120. 1 x $120 = $120 less income each week.");
  });
  it('echoes hours, plurals and spaced weeks', () => {
    const how = ex(shift({ unit: 'hours', count: 2.5, payPerUnit: 3000, everyWeeks: 2 })).how;
    expect(how).toContain("You told us you'd lose 2.5 hours every second week and that an hour pays you $30. 2.5 x $30 = $75 less income in each of those weeks.");
  });
  it('echoes pay, payment, one-off and food', () => {
    expect(ex({ kind: 'pay-change', direction: 'down', bp: 750 }).how).toContain('You told us pay would go down 7.5%. 7.5% of your income of $900 is $67.50, so income would be $832.50.');
    expect(ex({ kind: 'payment-change', direction: 'up', amount: { cents: 10000, per: 'fortnight' } }).how).toContain('You told us a payment would go up by $100 a fortnight. That is $50 a week, so income would be $950.');
    expect(ex({ kind: 'one-off-bill', cents: 20000, week: 2 }).how).toContain("You told us a one-off bill of $200 would arrive in week 2. It's counted in that week only.");
    expect(ex({ kind: 'food-price-change', direction: 'up', bp: 1000 }).how).toContain('You told us food prices would go up 10%. 10% of your food budget of $120 is $12, so the same shopping would cost $132.');
  });
  it('says the food days sentence is arithmetic only', () => {
    const how = ex(shift({ count: 2 })).how.join(' ');
    expect(how).toContain('would cover about 3 of 7 days of your food budget');
    expect(how).toContain('not a suggestion');
  });
  it('says when income is clamped', () => {
    const e = ex({ kind: 'payment-change', direction: 'down', amount: { cents: 500000, per: 'week' } }, { incomeWeekly: 10000 });
    expect(e.how.join(' ')).toContain("Your income can't go below $0 in these sums.");
  });
  it('assumes the fixed things', () => {
    const a = ex(shift()).assumed;
    expect(a).toContain('Everything else stays the same.');
    expect(a).toContain('Lost shifts or hours are paid what you told us.');
    expect(a).toContain('Weeks run Monday to Sunday, starting this week.');
    expect(ex(rentUp).assumed).toContain("Percentages are taken from today's numbers, not added on top of each other.");
  });
  it('has a line for each blank field plus the standing line', () => {
    const e = ex(shift(), {});
    expect(e.unknown[0]).toBe("Other income, bills we weren't told about, changes to your payments, or what you'll actually decide.");
    const text = e.unknown.join('\n');
    expect(text).toContain('weekly income');
    expect(text).toContain('rent');
    expect(text).toContain('other regular costs');
    expect(text).toContain('food budget');
    expect(ex(rentUp).unknown).toHaveLength(1);
  });
});

describe('DESCRIBE_NAME', () => {
  it('names the common changes', () => {
    expect(DESCRIBE_NAME(rentUp)).toBe('Rent up 10%');
    expect(DESCRIBE_NAME(shift())).toBe('Lose 1 shift a week');
    expect(DESCRIBE_NAME(shift({ count: 2.5, everyWeeks: 2 }))).toBe('Lose 2.5 shifts every 2 weeks');
    expect(DESCRIBE_NAME({ kind: 'pay-change', direction: 'down', bp: 750 })).toBe('Pay down 7.5%');
    expect(DESCRIBE_NAME({ kind: 'one-off-bill', cents: 50000, week: 2 })).toBe('One-off $500 bill, week 2');
  });
  it('stays within 40 characters at the maximums', () => {
    const steps: Step[] = [
      shift({ unit: 'hours', count: 60, payPerUnit: 500000, everyWeeks: 4 }),
      { kind: 'pay-change', direction: 'down', bp: 10000 },
      { kind: 'payment-change', direction: 'down', amount: { cents: 500000, per: 'week' } },
      { kind: 'one-off-bill', cents: 10_000_000, week: 4 },
      { kind: 'rent-change', direction: 'up', by: { mode: 'dollars', amount: { cents: 500000, per: 'week' } } },
      { kind: 'food-price-change', direction: 'up', bp: 10000 },
    ];
    for (const s of steps) expect(DESCRIBE_NAME(s).length).toBeLessThanOrEqual(40);
    expect(DESCRIBE_NAME({ kind: 'combined', steps: steps.slice(0, 4) }).length).toBeLessThanOrEqual(40);
    expect(DESCRIBE_NAME({ kind: 'combined', steps: [steps[0], steps[1]] }).length).toBeLessThanOrEqual(40);
  });
});

describe('every string stays within the copy rules', () => {
  const kinds: Step[] = [
    shift(),
    shift({ unit: 'hours', count: 60, everyWeeks: 4, payPerUnit: 500000 }),
    shift({ count: 14, everyWeeks: 2 }),
    { kind: 'pay-change', direction: 'down', bp: 10000 },
    { kind: 'pay-change', direction: 'up', bp: 1 },
    { kind: 'payment-change', direction: 'down', amount: { cents: 100000, per: 'month' } },
    { kind: 'payment-change', direction: 'up', amount: { cents: 7000, per: 'fortnight' } },
    { kind: 'one-off-bill', cents: 10_000_000, week: 4 },
    { kind: 'one-off-bill', cents: 1, week: 1 },
    rentUp,
    { kind: 'rent-change', direction: 'down', by: { mode: 'dollars', amount: { cents: 5000, per: 'week' } } },
    { kind: 'food-price-change', direction: 'up', bp: 10000 },
    { kind: 'food-price-change', direction: 'down', bp: 725 },
  ];
  const scenarios: Scenario[] = [...kinds, { kind: 'combined', steps: [kinds[0], kinds[3], kinds[7], kinds[9]] }, { kind: 'combined', steps: [kinds[5], kinds[12]] }];
  const baselines: Baseline[] = [BASE, {}, { incomeWeekly: 0, housingWeekly: 0, otherFixedWeekly: 0, foodBudgetWeekly: 0 }, { incomeWeekly: 1, housingWeekly: 1_000_000, otherFixedWeekly: 1_000_000, foodBudgetWeekly: 1_000_000 }, { incomeWeekly: 2_000_000, housingWeekly: 5, foodBudgetWeekly: 7 }];
  it('has none of the banned words or broken numbers', () => {
    let count = 0;
    for (const s of scenarios) {
      for (const b of baselines) {
        const r = runWhatIf(b, s, NOW);
        if (r.status !== 'ok') continue;
        const e = explain(r, s, b);
        const all = [e.headline, ...e.rows.map((x) => x.label), ...e.how, ...e.assumed, ...e.unknown, DESCRIBE_NAME(s)];
        for (const t of all) {
          expect(hasBanned(t), t).toBe(false);
          expect(/NaN|undefined|null|Infinity/.test(t), t).toBe(false);
        }
        count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(30);
  });
  it('the detector is live', () => {
    expect(hasBanned('You should do this')).toBe(true);
    expect(hasBanned('a better week')).toBe(true);
    expect(hasBanned('Left after costs')).toBe(false);
  });
});
