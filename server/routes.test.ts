import { describe, expect, it } from 'vitest';
import { SEED_DATA } from '@culinerity/core';
import {
  SqliteCatalogueRepository,
  SqliteNutritionRepository,
  SqlitePriceRepository,
  SqliteSupportRepository,
  type CatalogueRepository,
} from './repositories';
import { createApp } from './routes';
import { seededMemoryDb } from './testDb';

function realApp() {
  const db = seededMemoryDb();
  return createApp({
    catalogue: new SqliteCatalogueRepository(db),
    prices: new SqlitePriceRepository(db),
    nutrition: new SqliteNutritionRepository(db),
    support: new SqliteSupportRepository(db),
  });
}
const get = async (app: ReturnType<typeof realApp>, path: string) => {
  const res = await app.request(path);
  return { res, body: (await res.json()) as any };
};

describe('GET /api/cravings/popular', () => {
  it('returns the 10 popular FoodItems as JSON', async () => {
    const { res, body } = await get(realApp(), '/api/cravings/popular');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(body).toHaveLength(10);
    expect(body[0]).toEqual({ id: 'burger', name: 'Takeaway burger', category: 'fast food', keywords: expect.any(Array) });
  });
});

describe('GET /api/cravings?q=', () => {
  it('finds matches', async () => {
    const { res, body } = await get(realApp(), '/api/cravings?q=boba');
    expect(res.status).toBe(200);
    expect(body.map((c: { id: string }) => c.id)).toEqual(['bubble-tea']);
  });
  it('returns [] for a blank query', async () => {
    const { res, body } = await get(realApp(), '/api/cravings?q=%20%20');
    expect([res.status, body]).toEqual([200, []]);
  });
  it('returns 400 {error} when q is missing, repeated, or too long', async () => {
    for (const path of ['/api/cravings', '/api/cravings?q=a&q=b', `/api/cravings?q=${'a'.repeat(101)}`]) {
      const { res, body } = await get(realApp(), path);
      expect(res.status).toBe(400);
      expect(Object.keys(body)).toEqual(['error']);
    }
  });
  it('accepts exactly 100 characters', async () => {
    const { res } = await get(realApp(), `/api/cravings?q=${'a'.repeat(100)}`);
    expect(res.status).toBe(200);
  });
  it('treats an injection-style query as plain text', async () => {
    const app = realApp();
    const { res, body } = await get(app, `/api/cravings?q=${encodeURIComponent("'; DROP TABLE items;--")}`);
    expect([res.status, body]).toEqual([200, []]);
    expect((await get(app, '/api/cravings/popular')).body).toHaveLength(10);
  });
});

describe('GET /api/cravings/all', () => {
  it('returns the popular ten first, then the new cravings', async () => {
    const { res, body } = await get(realApp(), '/api/cravings/all');
    expect(res.status).toBe(200);
    expect(body.map((c: { id: string }) => c.id)).toEqual(SEED_DATA.allCravingIds);
    expect(body.slice(0, 10).map((c: { id: string }) => c.id)).toEqual(SEED_DATA.popularCravingIds);
  });
  it('lets search reach the new cravings but not alternatives', async () => {
    const app = realApp();
    expect((await get(app, '/api/cravings?q=butter%20chicken')).body.map((c: { id: string }) => c.id)).toContain('butter-chicken-jar-sauce');
    expect((await get(app, '/api/cravings?q=smash')).body).toEqual([]);
  });
});

describe('GET /api/food-info', () => {
  it('returns FoodInfo for one item', async () => {
    const { res, body } = await get(realApp(), '/api/food-info/smash-burger');
    expect(res.status).toBe(200);
    expect(body).toEqual(SEED_DATA.foodInfo.find((f) => f.itemId === 'smash-burger'));
    expect(body.flags.beef).toBe('yes');
  });
  it('returns 404 {error} for an unknown item and 400 for a bad id', async () => {
    const app = realApp();
    expect(await get(app, '/api/food-info/nope').then((r) => [r.res.status, r.body])).toEqual([404, { error: 'No food info for that item.' }]);
    expect((await get(app, `/api/food-info/${'a'.repeat(65)}`)).res.status).toBe(400);
  });
  it('lists every FoodInfo', async () => {
    const { res, body } = await get(realApp(), '/api/food-info');
    expect(res.status).toBe(200);
    expect(body).toHaveLength(SEED_DATA.foodInfo.length);
  });
});

describe('no profile data reaches the server', () => {
  it('accepts no body on any route: POST, PUT and a profile-shaped body are all 404', async () => {
    const app = realApp();
    const profile = JSON.stringify({ foodProfile: { traditions: ['greek'], rules: ['halal'], allergies: ['peanuts'], occasions: [], dismissed: [] } });
    for (const path of ['/api/cravings', '/api/cravings/all', '/api/food-info', '/api/food-info/smash-burger', '/api/swaps/burger', '/api/profile']) {
      for (const method of ['POST', 'PUT', 'PATCH']) {
        const res = await app.request(path, { method, body: profile, headers: { 'content-type': 'application/json' } });
        expect(res.status, `${method} ${path}`).toBe(404);
      }
    }
  });
});

