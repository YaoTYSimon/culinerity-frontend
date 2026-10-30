import { stepDeltas } from './run';
import type { Baseline, BaselineField, Bp, Cents, Direction, Per, Recurring, Scenario, Step, WeekFigures, WhatIfResult } from './types';
import { deltaBp, formatCents, toWeeklyCents } from './units';

/**
 * Plain-words explanation of a what-if result. Fixed templates only: no generated text, no network.
 * Every number in a string is an input or a result; amounts go through formatCents of absolute values and
 * the direction word is chosen by sign.
 */

type Ok = Extract<WhatIfResult, { status: 'ok' }>;

export type RowKey = 'income' | 'housing' | 'otherFixed' | 'oneOff' | 'food' | 'leftAfterCosts' | 'leftAfterFood';

export interface ExplanationRow {
  key: RowKey;
  label: string;
  before: Cents | null;
  after: Cents | null;
  change: Cents | null;
}

export interface Explanation {
  headline: string;
  rows: ExplanationRow[];
  how: string[];
  assumed: string[];
  unknown: string[];
  shortfall: boolean;
}

export const ROW_KEYS: readonly RowKey[] = ['income', 'housing', 'otherFixed', 'oneOff', 'food', 'leftAfterCosts', 'leftAfterFood'];

const LABELS: Record<RowKey, string> = {
  income: 'Income',
  housing: 'Rent or housing',
  otherFixed: 'Other regular costs',
  oneOff: 'One-off bills',
  food: 'Food budget',
  leftAfterCosts: 'Left after costs',
  leftAfterFood: 'Left after food',
};

const money = (c: Cents): string => formatCents(Math.abs(c));
const pct = (bp: Bp): string => `${bp / 100}%`;
const lessMore = (c: Cents): string => (c < 0 ? 'less' : 'more');
const upDown = (d: Direction): string => `go ${d}`;
const num = (n: number): string => String(n);

/** The week the figures are shown for: the first one the change touches. */
export function focusFigures(r: Ok): WeekFigures {
  return r.weeks[r.firstAffectedWeek - 1];
}

const PER_LABEL: Record<Per, string> = { week: 'a week', fortnight: 'a fortnight', month: 'a month' };
const EVERY: Record<1 | 2 | 4, string> = { 1: 'a week', 2: 'every second week', 4: 'every fourth week' };

// ---- Names ----

const unitWord = (unit: 'shifts' | 'hours', count: number): string => (count === 1 ? unit.slice(0, -1) : unit);
const everyShort = (n: 1 | 2 | 4): string => (n === 1 ? 'a week' : `every ${n} weeks`);

function stepName(s: Step): string {
  switch (s.kind) {
    case 'lose-work':
      return `Lose ${num(s.count)} ${unitWord(s.unit, s.count)} ${everyShort(s.everyWeeks)}`;
    case 'pay-change':
      return `Pay ${s.direction} ${pct(s.bp)}`;
    case 'payment-change':
      return `Payment ${s.direction} ${money(s.amount.cents)} ${PER_LABEL[s.amount.per]}`;
    case 'one-off-bill':
      return `One-off ${money(s.cents)} bill, week ${s.week}`;
    case 'rent-change':
      return s.by.mode === 'percent' ? `Rent ${s.direction} ${pct(s.by.bp)}` : `Rent ${s.direction} ${money(s.by.amount.cents)} ${PER_LABEL[s.by.amount.per]}`;
    case 'food-price-change':
      return `Food prices ${s.direction} ${pct(s.bp)}`;
  }
}

const NAME_MAX = 40;

/** Default name for a saved what-if, at most 40 characters. */
export function DESCRIBE_NAME(scenario: Scenario): string {
  const name = scenario.kind === 'combined' ? scenario.steps.map(stepName).join(' + ') : stepName(scenario);
  const fitted = name.length <= NAME_MAX ? name : scenario.kind === 'combined' ? `${scenario.steps.length} changes together` : name;
  return fitted.slice(0, NAME_MAX);
}

// ---- Steps ----

const stepsOf = (s: Scenario): Step[] => (s.kind === 'combined' ? s.steps : [s]);
const weekly = (r: Recurring): Cents => toWeeklyCents(r);

/** "a week", "every second week" or "in week 3", from which of the four weeks a delta lands in. */
function timing(deltas: number[]): { when: string; total: Cents; amount: Cents; many: boolean } | null {
  const hit = deltas.map((d, i) => (d !== 0 ? i : -1)).filter((i) => i >= 0);
  if (hit.length === 0) return null;
  const when = hit.length === 4 ? 'a week' : hit.length === 2 ? 'every second week' : `in week ${hit[0] + 1}`;
  return { when, total: deltas.reduce((a, d) => a + Math.abs(d), 0), amount: deltas[hit[0]], many: hit.length > 1 };
}

