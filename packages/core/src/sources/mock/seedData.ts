import type { FoodItem, Nutrition, PricePoint, SupportPlace } from '../../domain/types';
import { ITEM_RECORDS, NUTRITION, POPULAR_CRAVING_IDS, PRICES, SUPPORT_PLACES, SWAP_RECORDS } from './data';

export interface SwapRecord {
  cravingId: string;
  alternativeId: string;
  note: string;
}

/**
 * The reference data as plain values, for seeding a database. Same invented
 * sample data as the mocks (every price and place has isSample: true); this
 * module holds no database code, so core stays platform-free.
 */
export interface SeedData {
  items: FoodItem[];
  swaps: SwapRecord[];
  /** Craving ids shown on the home screen, in display order. */
  popularCravingIds: string[];
  prices: PricePoint[];
  nutrition: Nutrition[];
  supportPlaces: SupportPlace[];
}

export const SEED_DATA: SeedData = {
  items: ITEM_RECORDS.map((r) => ({ ...r.item, keywords: [...r.item.keywords] })),
  swaps: SWAP_RECORDS.map((s) => ({ ...s })),
  popularCravingIds: [...POPULAR_CRAVING_IDS],
  prices: PRICES.map((p) => ({ ...p })),
  nutrition: NUTRITION.map((n) => ({ ...n })),
  supportPlaces: SUPPORT_PLACES.map((p) => ({ ...p })),
};