describe('a profile-shaped body changes nothing on the read routes', () => {
  it('GET with a food profile body or header returns exactly what GET without one returns', async () => {
    const app = realApp();
    const profile = JSON.stringify({ foodProfile: { traditions: ['greek'], rules: ['halal'], allergies: ['peanuts'], occasions: ['diwali'], dismissed: [] }, culturalMeals: [{ id: 'm', tradition: 'greek', at: '2026-10-27T01:00:00.000Z', dish: 'Zzquince dish' }] });
    for (const path of ['/api/cravings/all', '/api/cravings/popular', '/api/food-info', '/api/food-info/smash-burger', '/api/swaps/burger']) {
      const plain = await app.request(path);
      const withBody = await app.request(path, { headers: { 'content-type': 'application/json', 'x-profile': profile } });
      expect(withBody.status, path).toBe(plain.status);
      expect(await withBody.text(), path).toBe(await plain.text());
    }
  });
});

describe('GET /api/swaps/:cravingId', () => {
  it('returns SwapCandidates', async () => {
    const { res, body } = await get(realApp(), '/api/swaps/burger');
    expect(res.status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(2);
    expect(body[0]).toEqual({
      craving: expect.objectContaining({ id: 'burger' }),
      alternative: expect.objectContaining({ id: expect.any(String), keywords: expect.any(Array) }),
      note: expect.any(String),
    });
  });
  it('returns 200 [] for an unknown id', async () => {
    const { res, body } = await get(realApp(), '/api/swaps/nope');
    expect([res.status, body]).toEqual([200, []]);
  });
  it('returns 400 for an id with unexpected characters or length', async () => {
    for (const id of ["x'%20OR%201=1", 'a'.repeat(65)]) {
      expect((await get(realApp(), `/api/swaps/${id}`)).res.status).toBe(400);
    }
  });
});

describe('GET /api/prices/:itemId and /api/nutrition/:itemId', () => {
  it('returns PricePoints', async () => {
    const { res, body } = await get(realApp(), '/api/prices/burger');
    expect(res.status).toBe(200);
    expect(body).toHaveLength(3);
    expect(body[0]).toEqual({
      itemId: 'burger',
      store: expect.any(String),
      pricePerServe: expect.any(Number),
      unitLabel: '1 burger',
      observedAt: expect.any(String),
      isSample: true,
    });
  });
  it('returns [] for unknown prices and null for unknown nutrition, both 200', async () => {
    const app = realApp();
    expect(await get(app, '/api/prices/nope').then((r) => [r.res.status, r.body])).toEqual([200, []]);
    expect(await get(app, '/api/nutrition/nope').then((r) => [r.res.status, r.body])).toEqual([200, null]);
  });
  it('returns Nutrition', async () => {
    const { res, body } = await get(realApp(), '/api/nutrition/burger');
    expect(res.status).toBe(200);
    expect(body).toEqual(SEED_DATA.nutrition.find((n) => n.itemId === 'burger'));
  });
});

describe('GET /api/support', () => {
  it('returns SupportPlaces, suburb first', async () => {
    const { res, body } = await get(realApp(), '/api/support?suburb=Clayton');
    expect(res.status).toBe(200);
    expect(body).toHaveLength(SEED_DATA.supportPlaces.length);
    expect(body[0].suburb).toBe('Clayton');
    expect(body[0]).toEqual(expect.objectContaining({ isSample: true, kind: 'pantry' }));
  });
  it('works without a suburb and rejects an overlong or repeated one', async () => {
    const app = realApp();
    expect((await get(app, '/api/support')).res.status).toBe(200);
    expect((await get(app, `/api/support?suburb=${'a'.repeat(81)}`)).res.status).toBe(400);
    expect((await get(app, '/api/support?suburb=a&suburb=b')).res.status).toBe(400);
  });
});

describe('errors', () => {
  const boom: CatalogueRepository = {
    findCravings: async () => {
      throw new Error('secret db path /var/x leaked at server/repositories.ts:12');
    },
    popularCravings: () => {
      throw new Error('sync boom');
    },
    swapsFor: async () => [],
    allCravings: () => {
      throw new Error('sync boom');
    },
    foodInfo: async () => {
      throw new Error('secret db path /var/x leaked at server/repositories.ts:12');
    },
    allFoodInfo: () => {
      throw new Error('sync boom');
    },
  };
  const app = () => {
    const db = seededMemoryDb();
    return createApp({
      catalogue: boom,
      prices: new SqlitePriceRepository(db),
      nutrition: new SqliteNutritionRepository(db),
      support: new SqliteSupportRepository(db),
    });
  };

  it('returns {error} with no stack or internal message when a repository throws', async () => {
    for (const path of ['/api/cravings?q=x', '/api/cravings/popular', '/api/cravings/all', '/api/food-info/smash-burger', '/api/food-info']) {
      const res = await app().request(path);
      const text = await res.text();
      expect(res.status).toBe(500);
      expect(JSON.parse(text)).toEqual({ error: 'Internal server error' });
      expect(text).not.toMatch(/secret|leaked|\.ts|at /);
    }
  });
  it('returns a JSON 404 for unknown routes and 405-safe behaviour for other methods', async () => {
    const res = await realApp().request('/api/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
    const post = await realApp().request('/api/cravings/popular', { method: 'POST' });
    expect(post.status).toBe(404);
  });
  it('sends nosniff and no CORS headers', async () => {
    const res = await realApp().request('/api/cravings/popular');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
