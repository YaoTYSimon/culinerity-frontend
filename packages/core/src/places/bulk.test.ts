import { describe, expect, it, vi } from 'vitest';
import {
  BULK_CELL_DEG,
  bulkCanMatch,
  bulkMatchesFilter,
  bulkStaleness,
  cellKey,
  cellPath,
  loadBulkFor,
  neighbourKeys,
  rankBulk,
  type CellShard,
} from './bulk';
import type { BulkKind } from './tier';
import type { PlaceFilter } from './rank';

const here = { lat: -37.8136, lng: 144.9631 };
const north = (m: number) => ({ lat: here.lat + m / 111195, lng: here.lng });

const shardPlace = (id: string, m: number, name = id, kind: BulkKind = 'bakery'): CellShard['places'][number] => ({
  id: `ovt-${id}`,
  name,
  kind,
  ...north(m),
  address: '1 Test St',
  postcode: '3000',
  sourceDataset: 'meta',
  licence: 'CDLA-Permissive-2.0',
});
const shard = (...places: CellShard['places']): CellShard => ({ release: '2026-10-21.0', places });

describe('cellKey and neighbourKeys', () => {
  it('uses 0.015 degree cells from the box corner', () => {
    expect(BULK_CELL_DEG).toBe(0.015);
    expect(cellKey(-38.6, 144.3)).toBe('0_0');
    expect(cellKey(-37.8, 144.96)).toBe('44_53');
    expect(cellKey(-37.4, 145.8)).toBe('99_79');
  });
  it('returns nine keys row-major for an interior cell and fewer at the box edge', () => {
    expect(neighbourKeys('5_5')).toEqual(['4_4', '5_4', '6_4', '4_5', '5_5', '6_5', '4_6', '5_6', '6_6']);
    expect(neighbourKeys('0_0')).toEqual(['0_0', '1_0', '0_1', '1_1']);
    expect(neighbourKeys('99_79')).toHaveLength(4);
  });
  it('builds a same-origin path from the key alone', () => {
    expect(cellPath('44_53')).toBe('/places/cells/44_53.json');
  });
});

