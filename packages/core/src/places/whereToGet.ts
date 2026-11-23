import type { RankedBulk } from './bulk';
import type { BulkKind } from './tier';

/** The supermarket brands a person can name. Matching is by whole brand name in the place's own name. */
export const SUPERMARKET_BRANDS = ['Coles', 'Woolworths', 'Aldi', 'IGA', 'FoodWorks'] as const;
export type SupermarketBrand = (typeof SUPERMARKET_BRANDS)[number];

/** "FoodWorks" is also written "Food Works". The brand must not touch another letter or digit. */
const PATTERNS: Record<SupermarketBrand, RegExp> = {
  Coles: /(?<![\p{L}\p{N}])coles(?![\p{L}\p{N}])/iu,
  Woolworths: /(?<![\p{L}\p{N}])woolworths(?![\p{L}\p{N}])/iu,
  Aldi: /(?<![\p{L}\p{N}])aldi(?![\p{L}\p{N}])/iu,
  IGA: /(?<![\p{L}\p{N}])iga(?![\p{L}\p{N}])/iu,
  FoodWorks: /(?<![\p{L}\p{N}])food\s?works(?![\p{L}\p{N}])/iu,
};

/** The brand named in a place name, or null. "Pigalle" and "Nicoles" are not brands. */
export function brandOf(name: string): SupermarketBrand | null {
  return SUPERMARKET_BRANDS.find((b) => PATTERNS[b].test(name)) ?? null;
}

/** Cravings that are bought ready-made. Anything else (shop-bought food, drinks, packaged meals) maps to no eatery. */
const READY_MADE = new Set(['burger', 'hot-chips', 'pizza', 'fried-chicken', 'kebab', 'chicken-nuggets', 'bubble-tea']);
const EATERY_KINDS: readonly BulkKind[] = ['takeaway', 'cafe-restaurant'];

export function eateryKindsFor(cravingId: string): BulkKind[] {
  return READY_MADE.has(cravingId) ? [...EATERY_KINDS] : [];
}

export const EATERY_COUNT = 3;

export interface WhereToGet {
  /** At most one per brand, nearest first. */
  supermarkets: RankedBulk[];
  /** The nearest few takeaway or cafe-restaurant places, for cravings bought ready-made. */
  eateries: RankedBulk[];
}

/** `ranked` must already be nearest first (`rankBulk`). Order is kept. */
export function whereToGet(ranked: RankedBulk[], cravingId: string, eateryCount = EATERY_COUNT): WhereToGet {
  const seen = new Set<SupermarketBrand>();
  const supermarkets: RankedBulk[] = [];
  for (const r of ranked) {
    if (r.place.kind !== 'supermarket') continue;
    const brand = brandOf(r.place.name);
    if (!brand || seen.has(brand)) continue;
    seen.add(brand);
    supermarkets.push(r);
  }
  const kinds = eateryKindsFor(cravingId);
  const eateries = kinds.length === 0 ? [] : ranked.filter((r) => kinds.includes(r.place.kind)).slice(0, eateryCount);
  return { supermarkets, eateries };
}
