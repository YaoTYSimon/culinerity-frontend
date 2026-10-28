import { describe, expect, it, vi } from 'vitest';
import { HttpCatalogue } from './HttpCatalogue';
import { HttpFoodSupportSource } from './HttpFoodSupportSource';
import { HttpNutritionSource } from './HttpNutritionSource';
import { HttpPriceSource } from './HttpPriceSource';
import { isFoodInfo, type FetchLike } from './httpJson';
import { SEED_DATA } from '../mock/seedData';

const ok = (body: unknown): FetchLike => async () => ({ ok: true, status: 200, json: async () => body });
const status500: FetchLike = async () => ({ ok: false, status: 500, json: async () => ({ error: 'x' }) });
const rejected: FetchLike = async () => {
  throw new TypeError('network down');
};
const malformed: FetchLike = async () => ({
  ok: true,
  status: 200,
  json: async () => {
    throw new SyntaxError('Unexpected token');
  },
});
const failures: Array<[string, FetchLike]> = [
  ['a rejected fetch', rejected],
  ['a 500 status', status500],
  ['malformed JSON', malformed],
  ['the wrong JSON shape', ok({ not: 'a list' })],
];

const price = SEED_DATA.prices[0]!;
const nutrition = SEED_DATA.nutrition[0]!;
const place = SEED_DATA.supportPlaces[0]!;

describe('HttpPriceSource', () => {
  it('requests the item and returns parsed prices on 200', async () => {
    const fetchFn = vi.fn(ok([price]));
    expect(await new HttpPriceSource(fetchFn).getPrices('burger')).toEqual([price]);
    expect(fetchFn.mock.calls[0]![0]).toBe('/api/prices/burger');
  });
  it('encodes the id into the path', async () => {
    const fetchFn = vi.fn(ok([]));
    await new HttpPriceSource(fetchFn).getPrices('a/b?c');
    expect(fetchFn.mock.calls[0]![0]).toBe('/api/prices/a%2Fb%3Fc');
  });
  it.each(failures)('resolves [] on %s', async (_n, f) => {
    expect(await new HttpPriceSource(f).getPrices('burger')).toEqual([]);
  });
});

describe('HttpNutritionSource', () => {
  it('returns parsed nutrition on 200', async () => {
    expect(await new HttpNutritionSource(ok(nutrition)).getNutrition('burger')).toEqual(nutrition);
  });
  it('returns null when the server says null', async () => {
    expect(await new HttpNutritionSource(ok(null)).getNutrition('nope')).toBeNull();
  });
  it.each(failures)('resolves null on %s', async (_n, f) => {
    expect(await new HttpNutritionSource(f).getNutrition('burger')).toBeNull();
  });
});

describe('HttpFoodSupportSource', () => {
  it('returns parsed places and sends the suburb', async () => {
    const fetchFn = vi.fn(ok([place]));
    expect(await new HttpFoodSupportSource(fetchFn).findSupport('Clayton')).toEqual([place]);
    expect(fetchFn.mock.calls[0]![0]).toBe('/api/support?suburb=Clayton');
  });
  it('omits the suburb when none is given', async () => {
    const fetchFn = vi.fn(ok([]));
    await new HttpFoodSupportSource(fetchFn).findSupport();
    expect(fetchFn.mock.calls[0]![0]).toBe('/api/support');
  });
  it.each(failures)('resolves [] on %s', async (_n, f) => {
    expect(await new HttpFoodSupportSource(f).findSupport('Clayton')).toEqual([]);
  });
});

