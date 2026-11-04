import { MANIFEST_PATH, cellPath, isBulkManifest, type BulkManifest, type CellFetcher } from '@culinerity/core';

/*
 * The only network code for the not-checked places. Every request is same-origin, carries no cookies and no referrer,
 * and its URL is the manifest or a coarse cell path built from a cell key (see core's bulk.ts). The host can see which
 * cell (about 1.5 km) was asked for, and nothing else. A cell the manifest does not list is empty and is not requested.
 */

export interface BulkSource {
  /** The manifest, or null when the bulk list is not published (no file, not JSON, or not a manifest). Never throws. */
  manifest(): Promise<BulkManifest | null>;
  /** Fetches one cell. Rejects on any failure so the loader counts it as a failed cell. */
  cell(manifest: BulkManifest): CellFetcher;
}

/** A transient manifest failure (network error, server error) is retried on a later visit, this many times at most. */
const MAX_MANIFEST_ATTEMPTS = 4;

const INIT: RequestInit = { credentials: 'omit', referrerPolicy: 'no-referrer' };

export function createBulkSource(fetchFn: typeof fetch = (...a) => fetch(...a)): BulkSource {
  let cached: Promise<BulkManifest | null> | null = null;
  let attempts = 0;
  const json = async (url: string): Promise<unknown> => {
    const res = await fetchFn(url, INIT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  return {
    manifest() {
      if (cached) return cached;
      attempts += 1;
      const pending: Promise<BulkManifest | null> = fetchFn(MANIFEST_PATH, INIT).then(
        async (res) => {
          if (res.status === 404) return null; // not published: a settled answer
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          try {
            const m = await res.json();
            return isBulkManifest(m) ? m : null;
          } catch {
            return null; // HTML fallback or not JSON: not published
          }
        },
      ).catch(() => {
        // Transient failure: forget it so the next visit can try again, up to a limit.
        if (attempts < MAX_MANIFEST_ATTEMPTS) cached = null;
        return null;
      });
      cached = pending;
      return pending;
    },
    cell: (manifest) => async (key) => {
      if (!(key in manifest.cells)) return { release: manifest.release, places: [] };
      return (await json(cellPath(key))) as Awaited<ReturnType<CellFetcher>>;
    },
  };
}
