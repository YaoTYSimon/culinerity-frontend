import type { FoodItem, SwapCandidate } from '../../domain/types';
import type { FoodCatalogue } from '../interfaces';
import { ITEM_RECORDS, POPULAR_CRAVING_IDS, SWAP_RECORDS } from './data';

export class MockCatalogue implements FoodCatalogue {
  private readonly items = new Map<string, FoodItem>(ITEM_RECORDS.map((r) => [r.item.id, r.item]));

  /** Case-insensitive substring match on name and keywords, over cravings only. */
  findCravings(text: string): FoodItem[] {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return this.popularCravings().filter(
      (c) => c.name.toLowerCase().includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q)),
    );
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
    return POPULAR_CRAVING_IDS.flatMap((id) => {
      const item = this.items.get(id);
      return item ? [item] : [];
    });
  }
}
