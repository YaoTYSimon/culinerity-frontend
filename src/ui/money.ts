import type { Aud } from '@culinerity/core';

/** "$42" for whole dollars, "$12.50" otherwise: the one way the budget screens write an amount. */
export function formatDollars(n: Aud): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/** Spending as a percentage of income to one decimal; null without a positive income. */
export function shareOfIncome(spent: Aud, income: Aud | undefined): number | null {
  if (typeof income !== 'number' || !Number.isFinite(income) || income <= 0) return null;
  return Math.round((spent / income) * 1000) / 10;
}
