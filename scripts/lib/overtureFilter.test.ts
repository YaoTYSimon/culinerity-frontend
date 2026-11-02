// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATASET_LICENCES, DROP_REASONS, ALLOWED_TAXONOMY_PREFIXES, dedupe, distanceMeters, filterPlace, kindForTaxonomy, normaliseName, runPipeline, sortPlaces } from './overtureFilter.mjs';
import { validateBulkPlaces } from './validateBulk.mjs';
import { BULK_LICENCES } from '../../packages/core/src/places/tier';

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
    ['TEST-NOSUBURB', 'no-suburb'],
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
  it('drops everything while the taxonomy list is still empty (Task 2.1 fills it)', () => {
    expect(ALLOWED_TAXONOMY_PREFIXES).toEqual([]);
    expect(filterPlace(row('TEST-001'), { release: opts.release })).toEqual({ drop: 'taxonomy' });
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
    expect(dropCounts).toMatchObject({ closed: 2, 'no-name': 2, 'no-address': 1, 'no-suburb': 1, 'low-confidence': 2, 'outside-box': 3, taxonomy: 2, foursquare: 2, licence: 2 });
    expect(duplicates).toBe(2);
    expect(places.length + duplicates + Object.values(dropCounts).reduce((a: number, b: any) => a + b, 0)).toBe(rows.length);
  });
  it('gives byte-identical output twice, and whatever the input order', () => {
    const a = JSON.stringify(run());
    expect(JSON.stringify(run())).toBe(a);
    expect(JSON.stringify(run([...rows].reverse()))).toBe(a);
  });
});
