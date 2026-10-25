import type { Nutrition } from '../../domain/types';
import type { NutritionSource } from '../interfaces';
import { NUTRITION } from './data';

export class MockNutritionSource implements NutritionSource {
  async getNutrition(itemId: string): Promise<Nutrition | null> {
    const found = NUTRITION.find((n) => n.itemId === itemId);
    return found ? { ...found } : null;
  }
}
