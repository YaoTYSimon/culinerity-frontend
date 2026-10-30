import { addLocalDays, DAYS_PER_WEEK, weekStartMonday } from '../budget/week';
import { LIMITS, validateScenario } from './scenario';
import type { Baseline, BaselineField, Cents, Scenario, Step, Totals, WeekFigures, WhatIfResult } from './types';
import { deltaBp, toWeeklyCents } from './units';

type Four = [number, number, number, number];
type Weeks = [WeekFigures, WeekFigures, WeekFigures, WeekFigures];
type Ok = Extract<WhatIfResult, { status: 'ok' }>;

const BASELINE_LIMITS: Record<BaselineField, number> = {
  incomeWeekly: LIMITS.income,
  housingWeekly: LIMITS.housing,
  otherFixedWeekly: LIMITS.otherFixed,
  foodBudgetWeekly: LIMITS.food,
};
const FIELDS = Object.keys(BASELINE_LIMITS) as BaselineField[];

/** First invalid baseline field, or null. Absent (undefined) fields are fine. */
function baselineProblem(b: unknown): string | null {
  if (typeof b !== 'object' || b === null) return 'baseline';
  const rec = b as Record<string, unknown>;
  for (const f of FIELDS) {
    const v = rec[f];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0 || v > BASELINE_LIMITS[f]) return f;
  }
  return null;
}

const sign = (d: 'up' | 'down', n: Cents): Cents => (d === 'up' ? n : -n);

/** What a step needs from the baseline. */
function needed(s: Step): BaselineField | null {
  if (s.kind === 'pay-change') return 'incomeWeekly';
  if (s.kind === 'rent-change' && s.by.mode === 'percent') return 'housingWeekly';
  if (s.kind === 'food-price-change') return 'foodBudgetWeekly';
  return null;
}

export interface Deltas {
  income: Four;
  housing: Four;
  food: Four;
  oneOff: Four;
}

/** One step's weekly deltas, always computed from the baseline, never from another step. */
export function stepDeltas(s: Step, b: Baseline): Deltas {
  const d: Deltas = { income: [0, 0, 0, 0], housing: [0, 0, 0, 0], food: [0, 0, 0, 0], oneOff: [0, 0, 0, 0] };
  const all = (arr: Four, n: Cents) => arr.forEach((_, i) => (arr[i] = n));
  switch (s.kind) {
    case 'lose-work': {
      const lost = Math.floor((Math.round(s.count * 2) * s.payPerUnit + 1) / 2);
      for (let i = 0; i < 4; i++) if (i % s.everyWeeks === 0) d.income[i] = -lost;
      break;
    }
    case 'pay-change':
      all(d.income, sign(s.direction, deltaBp(b.incomeWeekly ?? 0, s.bp)));
      break;
    case 'payment-change':
      all(d.income, sign(s.direction, toWeeklyCents(s.amount)));
      break;
    case 'one-off-bill':
      d.oneOff[s.week - 1] = s.cents;
      break;
    case 'rent-change':
      all(d.housing, sign(s.direction, s.by.mode === 'percent' ? deltaBp(b.housingWeekly ?? 0, s.by.bp) : toWeeklyCents(s.by.amount)));
      break;
    case 'food-price-change':
      all(d.food, sign(s.direction, deltaBp(b.foodBudgetWeekly ?? 0, s.bp)));
      break;
  }
  return d;
}

const addFour = (a: Four, b: Four): Four => [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];

function figures(income: Cents | null, housing: Cents | null, otherFixed: Cents | null, oneOff: Cents, food: Cents | null): WeekFigures {
  const left = income === null ? null : income - (housing ?? 0) - (otherFixed ?? 0) - oneOff;
  const leftFood = left === null || food === null ? null : left - food;
  const foodDays = left === null || food === null || food === 0 ? null : Math.min(7, Math.floor((Math.max(0, left) * 7) / food));
  return { income, housing, otherFixed, oneOff, food, leftAfterCosts: left, leftAfterFood: leftFood, foodDays };
}