describe('loadBulkFor', () => {
  it('asks only for the cell and its neighbours, by key, and returns hydrated places', async () => {
    const fetcher = vi.fn(async (key: string) => (key === cellKey(here.lat, here.lng) ? shard(shardPlace('a', 100)) : shard()));
    const r = await loadBulkFor(here, fetcher);
    expect(fetcher.mock.calls.map((c) => c[0]).sort()).toEqual(neighbourKeys(cellKey(here.lat, here.lng)).sort());
    for (const [arg, ...rest] of fetcher.mock.calls) {
      expect(arg).toMatch(/^\d+_\d+$/);
      expect(rest).toEqual([]);
    }
    expect(r.release).toBe('2026-10-21.0');
    expect(r.failedCells).toEqual([]);
    expect(r.places).toHaveLength(1);
    expect(r.places[0]).toMatchObject({ id: 'ovt-a', price: 'unknown', source: 'overture', release: '2026-10-21.0' });
    expect(r.places[0]).not.toHaveProperty('confidence');
    expect(r.places[0]).not.toHaveProperty('hours');
  });
  it('one failing cell does not break the others and is listed', async () => {
    const mid = cellKey(here.lat, here.lng);
    const bad = neighbourKeys(mid)[0];
    const fetcher = async (key: string) => {
      if (key === bad) throw new Error('network');
      return key === mid ? shard(shardPlace('a', 10)) : shard();
    };
    const r = await loadBulkFor(here, fetcher);
    expect(r.failedCells).toEqual([bad]);
    expect(r.places.map((p) => p.id)).toEqual(['ovt-a']);
  });
  it('treats a fetcher that throws synchronously, or a malformed shard, as a failed cell', async () => {
    const mid = cellKey(here.lat, here.lng);
    const keys = neighbourKeys(mid);
    const fetcher = ((key: string) => {
      if (key === keys[0]) throw new Error('sync');
      if (key === keys[1]) return Promise.resolve({ release: 3, places: 'x' });
      return Promise.resolve(shard());
    }) as unknown as (k: string) => Promise<CellShard>;
    const r = await loadBulkFor(here, fetcher);
    expect(r.failedCells).toEqual([keys[0], keys[1]]);
  });
  it('treats a shard of a different release as a failed cell', async () => {
    const keys = neighbourKeys(cellKey(here.lat, here.lng));
    const fetcher = async (key: string) => (key === keys[1] ? { release: '2026-01-01.0', places: [] } : shard());
    const r = await loadBulkFor(here, fetcher);
    expect(r.failedCells).toEqual([keys[1]]);
  });
  it('loads nothing and never calls the fetcher outside the box or for a bad position', async () => {
    const fetcher = vi.fn(async () => shard());
    for (const pos of [{ lat: -33.87, lng: 151.2 }, { lat: Number.NaN, lng: 144.9 }, { lat: -37.8, lng: Number.POSITIVE_INFINITY }]) {
      expect(await loadBulkFor(pos, fetcher)).toEqual({ places: [], failedCells: [], release: null });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('touches no storage', async () => {
    const touched = vi.fn();
    const trap = new Proxy({}, { get: touched, set: () => (touched(), true) });
    vi.stubGlobal('localStorage', trap);
    vi.stubGlobal('sessionStorage', trap);
    try {
      await loadBulkFor(here, async () => shard(shardPlace('a', 10)));
    } finally {
      vi.unstubAllGlobals();
    }
    expect(touched).not.toHaveBeenCalled();
  });
});

describe('rankBulk', () => {
  const hydrate = async (...ps: CellShard['places']) => (await loadBulkFor(here, async (k) => (k === cellKey(here.lat, here.lng) ? shard(...ps) : shard()))).places;
  it('orders by distance, then name, then id', async () => {
    const places = await hydrate(shardPlace('z', 900, 'Far'), shardPlace('b', 100, 'Same'), shardPlace('a', 100, 'Same'), shardPlace('c', 100, 'Alpha'), shardPlace('n', 50, 'Near'));
    const ranked = rankBulk(places, here);
    expect(ranked.map((r) => r.place.id)).toEqual(['ovt-n', 'ovt-c', 'ovt-a', 'ovt-b', 'ovt-z']);
    expect(ranked[0].distanceM).toBeGreaterThan(40);
    expect(ranked[0].distanceM).toBeLessThan(60);
  });
  it('drops a place whose distance is not a number', async () => {
    const places = await hydrate(shardPlace('a', 10), { ...shardPlace('b', 10), lat: Number.NaN });
    expect(rankBulk(places, here).map((r) => r.place.id)).toEqual(['ovt-a']);
  });
});

describe('bulkMatchesFilter', () => {
  const one = async (kind: BulkKind) =>
    (await loadBulkFor(here, async (k) => (k === cellKey(here.lat, here.lng) ? shard(shardPlace('a', 10, 'A', kind)) : shard()))).places[0];
  it('never returns a bulk place from Free or Low cost: its price is unknown', async () => {
    const kinds: BulkKind[] = ['supermarket', 'greengrocer', 'bakery', 'takeaway', 'cafe-restaurant', 'butcher', 'fishmonger', 'deli', 'food-relief'];
    for (const k of kinds) {
      const p = await one(k);
      expect(p.price).toBe('unknown');
      expect(bulkMatchesFilter(p, 'free')).toBe(false);
      expect(bulkMatchesFilter(p, 'low-cost')).toBe(false);
      expect(bulkMatchesFilter(p, 'all')).toBe(true);
    }
  });
  it('treats only produce, butcher and fish shops as fresh', async () => {
    const fresh: Record<BulkKind, boolean> = {
      supermarket: false, greengrocer: true, bakery: false, takeaway: false, 'cafe-restaurant': false, butcher: true, fishmonger: true, deli: false, 'food-relief': false,
    };
    for (const [k, want] of Object.entries(fresh)) expect(bulkMatchesFilter(await one(k as BulkKind), 'fresh' as PlaceFilter)).toBe(want);
  });
  it('rankBulk applies the filter', async () => {
    const places = (await loadBulkFor(here, async (k) => (k === cellKey(here.lat, here.lng) ? shard(shardPlace('a', 10, 'A', 'butcher'), shardPlace('b', 20, 'B', 'bakery')) : shard()))).places;
    expect(rankBulk(places, here, 'fresh').map((r) => r.place.id)).toEqual(['ovt-a']);
    expect(rankBulk(places, here, 'free')).toEqual([]);
    expect(rankBulk(places, here, 'low-cost')).toEqual([]);
  });
});

describe('food-relief kind', () => {
  it('is ordered by distance with the other kinds (no priority), and skipped when a shard has a kind this app does not know', async () => {
    const bad = { ...shardPlace('x', 5), kind: 'mystery' } as unknown as CellShard['places'][number];
    const places = (await loadBulkFor(here, async (k) => (k === cellKey(here.lat, here.lng) ? shard(shardPlace('a', 30, 'A', 'bakery'), shardPlace('b', 60, 'B', 'food-relief'), shardPlace('c', 10, 'C', 'deli'), bad) : shard()))).places;
    expect(places.map((p) => p.id).sort()).toEqual(['ovt-a', 'ovt-b', 'ovt-c']);
    expect(rankBulk(places, here).map((r) => r.place.id)).toEqual(['ovt-c', 'ovt-a', 'ovt-b']);
  });
});

describe('bulkStaleness (Ruling D4b)', () => {
  const r = '2026-10-21.0';
  it('is fresh up to and including 6 months, old after, and hidden only once older than 12 months', () => {
    expect(bulkStaleness(r, '2026-10-21')).toBe('fresh');
    expect(bulkStaleness(r, '2027-04-21')).toBe('fresh');
    expect(bulkStaleness(r, '2027-04-22')).toBe('old');
        expect(bulkStaleness(r, '2027-10-21')).toBe('old');
    expect(bulkStaleness(r, '2027-10-22')).toBe('hidden');
    expect(bulkStaleness(r, '2028-01-01')).toBe('hidden');
  });
  it('clamps month ends (31 August plus 6 months is 28 February)', () => {
    expect(bulkStaleness('2026-08-31.0', '2027-02-28')).toBe('fresh');
    expect(bulkStaleness('2026-08-31.0', '2027-03-01')).toBe('old');
  });
  it('hides the tier when a date cannot be read', () => {
    expect(bulkStaleness('nonsense', '2026-11-03')).toBe('hidden');
    expect(bulkStaleness(r, 'today')).toBe('hidden');
  });
});

describe('bulkCanMatch', () => {
  it('is false for Free and Low cost, true for All and Fresh produce', () => {
    expect(bulkCanMatch('free')).toBe(false);
    expect(bulkCanMatch('low-cost')).toBe(false);
    expect(bulkCanMatch('all')).toBe(true);
    expect(bulkCanMatch('fresh')).toBe(true);
  });
});
