import type { RankedBulk } from './bulk';
import { haversineMetres, type LatLng } from './distance';
import type { BulkKind } from './tier';
import type { Place } from './types';

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

/**
 * Words that mark a venue as plausibly serving the craving, matched at the start of a word in the venue's name (and,
 * for a checked venue, in its menu note). Conservative: a place with none of them is left out.
 */
const DISH_WORDS: Record<string, readonly string[]> = {
  'chicken-nuggets': ['nugget', 'fish', 'chip', 'seafood', 'chicken'],
  'hot-chips': ['chip', 'fish', 'seafood', 'chicken'],
  'fried-chicken': ['chicken', 'wings', 'kfc', 'popeyes'],
  pizza: ['pizza', 'pizzeria'],
  kebab: ['kebab', 'kebap', 'souvlaki', 'doner', 'gyro', 'shawarma', 'grill'],
  burger: ['burger'],
  'bubble-tea': ['tea', 'boba', 'bubble'],
};

const wordStart = (words: readonly string[]) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.join('|')})`, 'iu');
const DISH_PATTERN = new Map(Object.entries(DISH_WORDS).map(([id, w]) => [id, wordStart(w)]));

/** The dish itself, as a checked venue's menu note names it. A venue that lists it ranks first. */
const NOTE_WORDS: Record<string, readonly string[]> = {
  'chicken-nuggets': ['nugget'],
  'hot-chips': ['chips'],
  'fried-chicken': ['fried chicken', 'chicken wings', 'wings'],
  pizza: ['pizza'],
  kebab: ['kebab', 'souvlaki', 'doner', 'gyro', 'shawarma'],
  burger: ['burger'],
  'bubble-tea': ['bubble tea', 'boba'],
};
const NOTE_PATTERN = new Map(Object.entries(NOTE_WORDS).map(([id, w]) => [id, wordStart(w)]));
const listsDish = (cravingId: string, note: string | undefined) => NOTE_PATTERN.get(cravingId)?.test(note ?? '') ?? false;

const servesCraving = (cravingId: string, text: string) => DISH_PATTERN.get(cravingId)?.test(text) ?? false;

/** A checked venue further than this is not "where to get it": it would only add a far-off name above the near ones. */
export const CHECKED_MAX_M = 5000;

export interface CheckedEatery {
  place: Place;
  distanceM: number;
}

export interface WhereToGet {
  /** At most one per brand, nearest first. */
  supermarkets: RankedBulk[];
  /** The nearest few not-checked takeaway or cafe-restaurant places whose name fits the craving. */
  eateries: RankedBulk[];
  /** Checked venues whose menu note or name fits the craving, nearest first. Shown before `eateries`. */
  checkedEateries: CheckedEatery[];
}

/** `ranked` must already be nearest first (`rankBulk`). Order is kept. */
export function whereToGet(
  ranked: RankedBulk[],
  cravingId: string,
  eateryCount = EATERY_COUNT,
  checkedSource?: { checked: readonly Place[]; origin?: LatLng },
): WhereToGet {
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
  const eateries =
    kinds.length === 0
      ? []
      : ranked.filter((r) => kinds.includes(r.place.kind) && servesCraving(cravingId, r.place.name)).slice(0, eateryCount);
  const origin = checkedSource?.origin;
  const checkedEateries: CheckedEatery[] =
    kinds.length === 0 || !origin
      ? []
      : (checkedSource?.checked ?? [])
          .filter((p) => (p.kind as string) === 'takeaway' || (p.kind as string) === 'cafe-restaurant')
          .map((place) => ({ place, listed: listsDish(cravingId, place.note), distanceM: haversineMetres(origin, place) }))
          .filter((c) => c.distanceM <= CHECKED_MAX_M)
          .filter((c) => c.listed || servesCraving(cravingId, c.place.name))
          .sort((a, b) => Number(b.listed) - Number(a.listed) || a.distanceM - b.distanceM)
          .map(({ place, distanceM }) => ({ place, distanceM }))
          .slice(0, eateryCount);
  return { supermarkets, eateries, checkedEateries };
}
