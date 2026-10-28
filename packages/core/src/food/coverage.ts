import type { FoodItem } from '../domain/types';
import type { FoodCatalogue } from '../sources/interfaces';
import type { FoodInfo, FoodProfile } from './types';

/**
 * Cultural catalogue items (those tagged with traditions) show only for a person who chose at least one of
 * those traditions. Original items (no traditions) show for everyone, so nothing changes until someone opts in.
 */
export function shownForTraditions(info: FoodInfo | undefined, food: FoodProfile | undefined): boolean {
  const tagged = info?.traditions ?? [];
  if (tagged.length === 0) return true;
  const chosen = new Set((food?.traditions ?? []).map((t) => t.toLowerCase()));
  return tagged.some((t) => chosen.has(t.toLowerCase()));
}

/** Lower-case ids of every tradition that tags at least one craving or swap in the catalogue. */
export function traditionsWithFoods(catalogue: FoodCatalogue): Set<string> {
  const have = new Set<string>();
  const add = (itemId: string) => catalogue.foodInfo(itemId)?.traditions.forEach((t) => have.add(t.toLowerCase()));
  for (const craving of catalogue.allCravings()) {
    add(craving.id);
    catalogue.swapsFor(craving.id).forEach((s) => add(s.alternative.id));
  }
  return have;
}

/** Cravings tagged with one of the person's traditions, beyond the popular ones, in catalogue order. */
export function cravingsForTraditions(catalogue: FoodCatalogue, traditions: string[], limit: number): FoodItem[] {
  const chosen = new Set(traditions.map((t) => t.toLowerCase()));
  if (chosen.size === 0) return [];
  const popular = new Set(catalogue.popularCravings().map((c) => c.id));
  return catalogue
    .allCravings()
    .filter((c) => !popular.has(c.id) && catalogue.foodInfo(c.id)?.traditions.some((t) => chosen.has(t.toLowerCase())))
    .slice(0, limit);
}
