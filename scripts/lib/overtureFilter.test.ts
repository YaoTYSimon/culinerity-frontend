// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATASET_LICENCES, DROP_REASONS, ALLOWED_TAXONOMY_PREFIXES, dedupe, distanceMeters, filterPlace, kindForTaxonomy, normaliseName, runPipeline, sortPlaces, taxonomyPath } from './overtureFilter.mjs';
import { validateBulkPlaces } from './validateBulk.mjs';
import { BULK_KINDS, BULK_LICENCES } from '../../packages/core/src/places/tier';

// TEST DATA ONLY: scripts/fixtures/overture-sample.json holds invented rows, none is a real place.
const fixture = JSON.parse(readFileSync(new URL('../fixtures/overture-sample.json', import.meta.url), 'utf8'));
const rows: any[] = fixture.rows;
const opts = { release: '2026-09-17.0', taxonomy: fixture.taxonomy };
const row = (id: string) => rows.find((r) => r.id === id);
const filtered = (id: string) => filterPlace(row(id), opts);

describe('fixture', () => {
  it('is marked as test data and every row is synthetic', () => {
    expect(fixture._note).toMatch(/TEST DATA ONLY/);
    expect(rows.length).toBeGreaterThanOrEqual(40);
    for (const r of rows) expect(r.id).toMatch(/^TEST-/);
  });
});