const TOTAL_KEYS = ['income', 'housing', 'otherFixed', 'oneOff', 'food', 'leftAfterCosts', 'leftAfterFood'] as const;

const sumWeeks = (ws: WeekFigures[]): Totals => {
  const t: Record<string, number | null> = {};
  for (const k of TOTAL_KEYS) {
    const vals = ws.map((w) => w[k]);
    t[k] = vals.some((v) => v === null) ? null : (vals as number[]).reduce((a, v) => a + v, 0);
  }
  return t as unknown as Totals;
};

const diff = (after: Totals, before: Totals): Totals => {
  const t: Record<string, number | null> = {};
  for (const k of TOTAL_KEYS) t[k] = after[k] === null || before[k] === null ? null : after[k]! - before[k]!;
  return t as unknown as Totals;
};

const isoDay = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Four Monday-weeks of the person's own numbers with one change applied. Pure: `now` only labels weeks.
 * Order of work: validation (invalid), missing baseline fields (needs), then the sums.
 */
export function runWhatIf(baseline: Baseline, scenario: Scenario, now: Date): WhatIfResult {
  const v = validateScenario(scenario);
  if (!v.ok) return { status: 'invalid', field: v.field };
  const bad = baselineProblem(baseline);
  if (bad) return { status: 'invalid', field: bad };
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return { status: 'invalid', field: 'now' };

  const steps: Step[] = v.scenario.kind === 'combined' ? v.scenario.steps : [v.scenario];
  const wanted = new Set(steps.map(needed));
  const missing = FIELDS.filter((f) => wanted.has(f) && baseline[f] === undefined);
  if (missing.length > 0) return { status: 'needs', missing };

  const total = steps.map((s) => stepDeltas(s, baseline)).reduce<Deltas>(
    (a, d) => ({ income: addFour(a.income, d.income), housing: addFour(a.housing, d.housing), food: addFour(a.food, d.food), oneOff: addFour(a.oneOff, d.oneOff) }),
    { income: [0, 0, 0, 0], housing: [0, 0, 0, 0], food: [0, 0, 0, 0], oneOff: [0, 0, 0, 0] },
  );

  const I = baseline.incomeWeekly ?? null;
  const H = baseline.housingWeekly ?? null;
  const O = baseline.otherFixedWeekly ?? null;
  const F = baseline.foodBudgetWeekly ?? null;
  const rentTouched = steps.some((s) => s.kind === 'rent-change');
  const clamped = new Set<'income' | 'housing' | 'food'>();
  const floor0 = (raw: number, name: 'income' | 'housing' | 'food' | null) => {
    if (raw < 0 && name !== null) clamped.add(name);
    return Math.max(0, raw);
  };

  const before = figures(I, H, O, 0, F);
  const weeks = [0, 1, 2, 3].map((i) =>
    figures(
      I === null ? null : floor0(I + total.income[i], 'income'),
      H === null && !rentTouched ? null : floor0((H ?? 0) + total.housing[i], H === null ? null : 'housing'),
      O,
      total.oneOff[i],
      F === null ? null : floor0(F + total.food[i], 'food'),
    ),
  ) as Weeks;

  const first = [0, 1, 2, 3].findIndex((i) => total.income[i] !== 0 || total.housing[i] !== 0 || total.food[i] !== 0 || total.oneOff[i] !== 0);
  const start = weekStartMonday(now);
  const before4 = sumWeeks([before, before, before, before]);
  const after4 = sumWeeks(weeks);
  const result: Ok = {
    status: 'ok',
    weekStarts: [0, 1, 2, 3].map((i) => isoDay(addLocalDays(start, i * DAYS_PER_WEEK))) as Ok['weekStarts'],
    before,
    weeks,
    before4,
    after4,
    change4: diff(after4, before4),
    firstAffectedWeek: (first < 0 ? 1 : first + 1) as Ok['firstAffectedWeek'],
    clamped: (['income', 'housing', 'food'] as const).filter((k) => clamped.has(k)),
  };
  return result;
}
