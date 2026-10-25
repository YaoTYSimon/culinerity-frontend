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
  popularCravings(): FoodItem[];
}
