import type { Nutrition, PricePoint, Profile } from '../domain/types';
import { healthScore } from '../domain/swaps/health';
import { cheapest, rankSwaps, type RankedSwap } from '../domain/swaps/rank';
import { budgetPerServe } from '../storage/profileStore';
import type { Services } from './container';

/** Resolve to the value, or to undefined if the source rejects. */
const settle = <T>(p: Promise<T>): Promise<T | undefined> => p.catch(() => undefined);

/** Ranked swaps plus the craving's own cheapest cost per serve and health score (null when unknown). */
export interface SwapsWithBaseline {
  swaps: RankedSwap[];
  cravingCost: number | null;
  cravingHealth: number | null;
}

export function swapService(s: Services) {
  async function getSwapsWithBaseline(cravingId: string, profile: Profile): Promise<SwapsWithBaseline> {
    const candidates = s.catalogue.swapsFor(cravingId);
    if (candidates.length === 0) return { swaps: [], cravingCost: null, cravingHealth: null };

    const ids = [...new Set([cravingId, ...candidates.map((c) => c.alternative.id)])];
    const [priceResults, nutritionResults] = await Promise.all([
      Promise.all(ids.map((id) => settle(Promise.resolve().then(() => s.prices.getPrices(id))))),
      Promise.all(ids.map((id) => settle(Promise.resolve().then(() => s.nutrition.getNutrition(id))))),
    ]);

    const prices: Record<string, PricePoint[]> = {};
    const nutrition: Record<string, Nutrition> = {};
    ids.forEach((id, i) => {
      const p = priceResults[i];
      if (p) prices[id] = p;
      const n = nutritionResults[i];
      if (n) nutrition[id] = n;
    });

    const swaps = rankSwaps({
      candidates,
      prices,
      nutrition,
      score: profile.score ?? null,
      budgetPerServe: budgetPerServe(profile),
    });
    const own = nutrition[cravingId];
    return {
      swaps,
      cravingCost: cheapest(prices[cravingId])?.pricePerServe ?? null,
      cravingHealth: own ? healthScore(own) : null,
    };
  }

  return {
    getSwapsWithBaseline,
    /** Ranked swaps for a craving. Never rejects because a price or nutrition source failed. */
    async getSwaps(cravingId: string, profile: Profile): Promise<RankedSwap[]> {
      return (await getSwapsWithBaseline(cravingId, profile)).swaps;
    },
  };
}