describe('filterPlace: one case per drop reason', () => {
  const cases: Array<[string, string]> = [
    ['TEST-CLOSED-1', 'closed'],
    ['TEST-CLOSED-2', 'closed'],
    ['TEST-NONAME-1', 'no-name'],
    ['TEST-NONAME-2', 'no-name'],
    ['TEST-NOADDR', 'no-address'],
    ['TEST-LOWCONF-1', 'low-confidence'],
    ['TEST-LOWCONF-2', 'low-confidence'],
    ['TEST-OUT-1', 'outside-box'],
    ['TEST-OUT-2', 'outside-box'],
    ['TEST-OUT-3', 'outside-box'],
    ['TEST-TAX-1', 'taxonomy'],
    ['TEST-TAX-2', 'taxonomy'],
    ['TEST-FSQ-1', 'foursquare'],
    ['TEST-FSQ-2', 'foursquare'],
    ['TEST-LIC-1', 'licence'],
    ['TEST-LIC-2', 'licence'],
  ];
  it.each(cases)('%s is dropped as %s', (id, reason) => {
    expect(filtered(id)).toEqual({ drop: reason });
  });
  it('covers every reason in the fixed list', () => {
    expect(new Set(cases.map((c) => c[1]))).toEqual(new Set(DROP_REASONS));
  });
  it('keeps an operating place and one with no operating_status; keeps the confidence floor itself', () => {
    expect(filterPlace({ ...row('TEST-001'), operating_status: 'operating' }, opts)).toHaveProperty('place');
    expect(filterPlace({ ...row('TEST-001'), confidence: 0.7 }, opts)).toHaveProperty('place');
    expect(filterPlace({ ...row('TEST-001'), confidence: 0.7 }, { ...opts, minConfidence: 0.8 })).toEqual({ drop: 'low-confidence' });
  });
  it('keeps both ends of the box', () => {
    expect(filtered('TEST-EDGE-SW')).toHaveProperty('place');
    expect(filtered('TEST-EDGE-NE')).toHaveProperty('place');
  });
  it('drops everything when given an empty taxonomy list', () => {
    expect(filterPlace(row('TEST-001'), { release: opts.release, taxonomy: [] })).toEqual({ drop: 'taxonomy' });
  });
  it('the measured allow-list maps real Overture hierarchies (release 2026-10-21.0 shape) to kinds', () => {
    const k = (h: string[]) => kindForTaxonomy(taxonomyPath({ primary: h[h.length - 1], hierarchy: h }));
    expect(k(['shopping', 'food_and_beverage_store', 'grocery_store'])).toBe('supermarket');
    expect(k(['shopping', 'food_and_beverage_store', 'grocery_store', 'asian_grocery_store'])).toBe('supermarket');
    expect(k(['shopping', 'market', 'farmers_market'])).toBe('greengrocer');
    expect(k(['food_and_drink', 'casual_eatery', 'bakery'])).toBe('bakery');
    expect(k(['food_and_drink', 'casual_eatery', 'fast_food_restaurant'])).toBe('takeaway');
    expect(k(['food_and_drink', 'restaurant', 'seafood_restaurant', 'fish_and_chips_restaurant'])).toBe('takeaway');
    expect(k(['food_and_drink', 'restaurant', 'asian_restaurant', 'thai_restaurant'])).toBe('cafe-restaurant');
    expect(k(['food_and_drink', 'casual_eatery', 'cafe'])).toBe('cafe-restaurant');
    expect(k(['food_and_drink', 'non_alcoholic_beverage_venue', 'coffee_shop'])).toBe('cafe-restaurant');
  });
  it('maps butchers, fishmongers, seafood markets and delicatessens to the fresh-food kinds (Ruling R2)', () => {
    const k = (h: string[]) => kindForTaxonomy(taxonomyPath({ primary: h[h.length - 1], hierarchy: h }));
    expect(k(['shopping', 'food_and_beverage_store', 'butcher_shop'])).toBe('butcher');
    expect(k(['shopping', 'food_and_beverage_store', 'fishmonger'])).toBe('fishmonger');
    expect(k(['shopping', 'food_and_beverage_store', 'seafood_market'])).toBe('fishmonger');
    expect(k(['food_and_drink', 'casual_eatery', 'delicatessen'])).toBe('deli');
  });
  it('keeps a row with no locality and ships the postcode, never the locality (Ruling R1)', () => {
    const r: any = filtered('TEST-NOSUBURB');
    expect(r.place).toBeDefined();
    expect(r.place).not.toHaveProperty('suburb');
    const withPc: any = filterPlace({ ...row('TEST-001'), addresses: [{ freeform: '1 Test Street', locality: 'Melbourne', postcode: '3000' }] }, opts);
    expect(withPc.place.postcode).toBe('3000');
    expect(withPc.place).not.toHaveProperty('suburb');
    expect(JSON.stringify(withPc.place)).not.toMatch(/Melbourne/);
    for (const postcode of ['', '30', 'ABCD', undefined]) {
      const p: any = filterPlace({ ...row('TEST-001'), addresses: [{ freeform: '1 Test Street', postcode }] }, opts);
      expect(p.place).not.toHaveProperty('postcode');
    }
  });
  it('excludes bars, pubs, bottle shops, internet cafes and unlisted food shops', () => {
    const k = (h: string[]) => kindForTaxonomy(taxonomyPath({ primary: h[h.length - 1], hierarchy: h }));
    expect(k(['food_and_drink', 'alcoholic_beverage_venue', 'bar'])).toBeNull();
    expect(k(['food_and_drink', 'alcoholic_beverage_venue', 'bar', 'pub'])).toBeNull();
    expect(k(['food_and_drink', 'casual_eatery', 'gastropub'])).toBeNull();
    expect(k(['shopping', 'food_and_beverage_store', 'liquor_store'])).toBeNull();
    expect(k(['food_and_drink', 'casual_eatery', 'cafe', 'internet_cafe'])).toBeNull();
    expect(k(['shopping', 'convenience_store'])).toBeNull();
    expect(k(['shopping', 'food_and_beverage_store', 'convenience_store'])).toBeNull();
    expect(k(['shopping', 'second_hand_store', 'flea_market'])).toBeNull();
  });
  it('every allow-list entry names a real bulk kind or null', () => {
    for (const [prefix, kind] of ALLOWED_TAXONOMY_PREFIXES) {
      expect(prefix.length).toBeGreaterThan(0);
      expect([null, ...BULK_KINDS]).toContain(kind);
    }
  });
  it('taxonomyPath uses the hierarchy and falls back to primary', () => {
    expect(taxonomyPath({ primary: 'cafe', hierarchy: ['food_and_drink', 'casual_eatery', 'cafe'] })).toBe('food_and_drink>casual_eatery>cafe');
    expect(taxonomyPath({ primary: 'test.produce.x' })).toBe('test.produce.x');
    expect(taxonomyPath(undefined)).toBeUndefined();
  });
  it('treats Overture "open" as open and the closed statuses as closed', () => {
    expect(filterPlace({ ...row('TEST-001'), operating_status: 'open' }, opts)).toHaveProperty('place');
    for (const s of ['permanently_closed', 'temporarily_closed'])
      expect(filterPlace({ ...row('TEST-001'), operating_status: s }, opts)).toEqual({ drop: 'closed' });
  });
  it('checks every source: a Foursquare entry anywhere drops the row; an unlisted entry is a licence drop', () => {
    const base = row('TEST-001');
    const withSources = (...d: string[]) => ({ ...base, sources: d.map((dataset) => ({ dataset })) });
    expect(filterPlace(withSources('meta', 'Foursquare'), opts)).toEqual({ drop: 'foursquare' });
    expect(filterPlace(withSources('meta', 'Mystery'), opts)).toEqual({ drop: 'licence' });
    expect(filterPlace(withSources('meta', 'Overture'), opts)).toHaveProperty('place');
    expect(filterPlace({ ...base, sources: [] }, opts)).toEqual({ drop: 'licence' });
  });
  it('builds a bulk place with no price, no hours and the dataset licence', () => {
    const r: any = filtered('TEST-001');
    expect(r.place).toMatchObject({ id: 'ovt-TEST-001', price: 'unknown', source: 'overture', release: '2026-09-17.0' });
    expect(r.place).not.toHaveProperty('hours');
  });
  it('does not take a dataset name such as "constructor" as a licence', () => {
    expect(filterPlace({ ...row('TEST-001'), sources: [{ dataset: 'constructor' }] }, opts)).toEqual({ drop: 'licence' });
  });
  it('keeps the licence table inside the core allow-list, with no foursquare', () => {
    for (const l of Object.values(DATASET_LICENCES)) expect(BULK_LICENCES).toContain(l);
    expect(Object.keys(DATASET_LICENCES).join()).not.toMatch(/foursquare/i);
  });
});

