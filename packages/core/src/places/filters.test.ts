import { describe, expect, it } from 'vitest';
import {
  FILTER_GROUPS, NO_FILTERS, bulkCanMatch, bulkMatches, hasActiveFilters, placeMatches, toggleFilter, type PlaceFilters,
} from './filters';
import { BULK_KINDS, type BulkKind, type BulkPlace } from './tier';
import type { Place } from './types';

const place = (over: Partial<Place> = {}): Place => ({
  id: 'p', name: 'P', kind: 'market', lat: 0, lng: 0, address: 'a', suburb: 's', priceBand: 'mid', priceBasis: 'typical',
  fit: ['fresh'], access: 'open', sourceId: 's', verification: 'primary', checked: '2026-01-01', ...over,
});
const bulk = (kind: BulkKind): BulkPlace => ({
  id: 'b', name: 'B', kind, lat: 0, lng: 0, address: 'x', price: 'unknown', source: 'overture', sourceDataset: 'meta', release: 'r', licence: 'CC0-1.0',
});
const on = (over: Partial<PlaceFilters>): PlaceFilters => ({ ...NO_FILTERS, ...over });

describe('filter state', () => {
  it('starts with nothing on', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(placeMatches(place(), NO_FILTERS)).toBe(true);
    for (const k of BULK_KINDS) expect(bulkMatches(bulk(k), NO_FILTERS)).toBe(true);
  });
  it('toggles a value on and off without mutating', () => {
    const a = toggleFilter(NO_FILTERS, 'cost', 'free');
    expect(a.cost).toEqual(['free']);
    expect(NO_FILTERS.cost).toEqual([]);
    expect(hasActiveFilters(a)).toBe(true);
    expect(toggleFilter(a, 'cost', 'free')).toEqual(NO_FILTERS);
  });
  it('toggles the checked-only flag', () => {
    const a = toggleFilter(NO_FILTERS, 'checked', 'checked');
    expect(a.checkedOnly).toBe(true);
    expect(toggleFilter(a, 'checked', 'checked').checkedOnly).toBe(false);
  });
  it('names its groups with one-word labels and unique values', () => {
    expect(FILTER_GROUPS.map((g) => g.label)).toEqual(['Type', 'Cost', 'Food', 'Access', 'Checked']);
    for (const g of FILTER_GROUPS) expect(g.label).not.toMatch(/\s/);
  });
});

describe('checked places: OR within a group, AND across groups', () => {
  it('Type: any picked kind', () => {
    const f = on({ type: ['market', 'meal'] });
    expect(placeMatches(place({ kind: 'market' }), f)).toBe(true);
    expect(placeMatches(place({ kind: 'community-meal' }), f)).toBe(true);
    expect(placeMatches(place({ kind: 'food-relief' }), f)).toBe(false);
    expect(placeMatches(place({ kind: 'grocer' }), on({ type: ['grocer'] }))).toBe(true);
    expect(placeMatches(place({ kind: 'co-op' }), on({ type: ['grocer'] }))).toBe(true);
    expect(placeMatches(place({ kind: 'food-relief' }), on({ type: ['relief'] }))).toBe(true);
  });
  it('Cost: free needs a stated free price; low cost is stated free or budget; typical never counts', () => {
    const free = place({ priceBand: 'free', priceBasis: 'stated' });
    const budget = place({ priceBand: 'budget', priceBasis: 'stated' });
    const typicalFree = place({ priceBand: 'free', priceBasis: 'typical' });
    expect(placeMatches(free, on({ cost: ['free'] }))).toBe(true);
    expect(placeMatches(budget, on({ cost: ['free'] }))).toBe(false);
    expect(placeMatches(budget, on({ cost: ['low'] }))).toBe(true);
    expect(placeMatches(free, on({ cost: ['low'] }))).toBe(true);
    expect(placeMatches(typicalFree, on({ cost: ['free'] }))).toBe(false);
    expect(placeMatches(typicalFree, on({ cost: ['free', 'low'] }))).toBe(false);
    expect(placeMatches(budget, on({ cost: ['free', 'low'] }))).toBe(true);
  });
  it('Food: any picked fit value; a place with no fit values never matches a Food pill', () => {
    expect(placeMatches(place({ fit: ['meals'] }), on({ food: ['fresh', 'meals'] }))).toBe(true);
    expect(placeMatches(place({ fit: ['packaged'] }), on({ food: ['fresh', 'meals'] }))).toBe(false);
    expect(placeMatches(place({ fit: [] }), on({ food: ['packaged'] }))).toBe(false);
  });
  it('Access: walk in is open; referral is referral only (membership is neither)', () => {
    expect(placeMatches(place({ access: 'open' }), on({ access: ['walk-in'] }))).toBe(true);
    expect(placeMatches(place({ access: 'referral' }), on({ access: ['walk-in'] }))).toBe(false);
    expect(placeMatches(place({ access: 'referral' }), on({ access: ['walk-in', 'referral'] }))).toBe(true);
    expect(placeMatches(place({ access: 'membership' }), on({ access: ['walk-in', 'referral'] }))).toBe(false);
  });
  it('Checked only keeps every checked place', () => {
    expect(placeMatches(place(), on({ checkedOnly: true }))).toBe(true);
  });
  it('across groups every group must match', () => {
    const f = on({ type: ['market', 'meal'], cost: ['free'], food: ['meals', 'fresh'] });
    expect(placeMatches(place({ kind: 'community-meal', priceBand: 'free', priceBasis: 'stated', fit: ['meals'] }), f)).toBe(true);
    expect(placeMatches(place({ kind: 'community-meal', priceBand: 'free', priceBasis: 'stated', fit: ['packaged'] }), f)).toBe(false);
    expect(placeMatches(place({ kind: 'food-relief', priceBand: 'free', priceBasis: 'stated', fit: ['meals'] }), f)).toBe(false);
  });
});