/** The stated effect of one step on the person's numbers, as a sentence; null if it moves nothing. */
function effectSentences(s: Step, b: Baseline): string[] {
  const d = stepDeltas(s, b);
  const out: string[] = [];
  const tail = (t: NonNullable<ReturnType<typeof timing>>) => (t.many ? `, ${money(t.total)} over four weeks` : '');
  const inc = timing(d.income);
  if (inc) out.push(`Income would ${upDown(inc.amount > 0 ? 'up' : 'down')} ${money(inc.amount)} ${inc.when}${tail(inc)}.`);
  const hou = timing(d.housing);
  if (hou) out.push(`Rent would ${upDown(hou.amount > 0 ? 'up' : 'down')} ${money(hou.amount)} ${hou.when}${tail(hou)}.`);
  const food = timing(d.food);
  if (food) out.push(`The same food shopping would cost ${money(food.amount)} ${food.amount > 0 ? 'more' : 'less'} ${food.when}${tail(food)}.`);
  const one = timing(d.oneOff);
  if (one) out.push(`A one-off bill of ${money(one.amount)} would land in week ${d.oneOff.findIndex((x) => x !== 0) + 1}.`);
  return out;
}

function howLines(s: Step, b: Baseline): string[] {
  switch (s.kind) {
    case 'lose-work': {
      const unit = s.unit === 'shifts' ? 'shift' : 'hour';
      const lost = stepDeltas(s, b).income.find((x) => x !== 0) ?? 0;
      const where = s.everyWeeks === 1 ? 'each week' : 'in each of those weeks';
      const article = unit === 'hour' ? 'an' : 'a';
      return [`You told us you'd lose ${num(s.count)} ${unitWord(s.unit, s.count)} ${EVERY[s.everyWeeks]} and that ${article} ${unit} pays you ${money(s.payPerUnit)}. ${num(s.count)} x ${money(s.payPerUnit)} = ${money(lost)} less income ${where}.`];
    }
    case 'pay-change': {
      const base = b.incomeWeekly ?? 0;
      const delta = deltaBp(base, s.bp);
      const next = Math.max(0, s.direction === 'up' ? base + delta : base - delta);
      return [`You told us pay would ${upDown(s.direction)} ${pct(s.bp)}. ${pct(s.bp)} of your income of ${money(base)} is ${money(delta)}, so income would be ${money(next)}.`];
    }
    case 'payment-change': {
      const wk = weekly(s.amount);
      const told = `You told us a payment would go ${s.direction} by ${money(s.amount.cents)} ${PER_LABEL[s.amount.per]}.`;
      const conv = s.amount.per === 'week' ? '' : ` That is ${money(wk)} a week`;
      if (b.incomeWeekly === undefined) return [`${told}${conv ? `${conv}.` : ''}`];
      const next = Math.max(0, s.direction === 'up' ? b.incomeWeekly + wk : b.incomeWeekly - wk);
      return [`${told}${conv ? `${conv}, so` : ' So'} income would be ${money(next)}.`];
    }
    case 'one-off-bill':
      return [`You told us a one-off bill of ${money(s.cents)} would arrive in week ${s.week}. It's counted in that week only.`];
    case 'rent-change': {
      if (s.by.mode === 'percent') {
        const base = b.housingWeekly ?? 0;
        const delta = deltaBp(base, s.by.bp);
        const next = s.direction === 'up' ? base + delta : base - delta;
        return [`You told us rent is ${money(base)} a week. ${pct(s.by.bp)} of ${money(base)} is ${money(delta)}, so rent would be ${money(next)}.`];
      }
      const wk = weekly(s.by.amount);
      const told = `You told us rent would go ${s.direction} by ${money(s.by.amount.cents)} ${PER_LABEL[s.by.amount.per]}.`;
      const conv = s.by.amount.per === 'week' ? '' : ` That is ${money(wk)} a week.`;
      if (b.housingWeekly === undefined) return [`${told}${conv}`];
      const next = Math.max(0, s.direction === 'up' ? b.housingWeekly + wk : b.housingWeekly - wk);
      return [`${told}${conv} Your rent of ${money(b.housingWeekly)} a week would be ${money(next)}.`];
    }
    case 'food-price-change': {
      const base = b.foodBudgetWeekly ?? 0;
      const delta = deltaBp(base, s.bp);
      const next = s.direction === 'up' ? base + delta : base - delta;
      return [`You told us food prices would go ${s.direction} ${pct(s.bp)}. ${pct(s.bp)} of your food budget of ${money(base)} is ${money(delta)}, so the same shopping would cost ${money(next)}.`];
    }
  }
}

// ---- Headline ----

/** "each week" if the figure is the same after the change in all four weeks, else the first week it differs. */
function whenOf(r: Ok, key: 'leftAfterCosts' | 'leftAfterFood'): { when: string; index: number } {
  const first = r.weeks.findIndex((w) => w[key] !== r.before[key]);
  if (first < 0) return { when: 'each week', index: r.firstAffectedWeek - 1 };
  const same = first === 0 && r.weeks.every((w) => w[key] === r.weeks[0][key]);
  return { when: same ? 'each week' : `in week ${first + 1}`, index: first };
}

