import { haversineMetres, type LatLng } from './distance';
import { NO_FILTERS, bulkMatches, type PlaceFilters } from './filters';
import { BULK_KINDS, type BulkKind, type BulkPlace } from './tier';

/*
 * Privacy: the only thing this module hands to a CellFetcher is a coarse cell key such as "44_53".
 * The position and anything the person typed stay on the device. The key is the same for every point
 * in a cell about 1.3 to 1.7 km across, so a same-origin static request reveals no more than that.
 * Nothing here touches storage.
 */

/** Greater Melbourne box and cell size. Pinned equal to scripts/lib/cells.mjs by a test in scripts/lib/cells.test.ts. */
export const BULK_BOX = { lat: [-38.6, -37.4], lng: [144.3, 145.8] } as const;
export const BULK_CELL_DEG = 0.015;

/** What a shard holds per place; `price`, `source` and `release` are added on load, `confidence` is not shipped. */
export type ShardPlace = Omit<BulkPlace, 'price' | 'source' | 'release' | 'confidence'>;
export interface CellShard {
  release: string;
  places: ShardPlace[];
}
export type CellFetcher = (key: string) => Promise<CellShard>;

export interface BulkLoad {
  places: BulkPlace[];
  failedCells: string[];
  release: string | null;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const span = (lo: number, hi: number) => Math.ceil(round6((hi - lo) / BULK_CELL_DEG));
const NX = span(BULK_BOX.lng[0], BULK_BOX.lng[1]);
const NY = span(BULK_BOX.lat[0], BULK_BOX.lat[1]);

/** '<ix>_<iy>'. A point exactly on a boundary belongs to the higher cell; the far box edge to the last cell. */
export function cellKey(lat: number, lng: number): string {
  const ix = Math.min(NX - 1, Math.floor(round6((lng - BULK_BOX.lng[0]) / BULK_CELL_DEG)));
  const iy = Math.min(NY - 1, Math.floor(round6((lat - BULK_BOX.lat[0]) / BULK_CELL_DEG)));
  return `${ix}_${iy}`;
}

/** The key and its eight neighbours, row-major (iy then ix), clipped to the box. */
export function neighbourKeys(key: string): string[] {
  const [ix, iy] = key.split('_').map(Number);
  const out: string[] = [];
  for (let y = iy - 1; y <= iy + 1; y++)
    for (let x = ix - 1; x <= ix + 1; x++) if (x >= 0 && y >= 0 && x < NX && y < NY) out.push(`${x}_${y}`);
  return out;
}

/** The same-origin path of a shard. It is built from the key alone. */
export const cellPath = (key: string) => `/places/cells/${key}.json`;

/** The manifest path. It names the release and which cells have a shard; it carries no position. */
export const MANIFEST_PATH = '/places/manifest.json';

/** The part of the manifest the web app reads. Cells with no places have no shard and are absent from `cells`. */
export interface BulkManifest {
  release: string;
  cells: Record<string, unknown>;
}

export const isBulkManifest = (m: unknown): m is BulkManifest =>
  !!m && typeof (m as BulkManifest).release === 'string' && !!(m as BulkManifest).cells && typeof (m as BulkManifest).cells === 'object';

const inBox = ({ lat, lng }: LatLng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= BULK_BOX.lat[0] && lat <= BULK_BOX.lat[1] && lng >= BULK_BOX.lng[0] && lng <= BULK_BOX.lng[1];

const isShard = (s: unknown): s is CellShard =>
  !!s && typeof (s as CellShard).release === 'string' && Array.isArray((s as CellShard).places);

async function request(fetcher: CellFetcher, key: string): Promise<CellShard | null> {
  try {
    const s = await fetcher(key);
    return isShard(s) ? s : null;
  } catch {
    return null;
  }
}

/** An older app reading a newer shard (or the reverse) skips a kind it does not know rather than showing it with no label. */
const isKnownKind = (k: unknown): k is BulkKind => (BULK_KINDS as readonly unknown[]).includes(k);

const hydrate = (p: ShardPlace, release: string): BulkPlace => ({ ...p, price: 'unknown', source: 'overture', release });

/**
 * Loads the person's cell and its neighbours, nothing else. A position outside the box loads nothing.
 * A cell that fails, is malformed, or is from a different release than the first good cell is listed in `failedCells`.
 */
export async function loadBulkFor(pos: LatLng, fetcher: CellFetcher): Promise<BulkLoad> {
  if (!inBox(pos)) return { places: [], failedCells: [], release: null };
  const keys = neighbourKeys(cellKey(pos.lat, pos.lng));
  const shards = await Promise.all(keys.map((k) => request(fetcher, k)));
  const release = shards.find((s) => s !== null)?.release ?? null;
  const places: BulkPlace[] = [];
  const failedCells: string[] = [];
  shards.forEach((s, i) => {
    if (s === null || s.release !== release) failedCells.push(keys[i]);
    else for (const p of s.places) if (isKnownKind(p.kind)) places.push(hydrate(p, s.release));
  });
  return { places, failedCells, release };
}

export interface RankedBulk {
  place: BulkPlace;
  distanceM: number;
}

/**
 * Nearest first, then name, then id. The distance is the whole order: a bulk place has no price or fit to nudge with,
 * so distance bands cannot be overridden. The page shows this list after the checked tier, under its own heading.
 */
export function rankBulk(places: BulkPlace[], pos: LatLng, filters: PlaceFilters = NO_FILTERS): RankedBulk[] {
  return places
    .filter((p) => bulkMatches(p, filters))
    .map((place) => ({ place, distanceM: haversineMetres(pos, place) }))
    .filter((r) => Number.isFinite(r.distanceM))
    .sort(
      (a, b) =>
        a.distanceM - b.distanceM ||
        a.place.name.localeCompare(b.place.name, 'en-AU') ||
        (a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0),
    );
}

/**
 * Ruling F2 (replaces F1): within the unchecked tier, food relief rows are shown first as their own group, nearest first,
 * and the other kinds follow in the same distance order as before. Input must already be ranked; order is kept.
 * Food relief rows are not repeated in `rest`.
 */
export function splitReliefFirst(ranked: RankedBulk[]): { relief: RankedBulk[]; rest: RankedBulk[] } {
  return {
    relief: ranked.filter((r) => r.place.kind === 'food-relief'),
    rest: ranked.filter((r) => r.place.kind !== 'food-relief'),
  };
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})/;

function addMonths(iso: string, months: number): string | null {
  const m = ISO.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const total = y * 12 + (mo - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/**
 * Ruling D4b: fresh until 6 months after the release date, old until 12 months after it, hidden once older than 12 months.
 * `release` is an Overture id such as "2026-10-21.0"; `today` is YYYY-MM-DD. An unreadable date hides the tier.
 */
export function bulkStaleness(release: string, today: string): 'fresh' | 'old' | 'hidden' {
  const t = ISO.exec(today)?.[0];
  const six = addMonths(release, 6);
  const twelve = addMonths(release, 12);
  if (!t || !six || !twelve) return 'hidden';
  if (t > twelve) return 'hidden';
  return t > six ? 'old' : 'fresh';
}
