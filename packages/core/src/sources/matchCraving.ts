import type { FoodItem } from '../domain/types';

/** True when the lower-case, trimmed query is in the item's name or one of its keywords. */
export function matchesCraving(item: FoodItem, query: string): boolean {
  return item.name.toLowerCase().includes(query) || item.keywords.some((k) => k.toLowerCase().includes(query));
}
