import type { PriceWriter } from './repositories';
import type { ScraperClient } from './scraperClient';

export interface IngestResult {
  upserted: number;
  failed: string[];
}

/**
 * Fetch prices for each item and upsert them as live data (is_sample = 0).
 * One item failing does not stop the others. Not wired to any command: a real
 * run needs the user's go-ahead.
 */
export async function ingest(client: ScraperClient, repo: PriceWriter, itemIds: string[]): Promise<IngestResult> {
  const result: IngestResult = { upserted: 0, failed: [] };
  for (const itemId of itemIds) {
    try {
      const points = (await client.fetchPrices(itemId))
        .filter((p) => p.itemId === itemId)
        .map((p) => ({ ...p, isSample: false }));
      result.upserted += await repo.upsertLivePrices(points);
    } catch {
      result.failed.push(itemId);
    }
  }
  return result;
}
