import { Hono, type Context } from 'hono';
import type { Repositories } from './repositories';

export const MAX_QUERY_LENGTH = 100;
export const MAX_SUBURB_LENGTH = 80;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface AppOptions {
  /** Called with a short, non-sensitive description of an unexpected failure. */
  log?: (message: string) => void;
}

const bad = (c: Context, message: string) => c.json({ error: message }, 400);

/** The only value of a single-valued query parameter, or undefined if absent or repeated. */
function single(c: Context, name: string): string | undefined {
  const values = c.req.queries(name);
  return values && values.length === 1 ? values[0] : undefined;
}

/** HTTP routes. They know only the repository interfaces. JSON only; errors are `{error}`. */
export function createApp(repos: Repositories, options: AppOptions = {}): Hono {
  const app = new Hono();

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
  });

  app.get('/api/cravings/popular', async (c) => c.json(await repos.catalogue.popularCravings()));

  app.get('/api/cravings', async (c) => {
    const q = single(c, 'q');
    if (q === undefined) return bad(c, 'Query parameter q is required, once.');
    if (q.length > MAX_QUERY_LENGTH) return bad(c, `Query parameter q must be at most ${MAX_QUERY_LENGTH} characters.`);
    return c.json(await repos.catalogue.findCravings(q));
  });

  app.get('/api/swaps/:cravingId', async (c) => {
    const id = c.req.param('cravingId');
    if (!ID_PATTERN.test(id)) return bad(c, 'Invalid craving id.');
    return c.json(await repos.catalogue.swapsFor(id));
  });

  app.get('/api/prices/:itemId', async (c) => {
    const id = c.req.param('itemId');
    if (!ID_PATTERN.test(id)) return bad(c, 'Invalid item id.');
    return c.json(await repos.prices.getPrices(id));
  });

  app.get('/api/nutrition/:itemId', async (c) => {
    const id = c.req.param('itemId');
    if (!ID_PATTERN.test(id)) return bad(c, 'Invalid item id.');
    return c.json(await repos.nutrition.getNutrition(id));
  });

  app.get('/api/support', async (c) => {
    const all = c.req.queries('suburb');
    if (all && all.length !== 1) return bad(c, 'Query parameter suburb may be given once.');
    const suburb = all?.[0];
    if (suburb !== undefined && suburb.length > MAX_SUBURB_LENGTH) {
      return bad(c, `Query parameter suburb must be at most ${MAX_SUBURB_LENGTH} characters.`);
    }
    return c.json(await repos.support.findSupport(suburb));
  });

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  app.onError((err, c) => {
    options.log?.(`request failed (${err instanceof Error ? err.name : 'unknown error'})`);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
