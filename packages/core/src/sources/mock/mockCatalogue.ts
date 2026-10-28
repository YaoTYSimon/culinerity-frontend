import type { FoodItem, SwapCandidate } from '../../domain/types';
import type { FoodInfo } from '../../food/types';
import type { FoodCatalogue } from '../interfaces';
import { ALL_CRAVING_IDS, FOOD_INFO, ITEM_RECORDS, POPULAR_CRAVING_IDS, SWAP_RECORDS } from './data';
import { matchesCraving } from '../matchCraving';

export class MockCatalogue implements FoodCatalogue {
  private readonly items = new Map<string, FoodItem>(ITEM_RECORDS.map((r) => [r.item.id, r.item]));
  private readonly info = new Map<string, FoodInfo>(FOOD_INFO.map((f) => [f.itemId, f]));

  /** Case-insensitive substring match on name and keywords, over every craving. */
  findCravings(text: string): FoodItem[] {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return this.allCravings().filter((c) => matchesCraving(c, q));
  }

  swapsFor(cravingId: string): SwapCandidate[] {
    const craving = this.items.get(cravingId);
    if (!craving) return [];
    return SWAP_RECORDS.filter((s) => s.cravingId === cravingId).flatMap((s) => {
      const alternative = this.items.get(s.alternativeId);
      return alternative ? [{ craving, alternative, note: s.note }] : [];
    });
  }

  popularCravings(): FoodItem[] {
    return this.byIds(POPULAR_CRAVING_IDS);
  }

  allCravings(): FoodItem[] {
    return this.byIds(ALL_CRAVING_IDS);
  }

  foodInfo(itemId: string): FoodInfo | undefined {
    const found = this.info.get(itemId);
    return found ? structuredClone(found) : undefined;
  }

  private byIds(ids: string[]): FoodItem[] {
    return ids.flatMap((id) => {
      const item = this.items.get(id);
      return item ? [item] : [];
    });
  }
}
