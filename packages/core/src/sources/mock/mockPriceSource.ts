import type { PricePoint } from '../../domain/types';
import type { PriceSource } from '../interfaces';
import { PRICES } from './data';

export class MockPriceSource implements PriceSource {
  async getPrices(itemId: string): Promise<PricePoint[]> {
    return PRICES.filter((p) => p.itemId === itemId).map((p) => ({ ...p }));
  }
}
