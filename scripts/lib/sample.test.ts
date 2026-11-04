// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CBD, DEFAULT_KIND_WEIGHTS, DEFAULT_REGION_WEIGHTS, mulberry32, regionFor, sampleStrata, stratumKey, wilson } from './sample.mjs';

// TEST DATA ONLY: generated points, none is a real place.
const kinds = ['cafe-restaurant', 'supermarket', 'butcher'];
type P = { id: string; name: string; kind: string; lat: number; lng: number };
function make(kind: string, n: number, kmNorth: number, tag: string): P[] {
  // kmNorth of the CBD, spread along a line east so each point is distinct.
  return Array.from({ length: n }, (_, i) => ({
    id: `ovt-${tag}-${String(i).padStart(4, '0')}`,
    name: `${tag} ${i} (synthetic)`,
    kind,
    lat: CBD.lat + kmNorth / 111.2 + i * 0.00001,
    lng: CBD.lng + i * 0.00002,
  }));
}
const pool: P[] = [...make('cafe-restaurant', 1000, 2, 'a'), ...make('cafe-restaurant', 40, 12, 'b'), ...make('supermarket', 700, 30, 'c'), ...make('butcher', 10, 3, 'd')];

describe('regionFor', () => {
  it.each([
    [2, 'inner'],
    [7.9, 'inner'],
    [8.1, 'middle'],
    [19.9, 'middle'],
    [20.5, 'outer'],
    [45, 'outer'],
  ])('%s km north is %s', (km, region) => {
    expect(regionFor({ lat: CBD.lat + (km as number) / 111.195, lng: CBD.lng })).toBe(region);
  });
});

describe('mulberry32', () => {
  it('is deterministic and in [0,1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    for (const x of xs) expect(x).toBeGreaterThanOrEqual(0), expect(x).toBeLessThan(1);
    expect(mulberry32(8)()).not.toBe(xs[0]);
  });
});

describe('sampleStrata', () => {
  const flat = (s: ReturnType<typeof sampleStrata>) => s.flatMap((x) => x.places.map((p: P) => p.id));
  it('same seed gives the same sample, a different seed differs', () => {
    expect(flat(sampleStrata(pool, { seed: 1 }))).toEqual(flat(sampleStrata(pool, { seed: 1 })));
    expect(flat(sampleStrata(pool, { seed: 1 }))).not.toEqual(flat(sampleStrata(pool, { seed: 2 })));
  });
  it('does not depend on the input order', () => {
    expect(flat(sampleStrata([...pool].reverse(), { seed: 3 }))).toEqual(flat(sampleStrata(pool, { seed: 3 })));
  });
  it('takes about 5 percent of a large stratum and never fewer than 30', () => {
    const s = sampleStrata(pool, { seed: 1, regionWeights: { inner: 1, middle: 1, outer: 1 }, kindWeights: {} });
    const big = s.find((x) => x.stratum === stratumKey('cafe-restaurant', 'inner'))!;
    expect(big.places.length).toBe(50);
    const mid = s.find((x) => x.stratum === stratumKey('supermarket', 'outer'))!;
    expect(mid.places.length).toBe(35);
    const min = sampleStrata(make('cafe-restaurant', 620, 2, 'e'), { seed: 1, regionWeights: {}, kindWeights: {} })[0];
    expect(min.places.length).toBe(31);
    const just = sampleStrata(make('cafe-restaurant', 100, 2, 'f'), { seed: 1, regionWeights: {}, kindWeights: {} })[0];
    expect(just.places.length).toBe(30);
  });
  it('takes a stratum of fewer than 30 whole', () => {
    const s = sampleStrata(pool, { seed: 1 });
    expect(s.find((x) => x.stratum === stratumKey('butcher', 'inner'))!.places).toHaveLength(10);
  });
  it('weights the new kinds and the outer ring up, never past the whole stratum', () => {
    expect(DEFAULT_KIND_WEIGHTS.butcher).toBeGreaterThan(1);
    expect(DEFAULT_REGION_WEIGHTS.outer).toBeGreaterThan(1);
    const w = sampleStrata(pool, { seed: 1 });
    const plain = sampleStrata(pool, { seed: 1, kindWeights: {}, regionWeights: {} });
    const n = (s: typeof w, k: string) => s.find((x) => x.stratum === k)!.places.length;
    expect(n(w, stratumKey('supermarket', 'outer'))).toBeGreaterThan(n(plain, stratumKey('supermarket', 'outer')));
    expect(n(w, stratumKey('cafe-restaurant', 'middle'))).toBe(30); // 40 places: the floor of 30, not the whole stratum
  });
  it('a bigger sample of a stratum extends nothing else (strata are independent)', () => {
    const a = sampleStrata(pool, { seed: 5 });
    const b = sampleStrata(pool.filter((p) => p.kind !== 'butcher'), { seed: 5 });
    const pick = (s: typeof a, k: string) => s.find((x) => x.stratum === k)!.places.map((p: P) => p.id);
    expect(pick(a, stratumKey('supermarket', 'outer'))).toEqual(pick(b, stratumKey('supermarket', 'outer')));
  });
  it('drops places within 50 m of an excluded place with the same normalised name', () => {
    const target = pool[3];
    const near = { name: target.name.toUpperCase(), lat: target.lat + 0.0002, lng: target.lng }; // about 22 m
    const far = { name: pool[4].name, lat: pool[4].lat + 0.001, lng: pool[4].lng }; // about 111 m
    const other = { name: 'Different name', lat: pool[5].lat, lng: pool[5].lng };
    const all = flat(sampleStrata(pool, { seed: 1, fraction: 1, exclude: [near, far, other] }));
    expect(all).not.toContain(target.id);
    expect(all).toContain(pool[4].id);
    expect(all).toContain(pool[5].id);
  });
  it('rejects a bad fraction and a missing seed', () => {
    expect(() => sampleStrata(pool, { seed: 1, fraction: 0 })).toThrow();
    expect(() => sampleStrata(pool, { seed: 1, fraction: 1.5 })).toThrow();
    expect(() => sampleStrata(pool, {} as never)).toThrow(/seed/);
  });
  it('has stable strata order and sorted places', () => {
    const s = sampleStrata(pool, { seed: 9 });
    expect(s.map((x) => x.stratum)).toEqual([...s.map((x) => x.stratum)].sort());
    for (const x of s) expect(x.places.map((p: P) => p.id)).toEqual([...x.places.map((p: P) => p.id)].sort());
    expect(new Set(kinds).size).toBe(3);
  });
});

describe('wilson', () => {
  it('matches known values', () => {
    // 90/100 -> (0.826, 0.945); 27/30 -> (0.743, 0.954) at 95 percent.
    const a = wilson(90, 100);
    expect(a.lower).toBeCloseTo(0.8256, 3);
    expect(a.upper).toBeCloseTo(0.9448, 3);
    const b = wilson(27, 30);
    expect(b.lower).toBeCloseTo(0.7438, 3);
  });
  it('handles all and none and zero', () => {
    expect(wilson(30, 30).upper).toBe(1);
    expect(wilson(30, 30).lower).toBeCloseTo(0.8865, 3);
    expect(wilson(0, 30).lower).toBe(0);
    expect(wilson(0, 0)).toEqual({ p: NaN, lower: 0, upper: 1 });
  });
  it('rejects impossible counts', () => {
    expect(() => wilson(5, 3)).toThrow();
    expect(() => wilson(-1, 3)).toThrow();
  });
});
