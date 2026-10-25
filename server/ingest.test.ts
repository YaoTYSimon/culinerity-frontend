import { describe, expect, it, vi } from 'vitest';
import type { PricePoint } from '@culinerity/core';
import { ingest } from './ingest';
import { SqlitePriceRepository } from './repositories';
import { ApifyScraperClient, MockScraperClient, type ScraperClient } from './scraperClient';
import { seededMemoryDb } from './testDb';

const count = (db: ReturnType<typeof seededMemoryDb>) =>
  (db.prepare('SELECT COUNT(*) AS n FROM prices').get() as { n: number }).n;

describe('ingest with MockScraperClient', () => {
  it('upserts live rows (is_sample = 0) without duplicating on a second run', async () => {
    const db = seededMemoryDb();
    const repo = new SqlitePriceRepository(db);
    const before = count(db);

    const first = await ingest(new MockScraperClient(), repo, ['burger', 'pizza']);
    const afterFirst = count(db);
    await ingest(new MockScraperClient(), repo, ['burger', 'pizza']);

    expect(afterFirst).toBeGreaterThan(before);
    expect(count(db)).toBe(afterFirst);
    expect(first.upserted).toBeGreaterThan(0);
    const live = db.prepare('SELECT COUNT(*) AS n FROM prices WHERE is_sample = 0').get() as { n: number };
    expect(live.n).toBe(first.upserted);
  });
  it('marks ingested points as not sample even if the client says otherwise', async () => {
    const db = seededMemoryDb();
    const repo = new SqlitePriceRepository(db);
    const client: ScraperClient = {
      fetchPrices: async (itemId): Promise<PricePoint[]> => [
        { itemId, store: 'Aldi', pricePerServe: 2, unitLabel: '1 serve', observedAt: '2026-10-20', isSample: true },
      ],
    };
    await ingest(client, repo, ['burger']);
    const row = db.prepare("SELECT is_sample FROM prices WHERE item_id='burger' AND store='Aldi' AND is_sample=0").get();
    expect(row).toBeTruthy();
  });
  it('keeps going and reports failures when one item fails', async () => {
    const repo = new SqlitePriceRepository(seededMemoryDb());
    const client: ScraperClient = {
      fetchPrices: async (id) => {
        if (id === 'bad') throw new Error('upstream down');
        return new MockScraperClient().fetchPrices(id);
      },
    };
    const result = await ingest(client, repo, ['bad', 'burger']);
    expect(result.failed).toEqual(['bad']);
    expect(result.upserted).toBeGreaterThan(0);
  });
  it('ignores points for items other than the one requested', async () => {
    const db = seededMemoryDb();
    const repo = new SqlitePriceRepository(db);
    const client: ScraperClient = {
      fetchPrices: async () => [
        { itemId: 'not-in-db', store: 'Aldi', pricePerServe: 2, unitLabel: 'x', observedAt: '2026-10-20', isSample: false },
      ],
    };
    const result = await ingest(client, repo, ['burger']);
    expect(result.upserted).toBe(0);
  });
});

describe('ApifyScraperClient', () => {
  it('is disabled and rejects with a clear message, with no network call, when APIFY_TOKEN is unset', async () => {
    const fetchStub = vi.fn();
    const client = new ApifyScraperClient({}, fetchStub);
    expect(client.enabled).toBe(false);
    await expect(client.fetchPrices('burger')).rejects.toThrow(/APIFY_TOKEN/);
    expect(fetchStub).not.toHaveBeenCalled();
  });
  it('treats a blank token as unset', async () => {
    const fetchStub = vi.fn();
    const client = new ApifyScraperClient({ APIFY_TOKEN: '  ', APIFY_ACTOR_ID: 'a~b' }, fetchStub);
    await expect(client.fetchPrices('burger')).rejects.toThrow(/APIFY_TOKEN/);
    expect(fetchStub).not.toHaveBeenCalled();
  });
  it('is disabled without an actor id', async () => {
    const fetchStub = vi.fn();
    const client = new ApifyScraperClient({ APIFY_TOKEN: 'fake-test-token' }, fetchStub);
    await expect(client.fetchPrices('burger')).rejects.toThrow(/APIFY_ACTOR_ID/);
    expect(fetchStub).not.toHaveBeenCalled();
  });
  it('with an injected fake token and stub fetch, sends the token in a header (not the URL) and maps items', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify([{ store: 'Coles', pricePerServe: 3.5, unitLabel: '1 burger' }, { store: 'Nowhere', pricePerServe: 1 }, 'junk']), {
        status: 200,
      }),
    );
    const client = new ApifyScraperClient({ APIFY_TOKEN: 'fake-test-token', APIFY_ACTOR_ID: 'someone~actor' }, fetchStub);
    const got = await client.fetchPrices('burger');
    expect(got).toEqual([expect.objectContaining({ itemId: 'burger', store: 'Coles', pricePerServe: 3.5, isSample: false })]);
    const [url, init] = fetchStub.mock.calls[0]!;
    expect(url).not.toContain('fake-test-token');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer fake-test-token');
  });
  it('rejects on a non-200 response without echoing the token', async () => {
    const client = new ApifyScraperClient(
      { APIFY_TOKEN: 'fake-test-token', APIFY_ACTOR_ID: 'a~b' },
      async () => new Response('nope', { status: 401 }),
    );
    const err = await client.fetchPrices('burger').catch((e: Error) => e);
    expect((err as Error).message).toMatch(/401/);
    expect((err as Error).message).not.toContain('fake-test-token');
  });
});
