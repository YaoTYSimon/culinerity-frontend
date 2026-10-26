import type { Aud, SpendEntry } from '../domain/types';
import { addLocalDays, dayIndexMonday, DAYS_PER_WEEK, isInWeek, startOfLocalDay, weekBounds, weekStartMonday } from './week';

export type Pace = 'no-budget' | 'on-track' | 'a-bit-fast' | 'over';

export interface BudgetSummary {
  spent: Aud;
  remaining: Aud | null;
  over: Aud;
  percentSpent: number | null;
  daysLeft: number;
  perDayLeft: Aud | null;
  pace: Pace;
}

/** Spent share may run this far ahead of the elapsed share of the week before the pace says "a bit fast". */
const PACE_TOLERANCE = 0.1;

const roundCents = (n: number): number => Math.round(n * 100) / 100;
const sumCents = (entries: SpendEntry[]): Aud => roundCents(entries.reduce((s, e) => s + e.amount, 0));
const isoDay = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Entries dated within the Monday week that contains `now`. */
export function entriesThisWeek(entries: SpendEntry[] | undefined, now: Date): SpendEntry[] {
  const bounds = weekBounds(now);
  return (entries ?? []).filter((e) => isInWeek(e.at, bounds));
}

/** Share of the Monday week that has passed: completed days plus the fraction of today (real minutes, so 23/25-hour days work). */
function elapsedShare(now: Date): number {
  const midnight = startOfLocalDay(now);
  const nextMidnight = addLocalDays(midnight, 1);
  const today = (now.getTime() - midnight.getTime()) / (nextMidnight.getTime() - midnight.getTime());
  return (dayIndexMonday(now) + today) / DAYS_PER_WEEK;
}

export function budgetSummary(entries: SpendEntry[] | undefined, budget: number | undefined, now: Date): BudgetSummary {
  const spent = sumCents(entriesThisWeek(entries, now));
  const daysLeft = DAYS_PER_WEEK - dayIndexMonday(now);
  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget <= 0) {
    return { spent, remaining: null, over: 0, percentSpent: null, daysLeft, perDayLeft: null, pace: 'no-budget' };
  }
  const remaining = Math.max(0, roundCents(budget - spent));
  const over = Math.max(0, roundCents(spent - budget));
  let pace: Pace = 'on-track';
  if (spent > budget) pace = 'over';
  else if (dayIndexMonday(now) > 0 && spent / budget - elapsedShare(now) > PACE_TOLERANCE) pace = 'a-bit-fast';
  return {
    spent,
    remaining,
    over,
    percentSpent: Math.round((spent / budget) * 1000) / 10,
    daysLeft,
    perDayLeft: remaining > 0 ? roundCents(remaining / daysLeft) : null,
    pace,
  };
}

/** Totals for the current Monday week and the `weeks - 1` before it, newest first; weekStart is the local date YYYY-MM-DD. */
export function weeklyTotals(entries: SpendEntry[] | undefined, now: Date, weeks: number): { weekStart: string; total: Aud }[] {
  const out: { weekStart: string; total: Aud }[] = [];
  const thisMonday = weekStartMonday(now);
  for (let i = 0; i < weeks; i++) {
    const start = addLocalDays(thisMonday, -DAYS_PER_WEEK * i);
    const bounds = { start, end: addLocalDays(start, DAYS_PER_WEEK) };
    out.push({ weekStart: isoDay(start), total: sumCents((entries ?? []).filter((e) => isInWeek(e.at, bounds))) });
  }
  return out;
}
