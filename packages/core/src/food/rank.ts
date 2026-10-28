import type { RankedSwap } from '../domain/swaps/rank';
import { certifiedMeatNote, fitsProfile } from './rules';
import type { FoodInfo, FoodProfile } from './types';

/** A nudge on the 0-100 value, smaller than a 15-point cost or health gap. */
export const KITCHEN_BOOST = 8;

export interface ProfiledSwap {
  swap: RankedSwap;
  fit: 'fits' | 'check';
  /** The item belongs to one of the person's chosen traditions. */
  kitchen: boolean;
  certifiedMeat: 'halal' | 'kosher' | null;
}

/**
 * Hide swaps that break the person's rules or allergies, nudge swaps from their traditions,
 * and list `fits` before `check`, each by value (unpriced last, ties keep input order).
 */
export function rankForProfile(
  swaps: RankedSwap[],
  infoOf: (itemId: string) => FoodInfo | undefined,
  food: FoodProfile | undefined,
): { shown: ProfiledSwap[]; hidden: number } {
  const chosen = new Set((food?.traditions ?? []).map((t) => t.toLowerCase()));
  const rows: Array<ProfiledSwap & { boosted: number | null }> = [];
  let hidden = 0;
  for (const swap of swaps) {
    const info = infoOf(swap.candidate.alternative.id);
    const fit = fitsProfile(info, food);
    if (fit === 'out') {
      hidden += 1;
      continue;
    }
    const kitchen = (info?.traditions ?? []).some((t) => chosen.has(t.toLowerCase()));
    rows.push({
      swap,
      fit,
      kitchen,
      certifiedMeat: certifiedMeatNote(info, food?.rules ?? []),
      boosted: swap.value === null ? null : swap.value + (kitchen ? KITCHEN_BOOST : 0),
    });
  }
  const order = (a: { fit: string; boosted: number | null }, b: { fit: string; boosted: number | null }): number => {
    if (a.fit !== b.fit) return a.fit === 'fits' ? -1 : 1;
    if (a.boosted === b.boosted) return 0;
    if (a.boosted === null) return 1;
    if (b.boosted === null) return -1;
    return b.boosted - a.boosted;
  };
  const shown = rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => order(a.r, b.r) || a.i - b.i)
    .map(({ r: { boosted: _boosted, ...row } }) => row);
  return { shown, hidden };
}
