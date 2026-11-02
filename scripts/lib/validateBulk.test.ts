// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BULK_KINDS, BULK_LICENCES } from '../../packages/core/src/places/tier';
import { BULK_BOX, BULK_KIND_LIST, BULK_LICENCE_LIST, MIN_CONFIDENCE, validateBulkPlace, validateBulkPlaces } from './validateBulk.mjs';

const good = () => ({
  id: 'ovt-08f2c1a0b3d4e5f6',
  name: 'Example Fruit Shop (synthetic)',
  kind: 'greengrocer',
  lat: -37.8,
  lng: 144.96,
  address: '1 Example St',
  postcode: '3053',
  price: 'unknown',
  confidence: 0.9,
  source: 'overture',
  sourceDataset: 'meta',
  release: '2026-09-17.0',
  licence: 'CDLA-Permissive-2.0',
});
const errs = (mut: (p: any) => void, opts?: any) => {
  const p: any = good();
  mut(p);
  return validateBulkPlace(p, opts).join('\n');
};

describe('validateBulkPlace', () => {
  it('accepts a sound place', () => {
    expect(validateBulkPlace(good())).toEqual([]);
  });
  it('keeps its lists equal to the core constants', () => {
    expect(BULK_KIND_LIST).toEqual([...BULK_KINDS]);
    expect(BULK_LICENCE_LIST).toEqual([...BULK_LICENCES]);
    expect(BULK_BOX.lat).toEqual([-38.6, -37.4]);
  });
  it('rejects any stated price, and a price field other than unknown', () => {
    expect(errs((p) => (p.price = 'budget'))).toMatch(/price/);
    expect(errs((p) => (p.priceBasis = 'stated'))).toMatch(/priceBasis/);
    expect(errs((p) => (p.hours = '9 to 5'))).toMatch(/hours/);
  });
  it('rejects a missing name, address or release', () => {
    for (const k of ['name', 'address', 'release']) expect(errs((p) => (p[k] = '  '))).toMatch(new RegExp(k));
  });
  it('takes an optional four-digit postcode and refuses a suburb or locality', () => {
    expect(errs((p) => delete p.postcode)).toBe('');
    expect(errs((p) => (p.postcode = '30'))).toMatch(/postcode/);
    expect(errs((p) => (p.postcode = 3053))).toMatch(/postcode/);
    expect(errs((p) => (p.suburb = 'Melbourne'))).toMatch(/suburb/);
    expect(errs((p) => (p.locality = 'Melbourne'))).toMatch(/suburb/);
  });
  it('accepts the fresh-food kinds', () => {
    for (const kind of ['butcher', 'fishmonger', 'deli']) expect(errs((p) => (p.kind = kind))).toBe('');
  });
  it('rejects coordinates outside Greater Melbourne or not numbers', () => {
    expect(errs((p) => (p.lat = -33.9))).toMatch(/lat/);
    expect(errs((p) => (p.lng = 151.2))).toMatch(/lng/);
    expect(errs((p) => (p.lat = '-37.8'))).toMatch(/lat/);
    expect(errs((p) => (p.lng = Number.NaN))).toMatch(/lng/);
  });
  it('rejects confidence below the threshold, NaN, and out of range', () => {
    expect(MIN_CONFIDENCE).toBe(0.7);
    expect(errs((p) => (p.confidence = 0.69))).toMatch(/confidence/);
    expect(errs((p) => (p.confidence = Number.NaN))).toMatch(/confidence/);
    expect(errs((p) => (p.confidence = 1.2))).toMatch(/confidence/);
    expect(errs((p) => (p.confidence = 0.5), { minConfidence: 0.4 })).toBe('');
  });
  it('rejects a bad kind, a bad id prefix, and a non-overture source', () => {
    expect(errs((p) => (p.kind = 'market'))).toMatch(/kind/);
    expect(errs((p) => (p.id = 'osm-123'))).toMatch(/id/);
    expect(errs((p) => (p.source = 'osm'))).toMatch(/source/);
  });
  it('rejects an unknown licence and any Foursquare-derived record', () => {
    expect(errs((p) => (p.licence = 'Apache-2.0'))).toMatch(/licence/);
    expect(errs((p) => delete p.licence)).toMatch(/licence/);
    expect(errs((p) => (p.sourceDataset = 'Foursquare'))).toMatch(/foursquare/i);
    expect(errs((p) => (p.sourceDataset = ''))).toMatch(/sourceDataset/);
  });
  it('accepts a website only when https', () => {
    expect(errs((p) => (p.website = 'https://example.com'))).toBe('');
    expect(errs((p) => (p.website = 'http://example.com'))).toMatch(/website/);
  });
});

describe('validateBulkPlaces', () => {
  it('rejects duplicate ids and mixed releases', () => {
    expect(validateBulkPlaces([good(), good()]).join('\n')).toMatch(/duplicate/i);
    const other = { ...good(), id: 'ovt-2', release: '2026-10-01.0' };
    expect(validateBulkPlaces([good(), other]).join('\n')).toMatch(/release/);
  });
  it('accepts an empty list and prefixes errors with the place id', () => {
    expect(validateBulkPlaces([])).toEqual([]);
    expect(validateBulkPlaces([{ ...good(), name: '' }]).join('\n')).toMatch(/ovt-08f2c1a0b3d4e5f6/);
  });
});
