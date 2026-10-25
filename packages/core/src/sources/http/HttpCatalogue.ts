import type { FoodItem, SwapCandidate } from '../../domain/types';
import type { FoodCatalogue } from '../interfaces';
import { DEFAULT_BASE_URL, getJson, isFoodItem, isSwapCandidate, listOf, type FetchLike } from './httpJson';

/**
 * FoodCatalogue is synchronous, so this preloads the popular cravings and each
 * craving's swaps once at start-up (`HttpCatalogue.load`) and then answers from
 * memory, exactly like the mock. Search runs locally over the preloaded
 * cravings. If the server is unreachable the catalogue is simply empty.
 */
export class HttpCatalogue implements FoodCatalogue {
  private constructor(
    private readonly popular: FoodItem[],
    private readonly swaps: Map<string, SwapCandidate[]>,
  ) {}

  static async load(fetchFn: FetchLike, baseUrl: string = DEFAULT_BASE_URL): Promise<HttpCatalogue> {
    const popular = listOf(await getJson(fetchFn, `${baseUrl}/cravings/popular`), isFoodItem);
    const lists = await Promise.all(
      popular.map(async (c) =>
        listOf(await getJson(fetchFn, `${baseUrl}/swaps/${encodeURIComponent(c.id)}`), isSwapCandidate),
      ),
    );
    return new HttpCatalogue(popular, new Map(popular.map((c, i) => [c.id, lists[i]!])));
  }

  findCravings(text: string): FoodItem[] {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return this.popular.filter(
      (c) => c.name.toLowerCase().includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }

  swapsFor(cravingId: string): SwapCandidate[] {
    return this.swaps.get(cravingId) ?? [];
  }

  popularCravings(): FoodItem[] {
    return [...this.popular];
  }
}
