import { describe, expect, it } from 'vitest';
import { placeData } from './source';
import { StaticPlaceSource, activeNotices, coverage, placeSourceFor } from './source';
import { MockPlaceSource } from '../sources/mock/mockPlaceSource';
import type { Place, PlaceKind, PriceBand } from './types';

/** The estimate used when a source states no price. */
const TYPICAL_BAND: Record<PlaceKind, PriceBand> = {
  'food-relief': 'free',
  'community-meal': 'free',
  'social-supermarket': 'budget',
  'co-op': 'budget',
  market: 'mid',
  grocer: 'mid',
};
// Other bands are allowed only where the operator's own words say so (recorded in the source title).
const DEFAULT_BAND: Record<PlaceKind, PriceBand[]> = {
  'food-relief': ['free'],
  'community-meal': ['free'],
  'social-supermarket': ['budget'],
  'co-op': ['budget'],
  market: ['budget', 'mid', 'pricier'],
  grocer: ['budget', 'mid'],
};

describe('StaticPlaceSource', () => {
  it('lists every generated place', async () => {
    expect(await new StaticPlaceSource().list()).toEqual(placeData.places);
  });
  it('returns copies, so mutating a result leaves the next call unchanged', async () => {
    const src = new StaticPlaceSource();
    const first = await src.list();
    first[0].name = 'changed';
    first[0].fit.push('meals');
    first.pop();
    const second = await src.list();
    expect(second).toEqual(placeData.places);
  });
});

describe('placeSourceFor', () => {
  it('resolves every place source and returns undefined otherwise', () => {
    for (const p of placeData.places) expect(placeSourceFor(p.sourceId)?.url).toMatch(/^https:\/\//);
    expect(placeSourceFor('nope')).toBeUndefined();
  });
});

describe('coverage', () => {
  const p = (suburb: string): Place => ({ ...placeData.places[0], suburb });
  it('returns the count and sorted unique suburbs', () => {
    expect(coverage([p('Preston'), p('Dandenong'), p('Preston')])).toEqual({ count: 3, suburbs: ['Dandenong', 'Preston'] });
    expect(coverage([])).toEqual({ count: 0, suburbs: [] });
  });
  it('describes the committed dataset', () => {
    const c = coverage(placeData.places);
    expect(c.count).toBe(placeData.places.length);
    expect(c.suburbs).toEqual([...c.suburbs].sort());
  });
});

describe('activeNotices', () => {
  const base = placeData.places[0];
  const place = { ...base, notices: [{ text: 'Closed Cup Day', until: '2026-11-03' }, { text: 'Bazaar closed', until: '2026-11-30' }] };
  it('returns notices that have not ended, and drops ended ones', () => {
    expect(activeNotices(place, '2026-10-27').map((n) => n.text)).toEqual(['Closed Cup Day', 'Bazaar closed']);
    expect(activeNotices(place, '2026-11-03').map((n) => n.text)).toEqual(['Closed Cup Day', 'Bazaar closed']);
    expect(activeNotices(place, '2026-11-04').map((n) => n.text)).toEqual(['Bazaar closed']);
    expect(activeNotices(place, '2026-12-01')).toEqual([]);
    expect(activeNotices({ ...base, notices: undefined }, '2026-10-27')).toEqual([]);
  });
});

describe('committed places', () => {
  it('keep the price band consistent with the kind', () => {
    for (const p of placeData.places) expect(DEFAULT_BAND[p.kind], p.id).toContain(p.priceBand);
  });
  it('mark a band as stated only where the source says it, and as typical otherwise', () => {
    for (const p of placeData.places) {
      expect(['stated', 'typical'], p.id).toContain(p.priceBasis);
      // A typical band is the default for the kind, never an upgrade or a discount.
      if (p.priceBasis === 'typical') expect(TYPICAL_BAND[p.kind], p.id).toBe(p.priceBand);
      // A band that departs from the default needs the operator's own words.
      if (p.priceBand !== TYPICAL_BAND[p.kind]) expect(p.priceBasis, p.id).toBe('stated');
    }
  });
  it('label every market and grocer at the mid band as a typical estimate', () => {
    const mid = placeData.places.filter((p) => (p.kind === 'market' || p.kind === 'grocer') && p.priceBand === 'mid');
    expect(mid.length).toBeGreaterThan(0);
    for (const p of mid) expect(p.priceBasis, p.id).toBe('typical');
  });
  it('say when a price is not stated by the source', () => {
    for (const p of placeData.places.filter((x) => x.priceBasis === 'typical' && (x.priceBand === 'free' || x.priceBand === 'budget'))) {
      expect(p.note ?? '', p.id).toMatch(/cost not stated/i);
    }
  });
  it('keep dated notices short and dated', () => {
    for (const p of placeData.places) for (const n of p.notices ?? []) {
      expect(n.text.trim(), p.id).not.toBe('');
      expect(n.until, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('never claim pricier unless a farmers market', () => {
    for (const p of placeData.places.filter((x) => x.priceBand === 'pricier')) expect(p.name).toMatch(/farmers market/i);
  });
});

describe('starter set reaches people with the least money', () => {
  const lowCost = placeData.places.filter((p) => p.priceBand === 'free' || p.priceBand === 'budget');
  it('has at least ten free or low-cost places, with free ones among them', () => {
    expect(lowCost.length).toBeGreaterThanOrEqual(10);
    expect(placeData.places.filter((p) => p.priceBand === 'free').length).toBeGreaterThanOrEqual(3);
  });
  it('spans inner, west, north, south-east and east Melbourne', () => {
    const near = (lat: number, lng: number, r: number) => (p: Place) => Math.hypot(p.lat - lat, (p.lng - lng) * 0.79) < r;
    expect(lowCost.some(near(-37.81, 144.97, 0.03))).toBe(true); // inner
    expect(lowCost.some((p) => p.lng < 144.85)).toBe(true); // west
    expect(lowCost.some((p) => p.lat > -37.72 && p.lng > 144.95)).toBe(true); // north
    expect(lowCost.some((p) => p.lat < -37.95 && p.lng > 145.15)).toBe(true); // south-east
    expect(lowCost.some((p) => p.lat > -37.85 && p.lat < -37.78 && p.lng > 145.1)).toBe(true); // east
  });
  it('keeps hours out unless the place states them, and never empty', () => {
    for (const p of placeData.places) if (p.hours !== undefined) expect(p.hours.trim()).not.toBe('');
  });
});

describe('MockPlaceSource', () => {
  it('serves three obviously fake places', async () => {
    const list = await new MockPlaceSource().list();
    expect(list).toHaveLength(3);
    expect(list.map((x) => x.name).join()).toMatch(/Test/);
  });
});