describe('not-checked (bulk) places', () => {
  it('Type maps kinds to groups', () => {
    for (const k of ['supermarket', 'greengrocer', 'butcher', 'fishmonger', 'deli', 'bakery'] as const)
      expect(bulkMatches(bulk(k), on({ type: ['grocer'] }))).toBe(true);
    expect(bulkMatches(bulk('food-relief'), on({ type: ['relief'] }))).toBe(true);
    expect(bulkMatches(bulk('takeaway'), on({ type: ['eatery'] }))).toBe(true);
    expect(bulkMatches(bulk('cafe-restaurant'), on({ type: ['eatery'] }))).toBe(true);
    expect(bulkMatches(bulk('takeaway'), on({ type: ['grocer', 'relief'] }))).toBe(false);
    expect(bulkMatches(bulk('bakery'), on({ type: ['market', 'meal'] }))).toBe(false);
  });
  it('Fresh matches produce, butcher and fish shops only; Meals and Packaged never match', () => {
    expect(bulkMatches(bulk('greengrocer'), on({ food: ['fresh'] }))).toBe(true);
    expect(bulkMatches(bulk('butcher'), on({ food: ['fresh'] }))).toBe(true);
    expect(bulkMatches(bulk('supermarket'), on({ food: ['fresh'] }))).toBe(false);
    expect(bulkMatches(bulk('greengrocer'), on({ food: ['meals'] }))).toBe(false);
    expect(bulkMatches(bulk('greengrocer'), on({ food: ['fresh', 'meals'] }))).toBe(true);
  });
  it('a Cost pill, an Access pill or Checked only drops every bulk place', () => {
    for (const f of [on({ cost: ['free'] }), on({ cost: ['low'] }), on({ access: ['walk-in'] }), on({ checkedOnly: true })])
      for (const k of BULK_KINDS) expect(bulkMatches(bulk(k), f)).toBe(false);
  });
});

describe('bulkCanMatch', () => {
  it('is true with nothing on, and for a Type or Food pill some bulk kind satisfies', () => {
    expect(bulkCanMatch(NO_FILTERS)).toBe(true);
    expect(bulkCanMatch(on({ type: ['grocer'] }))).toBe(true);
    expect(bulkCanMatch(on({ food: ['fresh'] }))).toBe(true);
  });
  it('is false when no bulk kind can match', () => {
    expect(bulkCanMatch(on({ cost: ['free'] }))).toBe(false);
    expect(bulkCanMatch(on({ access: ['referral'] }))).toBe(false);
    expect(bulkCanMatch(on({ checkedOnly: true }))).toBe(false);
    expect(bulkCanMatch(on({ type: ['market'] }))).toBe(false);
    expect(bulkCanMatch(on({ food: ['packaged'] }))).toBe(false);
  });
});