describe('HttpCatalogue', () => {
  const burger = SEED_DATA.items.find((i) => i.id === 'burger')!;
  const smash = SEED_DATA.items.find((i) => i.id === 'smash-burger')!;
  const swap = { craving: burger, alternative: smash, note: 'n' };
  const routed: FetchLike = async (url) => {
    const body = url.endsWith('/api/cravings/popular') ? [burger] : url.endsWith('/api/swaps/burger') ? [swap] : [];
    return { ok: true, status: 200, json: async () => body };
  };

  it('preloads popular cravings and swaps, then serves synchronously', async () => {
    const c = await HttpCatalogue.load(routed);
    expect(c.popularCravings()).toEqual([burger]);
    expect(c.swapsFor('burger')).toEqual([swap]);
    expect(c.swapsFor('unknown')).toEqual([]);
  });
  it('matches cravings by name or keyword, case-insensitively; blank gives []', async () => {
    const c = await HttpCatalogue.load(routed);
    expect(c.findCravings('  BIG mac ')).toEqual([burger]);
    expect(c.findCravings('Takeaway')).toEqual([burger]);
    expect(c.findCravings('   ')).toEqual([]);
    expect(c.findCravings('zzz')).toEqual([]);
  });
  it('preloads every craving and food info, searches all cravings and serves foodInfo', async () => {
    const butter = SEED_DATA.items.find((i) => i.id === 'butter-chicken-jar-sauce')!;
    const info = SEED_DATA.foodInfo.find((f) => f.itemId === 'smash-burger')!;
    const f: FetchLike = async (url) => {
      const body = url.endsWith('/api/cravings/popular')
        ? [burger]
        : url.endsWith('/api/cravings/all')
          ? [burger, butter]
          : url.endsWith('/api/food-info')
            ? [info]
            : url.endsWith('/api/swaps/burger')
              ? [swap]
              : [];
      return { ok: true, status: 200, json: async () => body };
    };
    const c = await HttpCatalogue.load(f);
    expect(c.popularCravings()).toEqual([burger]);
    expect(c.allCravings()).toEqual([burger, butter]);
    expect(c.findCravings('butter chicken')).toEqual([butter]);
    expect(c.foodInfo('smash-burger')).toEqual(info);
    expect(c.foodInfo('nope')).toBeUndefined();
  });
  it('keeps popular cravings when the all-cravings and food-info requests fail', async () => {
    const f: FetchLike = async (url) =>
      url.endsWith('/api/cravings/all') || url.endsWith('/api/food-info') ? rejected(url) : routed(url);
    const c = await HttpCatalogue.load(f);
    expect(c.allCravings()).toEqual([burger]);
    expect(c.foodInfo('smash-burger')).toBeUndefined();
  });
  it('when the popular request fails but all succeeds, popular stays empty and search still works', async () => {
    const f: FetchLike = async (url) => (url.endsWith('/api/cravings/popular') ? rejected(url) : url.endsWith('/api/cravings/all') ? ok([burger])(url) : routed(url));
    const c = await HttpCatalogue.load(f);
    expect(c.popularCravings()).toEqual([]);
    expect(c.allCravings()).toEqual([burger]);
    expect(c.findCravings('burger')).toEqual([burger]);
  });
  it('isFoodInfo rejects non-string allergen entries and non-string traditions', () => {
    const info = SEED_DATA.foodInfo[0]!;
    expect(isFoodInfo(info)).toBe(true);
    expect(isFoodInfo({ ...info, flags: { ...info.flags, allergens: [1] } })).toBe(false);
    expect(isFoodInfo({ ...info, flags: { ...info.flags, allergens: ['wheat', null] } })).toBe(false);
    expect(isFoodInfo({ ...info, traditions: [3] })).toBe(false);
  });
  it('isFoodInfo rejects an allergen id outside the known list', () => {
    const info = SEED_DATA.foodInfo[0]!;
    for (const bad of ['kiwi', 'constructor', '__proto__']) {
      expect(isFoodInfo({ ...info, flags: { ...info.flags, allergens: ['wheat', bad] } }), bad).toBe(false);
    }
    expect(isFoodInfo({ ...info, flags: { ...info.flags, allergens: ['wheat', 'pine-nut'] } })).toBe(true);
  });
  it.each(failures)('is empty on %s', async (_n, f) => {
    const c = await HttpCatalogue.load(f);
    expect(c.allCravings()).toEqual([]);
    expect(c.popularCravings()).toEqual([]);
    expect(c.swapsFor('burger')).toEqual([]);
    expect(c.findCravings('burger')).toEqual([]);
  });
  it('keeps popular cravings when one swap request fails', async () => {
    const partial: FetchLike = async (url) =>
      url.includes('/api/swaps/') ? rejected(url) : ok([burger])(url);
    const c = await HttpCatalogue.load(partial);
    expect(c.popularCravings()).toEqual([burger]);
    expect(c.swapsFor('burger')).toEqual([]);
  });
});
