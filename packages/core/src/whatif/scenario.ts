import { toWeeklyCents } from './units';
import type { Direction, Per, Recurring, Scenario, Step } from './types';

/** Input limits (cents / basis points). Inputs above them are refused, never clamped. */
export const LIMITS = {
  income: 2_000_000,
  housing: 1_000_000,
  otherFixed: 1_000_000,
  food: 1_000_000,
  payPerUnit: 500_000,
  paymentWeekly: 500_000,
  oneOff: 10_000_000,
  maxBp: 10_000,
  shifts: { min: 0.5, max: 14 },
  hours: { min: 0.5, max: 60 },
} as const;

type Check = { ok: true; step: Step } | { ok: false; field: string };
const fail = (field: string): { ok: false; field: string } => ({ ok: false, field });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const isDirection = (v: unknown): v is Direction => v === 'up' || v === 'down';
const PERS: readonly unknown[] = ['week', 'fortnight', 'month'] satisfies Per[];

/** Field name of the first problem with a recurring amount, or null. */
function recurringProblem(v: unknown, path: string): string | null {
  if (!isObj(v)) return path;
  if (!PERS.includes(v.per)) return `${path}.per`;
  if (!isInt(v.cents, 1, LIMITS.paymentWeekly * 52)) return `${path}.cents`;
  return toWeeklyCents(v as unknown as Recurring) <= LIMITS.paymentWeekly ? null : `${path}.cents`;
}

function checkStep(s: Record<string, unknown>): Check {
  switch (s.kind) {
    case 'lose-work': {
      if (s.unit !== 'shifts' && s.unit !== 'hours') return fail('unit');
      const r = s.unit === 'shifts' ? LIMITS.shifts : LIMITS.hours;
      if (typeof s.count !== 'number' || !Number.isFinite(s.count) || s.count < r.min || s.count > r.max || !Number.isInteger(s.count * 2)) return fail('count');
      if (!isInt(s.payPerUnit, 1, LIMITS.payPerUnit)) return fail('payPerUnit');
      if (s.everyWeeks !== 1 && s.everyWeeks !== 2 && s.everyWeeks !== 4) return fail('everyWeeks');
      return { ok: true, step: { kind: 'lose-work', unit: s.unit, count: s.count, payPerUnit: s.payPerUnit, everyWeeks: s.everyWeeks } };
    }
    case 'pay-change':
    case 'food-price-change':
      if (!isDirection(s.direction)) return fail('direction');
      if (!isInt(s.bp, 1, LIMITS.maxBp)) return fail('bp');
      return { ok: true, step: { kind: s.kind, direction: s.direction, bp: s.bp } };
    case 'payment-change': {
      if (!isDirection(s.direction)) return fail('direction');
      const bad = recurringProblem(s.amount, 'amount');
      return bad ? fail(bad) : { ok: true, step: { kind: 'payment-change', direction: s.direction, amount: pickRecurring(s.amount as Recurring) } };
    }
    case 'one-off-bill':
      if (!isInt(s.cents, 1, LIMITS.oneOff)) return fail('cents');
      if (s.week !== 1 && s.week !== 2 && s.week !== 3 && s.week !== 4) return fail('week');
      return { ok: true, step: { kind: 'one-off-bill', cents: s.cents, week: s.week } };
    case 'rent-change': {
      if (!isDirection(s.direction)) return fail('direction');
      if (!isObj(s.by)) return fail('by');
      if (s.by.mode === 'percent') {
        if (!isInt(s.by.bp, 1, LIMITS.maxBp)) return fail('by.bp');
        return { ok: true, step: { kind: 'rent-change', direction: s.direction, by: { mode: 'percent', bp: s.by.bp } } };
      }
      if (s.by.mode !== 'dollars') return fail('by.mode');
      const bad = recurringProblem(s.by.amount, 'by.amount');
      return bad ? fail(bad) : { ok: true, step: { kind: 'rent-change', direction: s.direction, by: { mode: 'dollars', amount: pickRecurring(s.by.amount as Recurring) } } };
    }
    default:
      return fail('kind');
  }
}

const pickRecurring = (r: Recurring): Recurring => ({ cents: r.cents, per: r.per });

/** Strict shape and range check. Returns a clean copy of the scenario or the first bad field. */
export function validateScenario(s: unknown): { ok: true; scenario: Scenario } | { ok: false; field: string } {
  if (!isObj(s)) return fail('scenario');
  if (s.kind !== 'combined') {
    const r = checkStep(s);
    return r.ok ? { ok: true, scenario: r.step } : r;
  }
  const raw = s.steps;
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 4) return fail('steps');
  const steps: Step[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item: unknown = raw[i];
    if (!isObj(item)) return fail(`steps.${i}`);
    if (item.kind === 'combined') return fail(`steps.${i}.kind`);
    const r = checkStep(item);
    if (!r.ok) return fail(`steps.${i}.${r.field}`);
    steps.push(r.step);
  }
  if (new Set(steps.map((x) => x.kind)).size !== steps.length) return fail('steps');
  return { ok: true, scenario: { kind: 'combined', steps } };
}
