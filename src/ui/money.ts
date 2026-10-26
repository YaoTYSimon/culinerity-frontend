import type { Aud } from '@culinerity/core';

/** "$42" for whole dollars, "$12.50" otherwise: the one way the budget screens write an amount. */
export function formatDollars(n: Aud): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}
