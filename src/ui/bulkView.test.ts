import { describe, expect, it } from 'vitest';
import type { BulkPlace } from '@culinerity/core';
import { bulkView } from './bulkView';
import type { BulkState } from './useBulkPlaces';

const at = { lat: -37.8136, lng: 144.9631 };
const p = (id: string, kind: BulkPlace['kind'], lat: number): BulkPlace => ({
  id, name: id, kind, lat, lng: 144.9631, address: 'x', price: 'unknown', source: 'overture', sourceDataset: 'meta', release: '2026-10-21.0', licence: 'CC0-1.0',
});
const ready = (extra: Partial<Extract<BulkState, { status: 'ready' }>> = {}): BulkState => ({
  status: 'ready', places: [p('b', 'bakery', -37.82), p('g', 'greengrocer', -37.81)], failedCells: [], release: '2026-10-21.0', ...extra,
});

describe('bulkView', () => {
  it('draws nothing while loading or when the list is not published', () => {
    expect(bulkView({ status: 'none' }, at, 'all', '2026-11-03')).toEqual({ mode: 'none' });
  });
  it('shows nearest first when fresh', () => {
    const v = bulkView(ready(), at, 'all', '2026-11-03');
    expect(v).toMatchObject({ mode: 'shown', old: false, failed: false, release: '2026-10-21.0' });
    expect(v.mode === 'shown' && v.ranked.map((r) => r.place.id)).toEqual(['g', 'b']);
  });
  it('Fresh produce keeps the greengrocer only', () => {
    const v = bulkView(ready(), at, 'fresh', '2026-11-03');
    expect(v.mode === 'shown' && v.ranked.map((r) => r.place.id)).toEqual(['g']);
  });
  it('Free and Low cost leave the tier out', () => {
    expect(bulkView(ready(), at, 'free', '2026-11-03')).toEqual({ mode: 'none' });
    expect(bulkView(ready(), at, 'low-cost', '2026-11-03')).toEqual({ mode: 'none' });
  });
  it('marks old after 6 months and hides once older than 12', () => {
    expect(bulkView(ready(), at, 'all', '2027-04-22')).toMatchObject({ mode: 'shown', old: true });
    expect(bulkView(ready(), at, 'all', '2027-10-22')).toEqual({ mode: 'hidden' });
  });
  it('flags a failed cell and keeps the rest', () => {
    expect(bulkView(ready({ failedCells: ['1_1'] }), at, 'all', '2026-11-03')).toMatchObject({ mode: 'shown', failed: true });
  });
});
