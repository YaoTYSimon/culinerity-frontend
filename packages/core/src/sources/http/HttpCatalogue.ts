import type { FoodItem, SwapCandidate } from '../../domain/types';
import type { FoodInfo } from '../../food/types';
import type { FoodCatalogue } from '../interfaces';
import { matchesCraving } from '../matchCraving';
import { DEFAULT_BASE_URL, getJson, isFoodInfo, isFoodItem, isSwapCandidate, listOf, type FetchLike } from './httpJson';

/**
 * FoodCatalogue is synchronous, so this preloads the popular cravings, every
 * craving, each craving's swaps and all food info once at start-up
 * (`HttpCatalogue.load`) and then answers from memory, exactly like the mock.
 * Search runs locally over every craving. If the server is unreachable the
 * catalogue is simply empty; if only the extra requests fail, the popular
 * cravings still work.
 */
export class HttpCatalogue implements FoodCatalogue {
  private constructor(
    private readonly popular: FoodItem[],
    private readonly all: FoodItem[],
    private readonly swaps: Map<string, SwapCandidate[]>,
    private readonly info: Map<string, FoodInfo>,
  ) {}

  static async load(fetchFn: FetchLike, baseUrl: string = DEFAULT_BASE_URL): Promise<HttpCatalogue> {
    const [popularBody, allBody, infoBody] = await Promise.all([
      getJson(fetchFn, `${baseUrl}/cravings/popular`),
      getJson(fetchFn, `${baseUrl}/cravings/all`),
      getJson(fetchFn, `${baseUrl}/food-info`),
    ]);
    const popular = listOf(popularBody, isFoodItem);
    const seen = new Set(popular.map((c) => c.id));
    const all = [...popular, ...listOf(allBody, isFoodItem).filter((c) => !seen.has(c.id))];
    const lists = await Promise.all(
      all.map(async (c) =>
        listOf(await getJson(fetchFn, `${baseUrl}/swaps/${encodeURIComponent(c.id)}`), isSwapCandidate),
      ),
    );
    return new HttpCatalogue(
      popular,
      all,
      new Map(all.map((c, i) => [c.id, lists[i]!])),
      new Map(listOf(infoBody, isFoodInfo).map((f) => [f.itemId, f])),
    );
  }

  findCravings(text: string): FoodItem[] {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return this.all.filter((c) => matchesCraving(c, q));
  }

  swapsFor(cravingId: string): SwapCandidate[] {
    return this.swaps.get(cravingId) ?? [];
  }

  popularCravings(): FoodItem[] {
    return [...this.popular];
  }

  allCravings(): FoodItem[] {
    return [...this.all];
  }

  foodInfo(itemId: string): FoodInfo | undefined {
    const found = this.info.get(itemId);
    return found ? structuredClone(found) : undefined;
  }
}
