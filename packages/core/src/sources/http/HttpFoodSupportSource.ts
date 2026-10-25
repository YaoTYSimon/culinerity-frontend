import type { SupportPlace } from '../../domain/types';
import type { FoodSupportSource } from '../interfaces';
import { DEFAULT_BASE_URL, getJson, isSupportPlace, listOf, type FetchLike } from './httpJson';

export class HttpFoodSupportSource implements FoodSupportSource {
  constructor(
    private readonly fetchFn: FetchLike,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async findSupport(suburb?: string): Promise<SupportPlace[]> {
    const query = suburb?.trim() ? `?suburb=${encodeURIComponent(suburb.trim())}` : '';
    return listOf(await getJson(this.fetchFn, `${this.baseUrl}/support${query}`), isSupportPlace);
  }
}
