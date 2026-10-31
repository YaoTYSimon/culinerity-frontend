import { focusFigures, ROW_KEYS, type RowKey } from './explain';
import type { Cents, WhatIfResult } from './types';
import { formatCents } from './units';

type Ok = Extract<WhatIfResult, { status: 'ok' }>;

export interface ComparisonRow {
  key: RowKey;
  a: Cents | null;
  b: Cents | null;
  diff: Cents | null;
  sentence: string | null;
}

export interface Comparison {
  rows: ComparisonRow[];
  foodDays: { a: number | null; b: number | null };
  sentence: string;
}

const SAME = 'Both leave the same.';
const NO_INCOME = "Add your weekly income to compare what's left.";

/** Which key lines get a sentence, and how it reads. */
const SENTENCE_KEYS: Partial<Record<RowKey, string>> = { leftAfterCosts: '', leftAfterFood: ' after food' };

/**
 * "a week" only when the second differs from the first by this same amount in all four weeks; otherwise the
 * period is named: the shared first affected week, or the first week each change touches when they differ.
 */
function sentence(diff: Cents, suffix: string, when: 'weekly' | number | null): string {
  if (diff === 0) return SAME;
  const amount = formatCents(Math.abs(diff));
  const more = diff < 0 ? 'less' : 'more';
  if (when === 'weekly') return `Second leaves ${amount} a week ${more}${suffix} than first.`;
  const where = when === null ? 'in the first week each change touches' : `in week ${when}`;
  return `Second leaves ${amount} ${more}${suffix} ${where} than first.`;
}

function period(a: Ok, b: Ok, key: 'leftAfterCosts' | 'leftAfterFood', diff: Cents): 'weekly' | number | null {
  const recurs = a.weeks.every((wa, i) => {
    const x = wa[key];
    const y = b.weeks[i][key];
    return x !== null && y !== null && y - x === diff;
  });
  if (recurs) return 'weekly';
  return a.firstAffectedWeek === b.firstAffectedWeek ? a.firstAffectedWeek : null;
}

/** Two results run against today's numbers, line by line, in each one's first affected week. */
export function compare(a: Ok, b: Ok): Comparison {
  const fa = focusFigures(a);
  const fb = focusFigures(b);
  const rows = ROW_KEYS.map((key): ComparisonRow => {
    const va = fa[key];
    const vb = fb[key];
    const diff = va === null || vb === null ? null : vb - va;
    const suffix = SENTENCE_KEYS[key];
    const lead = key === 'leftAfterCosts' || key === 'leftAfterFood';
    return { key, a: va, b: vb, diff, sentence: diff === null || suffix === undefined || !lead ? null : sentence(diff, suffix, period(a, b, key, diff)) };
  });
  const lead = rows.find((r) => r.key === 'leftAfterCosts')?.sentence ?? rows.find((r) => r.key === 'leftAfterFood')?.sentence ?? null;
  return { rows, foodDays: { a: fa.foodDays, b: fb.foodDays }, sentence: lead ?? NO_INCOME };
}
