import type { PricePoint } from '@culinerity/core';

/** Source of live prices. Nothing in the app calls a real one without the user's go-ahead. */
export interface ScraperClient {
  fetchPrices(itemId: string): Promise<PricePoint[]>;
}

/** Default client: deterministic canned prices, no network. */
export class MockScraperClient implements ScraperClient {
  async fetchPrices(itemId: string): Promise<PricePoint[]> {
    return [
      { itemId, store: 'Coles', pricePerServe: 4.2, unitLabel: '1 serve', observedAt: '2026-10-20', isSample: false },
      { itemId, store: 'Aldi', pricePerServe: 3.6, unitLabel: '1 serve', observedAt: '2026-10-20', isSample: false },
    ];
  }
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const STORES: ReadonlySet<string> = new Set<PricePoint['store']>(['Coles', 'Woolworths', 'Aldi', 'IGA', 'Market']);

/**
 * Apify-backed client. The ONLY place APIFY_TOKEN is read. It is disabled (and
 * makes no network call) unless both APIFY_TOKEN and APIFY_ACTOR_ID are set.
 * The token goes in an Authorization header, never in a URL, log or error.
 *
 * The output mapping below is a defensive placeholder; confirm it against the
 * chosen actor's real output (and its terms) before any live run.
 */
export class ApifyScraperClient implements ScraperClient {
  private readonly token: string | undefined;
  private readonly actorId: string | undefined;

  constructor(
    env: Record<string, string | undefined> = process.env,
    private readonly fetchFn: FetchFn = fetch,
  ) {
    this.token = env.APIFY_TOKEN?.trim() || undefined;
    this.actorId = env.APIFY_ACTOR_ID?.trim() || undefined;
  }

  get enabled(): boolean {
    return this.token !== undefined && this.actorId !== undefined;
  }

  async fetchPrices(itemId: string): Promise<PricePoint[]> {
    if (this.token === undefined) throw new Error('Apify scraper is disabled: APIFY_TOKEN is not set.');
    if (this.actorId === undefined) throw new Error('Apify scraper is disabled: APIFY_ACTOR_ID is not set.');

    const url = `https://api.apify.com/v2/acts/${encodeURIComponent(this.actorId)}/run-sync-get-dataset-items`;
    const res = await this.fetchFn(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: itemId }),
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status !== 200 && res.status !== 201) throw new Error(`Apify request failed with status ${res.status}.`);

    const body: unknown = await res.json();
    if (!Array.isArray(body)) return [];
    const observedAt = new Date().toISOString().slice(0, 10);
    return body.flatMap((row): PricePoint[] => {
      if (typeof row !== 'object' || row === null) return [];
      const r = row as Record<string, unknown>;
      if (typeof r.store !== 'string' || !STORES.has(r.store)) return [];
      if (typeof r.pricePerServe !== 'number' || !(r.pricePerServe >= 0)) return [];
      return [
        {
          itemId,
          store: r.store as PricePoint['store'],
          pricePerServe: r.pricePerServe,
          unitLabel: typeof r.unitLabel === 'string' ? r.unitLabel : '1 serve',
          observedAt,
          isSample: false,
        },
      ];
    });
  }
}
