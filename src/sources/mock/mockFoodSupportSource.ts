import type { SupportPlace } from '../../domain/types';
import type { FoodSupportSource } from '../interfaces';
import { SUPPORT_PLACES } from './data';

export class MockFoodSupportSource implements FoodSupportSource {
  /** Places in the given suburb come first (case-insensitive); others follow. */
  async findSupport(suburb?: string): Promise<SupportPlace[]> {
    const wanted = suburb?.trim().toLowerCase();
    const places = SUPPORT_PLACES.map((p) => ({ ...p }));
    if (!wanted) return places;
    const isMatch = (p: SupportPlace) => p.suburb.toLowerCase() === wanted;
    return [...places.filter(isMatch), ...places.filter((p) => !isMatch(p))];
  }
}
