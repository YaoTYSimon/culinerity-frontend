import { describe, expect, it, vi } from 'vitest';
import { loadServices } from './container';

describe('loadServices', () => {
  it('uses the mocks (never fetch) unless the backend flag is on', async () => {
    const fetchFn = vi.fn();
    const services = await loadServices(false, fetchFn);
    expect(services.catalogue.popularCravings()).toHaveLength(10);
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('uses the HTTP sources when the flag is on', async () => {
    const fetchFn = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => (url.endsWith('/popular') ? [{ id: 'x', name: 'X', category: 'c', keywords: [] }] : []),
    }));
    const services = await loadServices(true, fetchFn);
    expect(services.catalogue.popularCravings().map((c) => c.id)).toEqual(['x']);
    expect(fetchFn).toHaveBeenCalledWith('/api/cravings/popular', expect.anything());
  });
  it('degrades to empty results (no throw) when the server is down', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('connection refused');
    });
    const services = await loadServices(true, down);
    expect(services.catalogue.popularCravings()).toEqual([]);
    expect(await services.prices.getPrices('burger')).toEqual([]);
    expect(await services.nutrition.getNutrition('burger')).toBeNull();
    expect(await services.support.findSupport('Clayton')).toEqual([]);
  });
});
