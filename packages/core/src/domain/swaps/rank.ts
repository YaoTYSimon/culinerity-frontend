import type { Aud, Nutrition, PricePoint, SwapCandidate } from '../types';
import { healthScore } from './health';

export interface RankedSwap {
  candidate: SwapCandidate;
  price: PricePoint | null;
  cost: Aud | null;
  health: number;
  withinBudget: boolean | null;
}

export interface RankInput {
  candidates: SwapCandidate[];
  prices: Record<string, PricePoint[]>;
  nutrition: Record<string, Nutrition>;
  score: number | null;
  budgetPerServe: Aud | null;
}

/** Health used when an item has no nutrition record: neutral. */
const UNKNOWN_HEALTH = 50;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function cheapest(points: PricePoint[] | undefined): PricePoint | null {
  let best: PricePoint | null = null;
  for (const p of points ?? []) if (best === null || p.pricePerServe < best.pricePerServe) best = p;
  return best;
}

/**
 * Rank swaps by (1 - w) * cheapness + w * health, with w = (score ?? 50) / 100.
 * Cheapness (0-100) is relative to the craving's own lowest price (equal or
 * dearer = 0, free = 100); if that is unknown, relative to the dearest swap.
 * Unpriced swaps sort after priced ones. Over-budget swaps are flagged, not dropped.
 */
export function rankSwaps(input: RankInput): RankedSwap[] {
  const { candidates, prices, nutrition, budgetPerServe } = input;
  const score = input.score !== null && Number.isFinite(input.score) ? input.score : 50;
  const w = clamp(score, 0, 100) / 100;

  const rows = candidates.map((candidate) => {
    const id = candidate.alternative.id;
    const price = cheapest(prices[id]);
    const cost = price ? price.pricePerServe : null;
    const n = nutrition[id];
    return {
      candidate,
      price,
      cost,
      health: n ? healthScore(n) : UNKNOWN_HEALTH,
      withinBudget: cost !== null && budgetPerServe !== null ? cost <= budgetPerServe : null,
    };
  });

  // Candidates must all share one craving (swapsFor(cravingId) guarantees this), so the
  // first one's craving is the price reference for every swap.
  const cravingCost = candidates.length ? cheapest(prices[candidates[0].craving.id])?.pricePerServe : undefined;
  const ref = cravingCost ?? Math.max(0, ...rows.map((r) => r.cost ?? 0));
  const cheapness = (cost: number) => (ref > 0 ? clamp(100 * (1 - cost / ref), 0, 100) : 100);

  const valued = rows.map((r, i) => ({
    r,
    i,
    value: r.cost === null ? -Infinity : (1 - w) * cheapness(r.cost) + w * r.health,
  }));
  valued.sort((a, b) => {
    if (a.value !== b.value) return a.value === -Infinity ? 1 : b.value === -Infinity ? -1 : b.value - a.value;
    return b.r.health - a.r.health || a.i - b.i;
  });
  return valued.map((v) => v.r);
}
