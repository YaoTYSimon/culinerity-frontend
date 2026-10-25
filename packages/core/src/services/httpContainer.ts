import { HttpCatalogue } from '../sources/http/HttpCatalogue';
import { HttpFoodSupportSource } from '../sources/http/HttpFoodSupportSource';
import { HttpNutritionSource } from '../sources/http/HttpNutritionSource';
import { HttpPriceSource } from '../sources/http/HttpPriceSource';
import { DEFAULT_BASE_URL, type FetchLike } from '../sources/http/httpJson';
import type { ProfileStore } from '../storage/profileStore';
import type { Services } from './container';

/** Wiring for the optional backend: reference data over HTTP, profile still on the device. */
export async function createHttpServices(
  profiles: ProfileStore,
  fetchFn: FetchLike,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Services> {
  return {
    catalogue: await HttpCatalogue.load(fetchFn, baseUrl),
    prices: new HttpPriceSource(fetchFn, baseUrl),
    nutrition: new HttpNutritionSource(fetchFn, baseUrl),
    support: new HttpFoodSupportSource(fetchFn, baseUrl),
    profiles,
  };
}
