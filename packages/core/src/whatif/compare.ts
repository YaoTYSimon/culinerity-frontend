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

function sentence(diff: Cents, suffix: string): string {
  if (diff === 0) return SAME;
  return `Second leaves ${formatCents(Math.abs(diff))} a week ${diff < 0 ? 'less' : 'more'}${suffix} than first.`;
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
    return { key, a: va, b: vb, diff, sentence: diff === null || suffix === undefined ? null : sentence(diff, suffix) };
  });
  const lead = rows.find((r) => r.key === 'leftAfterCosts')?.sentence ?? rows.find((r) => r.key === 'leftAfterFood')?.sentence ?? null;
  return { rows, foodDays: { a: fa.foodDays, b: fb.foodDays }, sentence: lead ?? NO_INCOME };
}
