import { describe, expect, it } from 'vitest';
import type { PriceSource } from '../sources/interfaces';
import { createServices, type Services } from './container';
import { swapService } from './swapService';

const CRAVING = 'chocolate';

describe('swapService.getSwaps', () => {
  it('orders cheapest-first for a low score', async () => {
    const swaps = await swapService(createServices()).getSwaps(CRAVING, { score: 10 });
    expect(swaps.length).toBeGreaterThan(0);
    const costs = swaps.map((s) => s.cost as number);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
  });

  it('orders healthiest-first for a high score', async () => {
    const swaps = await swapService(createServices()).getSwaps(CRAVING, { score: 90 });
    expect(swaps.length).toBeGreaterThan(0);
    const health = swaps.map((s) => s.health);
    expect(health).toEqual([...health].sort((a, b) => b - a));
  });

  it('resolves to [] for an unknown craving', async () => {
    expect(await swapService(createServices()).getSwaps('nope', { score: 50 })).toEqual([]);
  });

  it('gives cost null and does not throw when the price source rejects', async () => {
    const failing: PriceSource = { getPrices: () => Promise.reject(new Error('down')) };
    const s: Services = { ...createServices(), prices: failing };
    const swaps = await swapService(s).getSwaps(CRAVING, { score: 50 });
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.every((x) => x.cost === null)).toBe(true);
  });
});
