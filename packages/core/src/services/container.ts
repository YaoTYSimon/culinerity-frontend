import type { FoodCatalogue, FoodSupportSource, NutritionSource, PriceSource } from '../sources/interfaces';
import { MockCatalogue } from '../sources/mock/mockCatalogue';
import { MockFoodSupportSource } from '../sources/mock/mockFoodSupportSource';
import { MockNutritionSource } from '../sources/mock/mockNutritionSource';
import { MockPriceSource } from '../sources/mock/mockPriceSource';
import type { ProfileStore } from '../storage/profileStore';

export interface Services {
  catalogue: FoodCatalogue;
  prices: PriceSource;
  nutrition: NutritionSource;
  support: FoodSupportSource;
  profiles: ProfileStore;
}

/** Platform-free wiring: the app injects its own ProfileStore. */
export function createCoreServices(profiles: ProfileStore): Services {
  return {
    catalogue: new MockCatalogue(),
    prices: new MockPriceSource(),
    nutrition: new MockNutritionSource(),
    support: new MockFoodSupportSource(),
    profiles,
  };
}
