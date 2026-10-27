import { describe, expect, it } from 'vitest';
import { placeData } from './source';
import { StaticPlaceSource, coverage, placeSourceFor } from './source';
import { MockPlaceSource } from '../sources/mock/mockPlaceSource';
import type { Place, PlaceKind, PriceBand } from './types';

const DEFAULT_BAND: Record<PlaceKind, PriceBand[]> = {
  'food-relief': ['free'],
  'community-meal': ['free'],
  'social-supermarket': ['budget'],
  'co-op': ['budget'],
  // Budget only where the operator's own words say affordable or discount (recorded in the source title).
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

describe('committed places', () => {
  it('keep the price band consistent with the kind', () => {
    for (const p of placeData.places) expect(DEFAULT_BAND[p.kind], p.id).toContain(p.priceBand);
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