function headline(r: Ok, steps: Step[], b: Baseline): string {
  const effects = steps.flatMap((s) => effectSentences(s, b));
  const left = r.before.leftAfterCosts;
  if (left === null) return effects.length > 0 ? effects.join(' ') : "This change doesn't move any of the numbers you gave us.";

  const at = whenOf(r, 'leftAfterCosts');
  const w = r.weeks[at.index];
  const after = w.leftAfterCosts as Cents;

  if (after < 0) return `With this change the costs you told us about would be ${money(after)} more than your income ${at.when}.`;
  if (after === 0) return `With this change the costs you told us about would use up all of your income ${at.when}.`;
  const d = after - left;
  if (d !== 0) return `With this change you'd have ${money(d)} ${lessMore(d)} ${at.when} after the costs you told us about: ${money(after)} left instead of ${money(left)}.`;

  const food = r.before.leftAfterFood;
  const atFood = whenOf(r, 'leftAfterFood');
  const wf = r.weeks[atFood.index].leftAfterFood;
  if (food !== null && wf !== null && wf !== food) {
    const df = wf - food;
    return `With this change you'd have ${money(df)} ${lessMore(df)} ${atFood.when} after food: ${money(wf)} left instead of ${money(food)}.`;
  }
  if (effects.length === 0) return `This change doesn't move any of the numbers you gave us: ${money(left)} left, same as now.`;
  return `This change leaves the same amount after the costs you told us about: ${money(left)} left.`;
}

// ---- Lists ----

function worked(r: Ok, steps: Step[], b: Baseline): string[] {
  const out = steps.flatMap((s) => howLines(s, b));
  for (const c of r.clamped) out.push(`Your ${c === 'housing' ? 'rent' : c === 'food' ? 'food budget' : 'income'} can't go below $0 in these sums.`);
  if (r.before.leftAfterCosts === null) return out;
  const oneOff = steps.some((s) => s.kind === 'one-off-bill');
  out.push(`Left after costs = income - rent - other costs${oneOff ? ' - one-off bills' : ''}.`);
  const { change4, before4, after4 } = r;
  if (change4.leftAfterCosts !== null && before4.leftAfterCosts !== null && after4.leftAfterCosts !== null) {
    const c = change4.leftAfterCosts;
    out.push(
      c === 0
        ? `Over four weeks the amount left after costs stays at ${money(after4.leftAfterCosts)}.`
        : `Over four weeks that is ${money(c)} ${lessMore(c)} left after costs (${money(after4.leftAfterCosts)} instead of ${money(before4.leftAfterCosts)}).`,
    );
  }
  const days = focusFigures(r).foodDays;
  if (days !== null) out.push(`The money left after your other costs would cover about ${days} of 7 days of your food budget. Other costs are counted first, which is how the sum is written, not a suggestion.`);
  return out;
}

function assumptions(steps: Step[], hasIncome: boolean): string[] {
  const out = ['Everything else stays the same.'];
  if (steps.some((s) => s.kind === 'lose-work')) out.push('Lost shifts or hours are paid what you told us.');
  if (steps.some((s) => s.kind === 'pay-change' || s.kind === 'food-price-change' || (s.kind === 'rent-change' && s.by.mode === 'percent'))) {
    out.push("Percentages are taken from today's numbers, not added on top of each other.");
  }
  out.push('Weeks run Monday to Sunday, starting this week.');
  if (hasIncome) out.push('Rent and other costs are paid first in these sums (this is how the arithmetic is written, not a suggestion).');
  return out;
}

function unknowns(steps: Step[], b: Baseline): string[] {
  const out = ["Other income, bills we weren't told about, changes to your payments, or what you'll actually decide."];
  const has = (f: BaselineField) => b[f] !== undefined;
  const hasIncome = has('incomeWeekly');
  if (!hasIncome) out.push("You didn't tell us your weekly income, so we can only show the change, not what's left.");
  if (!has('housingWeekly')) {
    const rentStep = steps.some((s) => s.kind === 'rent-change');
    out.push(
      rentStep ? "You didn't tell us your rent, so we only know the change." : hasIncome ? "You didn't tell us your rent or housing cost, so it counts as $0 in these sums." : "You didn't tell us your rent or housing cost.",
    );
  }
  if (!has('otherFixedWeekly')) out.push(hasIncome ? "You didn't tell us your other regular costs, so they count as $0 in these sums." : "You didn't tell us your other regular costs.");
  if (!has('foodBudgetWeekly')) out.push("You didn't tell us your food budget, so there's no food line.");
  return out;
}

export function explain(result: Ok, scenario: Scenario, baseline: Baseline): Explanation {
  const steps = stepsOf(scenario);
  const w = focusFigures(result);
  const row = (key: RowKey): ExplanationRow => {
    const before = key === 'oneOff' ? result.before.oneOff : result.before[key];
    const after = w[key];
    return { key, label: LABELS[key], before, after, change: after === null ? null : after - (before ?? 0) };
  };
  return {
    headline: headline(result, steps, baseline),
    rows: ROW_KEYS.map(row),
    how: worked(result, steps, baseline),
    assumed: assumptions(steps, baseline.incomeWeekly !== undefined),
    unknown: unknowns(steps, baseline),
    shortfall: result.weeks.some((x) => (x.leftAfterCosts ?? 0) < 0 || (x.leftAfterFood ?? 0) < 0),
  };
}
