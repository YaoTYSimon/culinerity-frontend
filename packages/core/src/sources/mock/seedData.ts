import type { FoodItem, Nutrition, PricePoint, SupportPlace } from '../../domain/types';
import type { CulturalNutrition, FoodInfo } from '../../food/types';
import { ALL_CRAVING_IDS, FOOD_INFO, ITEM_RECORDS, NUTRITION, POPULAR_CRAVING_IDS, PRICES, SUPPORT_PLACES, SWAP_RECORDS } from './data';

export interface SwapRecord {
  cravingId: string;
  alternativeId: string;
  note: string;
}

/**
 * The reference data as plain values, for seeding a database. Same invented
 * sample data as the mocks (every price and place has isSample: true; cultural
 * nutrition is computed from sourced food-table rows); this
 * module holds no database code, so core stays platform-free.
 */
export interface SeedData {
  items: FoodItem[];
  swaps: SwapRecord[];
  /** Craving ids shown on the home screen, in display order. */
  popularCravingIds: string[];
  /** Every craving id: the popular ones first, then the cultural catalogue's. */
  allCravingIds: string[];
  /** Traditions and rule flags per item. */
  foodInfo: FoodInfo[];
  prices: PricePoint[];
  nutrition: CulturalNutrition[];
  supportPlaces: SupportPlace[];
}

export const SEED_DATA: SeedData = {
  items: ITEM_RECORDS.map((r) => ({ ...r.item, keywords: [...r.item.keywords] })),
  swaps: SWAP_RECORDS.map((s) => ({ ...s })),
  popularCravingIds: [...POPULAR_CRAVING_IDS],
  allCravingIds: [...ALL_CRAVING_IDS],
  foodInfo: structuredClone(FOOD_INFO),
  prices: PRICES.map((p) => ({ ...p })),
  nutrition: NUTRITION.map((n) => ({ ...n })),
  supportPlaces: SUPPORT_PLACES.map((p) => ({ ...p })),
};
