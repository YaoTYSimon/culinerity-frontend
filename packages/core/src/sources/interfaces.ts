import type { FoodInfo } from '../food/types';
import type { FoodItem, Nutrition, PricePoint, SupportPlace, SwapCandidate } from '../domain/types';

export interface PriceSource {
  getPrices(itemId: string): Promise<PricePoint[]>;
}

export interface NutritionSource {
  getNutrition(itemId: string): Promise<Nutrition | null>;
}

export interface FoodSupportSource {
  findSupport(suburb?: string): Promise<SupportPlace[]>;
}

export interface FoodCatalogue {
  findCravings(text: string): FoodItem[];
  swapsFor(cravingId: string): SwapCandidate[];
  /** The ten popular cravings on the home screen, unchanged. */
  popularCravings(): FoodItem[];
  /** Every craving, popular ones first; search runs over these. */
  allCravings(): FoodItem[];
  /** Traditions and rule flags for an item, or undefined when none are held. */
  foodInfo(itemId: string): FoodInfo | undefined;
}
