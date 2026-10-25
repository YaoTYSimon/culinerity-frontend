import type { PricePoint } from '../../domain/types';
import type { PriceSource } from '../interfaces';
import { DEFAULT_BASE_URL, getJson, isPricePoint, listOf, type FetchLike } from './httpJson';

export class HttpPriceSource implements PriceSource {
  constructor(
    private readonly fetchFn: FetchLike,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async getPrices(itemId: string): Promise<PricePoint[]> {
    return listOf(await getJson(this.fetchFn, `${this.baseUrl}/prices/${encodeURIComponent(itemId)}`), isPricePoint);
  }
}