describe('kindForTaxonomy and normaliseName', () => {
  it('takes the longest matching prefix', () => {
    const table: Array<[string, string]> = [['a', 'bakery'], ['a.b', 'takeaway']];
    expect(kindForTaxonomy('a.b.c', table)).toBe('takeaway');
    expect(kindForTaxonomy('a.x', table)).toBe('bakery');
    expect(kindForTaxonomy('z', table)).toBeNull();
    expect(kindForTaxonomy(undefined, table)).toBeNull();
  });
  it('normalises case, punctuation and spaces', () => {
    expect(normaliseName("  Joe's   CAFE, (Test) ")).toBe('joes cafe test');
  });
});

describe('dedupe', () => {
  const kept = (ids: string[]) => ids.map((id) => (filtered(id) as any).place);
  it('keeps the highest confidence within 50 m and the same normalised name', () => {
    expect(dedupe(kept(['TEST-DUP-A2', 'TEST-DUP-A1'])).map((p: any) => p.id)).toEqual(['ovt-TEST-DUP-A1']);
  });
  it('keeps the lowest id on equal confidence', () => {
    expect(dedupe(kept(['TEST-DUP-B2', 'TEST-DUP-B1'])).map((p: any) => p.id)).toEqual(['ovt-TEST-DUP-B1']);
  });
  it('keeps same-name places further than 50 m apart, and different names close together', () => {
    expect(distanceMeters(row('TEST-FAR-C1'), row('TEST-FAR-C2'))).toBeGreaterThan(50);
    expect(dedupe(kept(['TEST-FAR-C1', 'TEST-FAR-C2']))).toHaveLength(2);
    expect(dedupe(kept(['TEST-NEAR-D1', 'TEST-NEAR-D2']))).toHaveLength(2);
  });
  it('measures about 111 km per degree of latitude', () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111195, -2);
  });
});

describe('runPipeline', () => {
  const run = (list = rows) => runPipeline(list, opts);
  it('sorts by id and every kept place passes validateBulkPlaces', () => {
    const { places } = run();
    expect(places.map((p: any) => p.id)).toEqual(sortPlaces(places).map((p: any) => p.id));
    expect(validateBulkPlaces(places)).toEqual([]);
    expect(places.length).toBeGreaterThan(10);
  });
  it('counts every drop reason and the duplicates removed', () => {
    const { dropCounts, duplicates, places } = run();
    expect(Object.keys(dropCounts)).toEqual(DROP_REASONS);
    expect(dropCounts).toMatchObject({ closed: 2, 'no-name': 2, 'no-address': 1, 'low-confidence': 2, 'outside-box': 3, taxonomy: 2, foursquare: 2, licence: 2 });
    expect(duplicates).toBe(2);
    expect(places.length + duplicates + Object.values(dropCounts).reduce((a: number, b: any) => a + b, 0)).toBe(rows.length);
  });
  it('gives byte-identical output twice, and whatever the input order', () => {
    const a = JSON.stringify(run());
    expect(JSON.stringify(run())).toBe(a);
    expect(JSON.stringify(run([...rows].reverse()))).toBe(a);
  });
});
