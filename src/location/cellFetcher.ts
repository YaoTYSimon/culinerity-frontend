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

const INIT: RequestInit = { credentials: 'omit', referrerPolicy: 'no-referrer' };

export function createBulkSource(fetchFn: typeof fetch = (...a) => fetch(...a)): BulkSource {
  let cached: Promise<BulkManifest | null> | null = null;
  const json = async (url: string): Promise<unknown> => {
    const res = await fetchFn(url, INIT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  return {
    manifest() {
      cached ??= json(MANIFEST_PATH).then(
        (m) => (isBulkManifest(m) ? m : null),
        () => null,
      );
      return cached;
    },
    cell: (manifest) => async (key) => {
      if (!(key in manifest.cells)) return { release: manifest.release, places: [] };
      return (await json(cellPath(key))) as Awaited<ReturnType<CellFetcher>>;
    },
  };
}
