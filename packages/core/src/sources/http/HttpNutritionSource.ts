import type { Nutrition } from '../../domain/types';
import type { NutritionSource } from '../interfaces';
import { DEFAULT_BASE_URL, getJson, isNutrition, type FetchLike } from './httpJson';

export class HttpNutritionSource implements NutritionSource {
  constructor(
    private readonly fetchFn: FetchLike,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async getNutrition(itemId: string): Promise<Nutrition | null> {
    const body = await getJson(this.fetchFn, `${this.baseUrl}/nutrition/${encodeURIComponent(itemId)}`);
    return isNutrition(body) ? body : null;
  }
}
