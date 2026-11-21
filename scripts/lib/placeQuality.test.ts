// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { QUALITY_REASONS, MAX_NAMES_PER_POINT, dropCentroids, qualityDrop } from './placeQuality.mjs';

// TEST DATA ONLY: every name and address below is invented to exercise a rule.
const p = (name: string, address = '12 Test Street', extra: Record<string, unknown> = {}) => ({ id: `ovt-${name}`, name, address, kind: 'cafe-restaurant', lat: -37.8, lng: 144.96, confidence: 0.9, ...extra });
const drop = (name: string, address?: string) => qualityDrop(p(name, address));

describe('truncated names', () => {
  it.each(['Wyndham Community And', 'Test Kitchen &', 'House Of', 'Cafe at the', 'Bar At', 'Fish for', 'Hire A', 'Bean To', 'Pizza with', 'Dip in', 'Cafe -', 'Bakery,', 'Test Cafe (Westfield'])('drops "%s"', (n) => {
    expect(drop(n)).toBe('truncated-name');
  });
  it.each(['Wyndham Community And Co', 'Mario & Sons', 'The Baker Boys', 'Andrea Cafe', 'Atlas Bakery', 'Inn Foods', 'Lv coffee, takeaway and eat in', 'Dine In', 'Hot Bread (Westfield)', 'Joe’s Cafe'])('keeps "%s"', (n) => {
    expect(drop(n)).toBeNull();
  });
});

describe('junk names', () => {
  it.each(['x', '1915', '12', '正', 'Dealgo.com.au', 'www.test-cafe.com', 'https://test.example', '0412 345 678', '(03) 9123 4567', 'Pizza Shop', 'Cafe Store', 'RESTAURANT', 'Takeaway Pizza', 'The Bakery Cafe', 'Fountain Gate                  - (Opening: Soon)'])('drops "%s"', (n) => {
    expect(drop(n)).toBe('junk-name');
  });
  it.each(['F8', '正斗', 'ALDI', 'KFC', 'MAD MEX DONCASTER', 'Pho 93', 'MAD MEX SOUTHERN CROSS TOWER', 'Fish & Chips Palace', 'Pizza Hut', 'Joe Cafe', 'Bar649', 'Coffee Club', 'Kebab Club', 'Lot 88', '11 Eleven Cafe'])('keeps "%s"', (n) => {
    expect(drop(n)).toBeNull();
  });
});

describe('addresses', () => {
  it.each(['Lower Dandenong Road', 'Australia', 'The Toolshed', 'Lincoln Park', 'Walker St', 'Melbourne', '451', '89 20', '2 Fl', 'K Rd', 'HWKR', ''])('drops "%s"', (a) => {
    expect(drop('Test Cafe', a)).toBe('bad-address');
  });
  it.each(['12 Test Street', '6/92 Melbourne Hill Rd', 'Shop 5, 10 Foo St', '1-3 Bar Ave', '12A Smith St', 'Cnr Hume Highway & Donnybrook Rd', 'Victoria St & Louisa Street', 'Shannon Ave &, Aberdeen St', 'and, Casey Central, Cnr Narre Warren Road, Littlecroft Ave', 'Corner of Foo and Bar Streets', 'Plaza Shopping Centre, Separation St, Dennis St', 'Westfield Plenty Valley Mill Park', 'Brimbank Central Shopping Centre', 'Separation St, Dennis St'])('keeps "%s"', (a) => {
    expect(drop('Test Cafe', a)).toBeNull();
  });
});

describe('dropCentroids', () => {
  const at = (n: number, lat = -38.02323, lng = 145.30252) => Array.from({ length: n }, (_, i) => p(`Shop ${i}`, '1 Mall Road', { id: `ovt-${lat}-${i}`, lat, lng }));
  it('drops every record at a point holding more than the limit of distinct names, and keeps a point at the limit', () => {
    expect(MAX_NAMES_PER_POINT).toBe(8);
    const r = dropCentroids([...at(9), ...at(8, -37.9, 144.9)]);
    expect(r.dropped).toHaveLength(9);
    expect(r.kept).toHaveLength(8);
  });
  it('counts distinct normalised names: repeats of one chain name at one point do not make a centroid', () => {
    const same = Array.from({ length: 12 }, (_, i) => p("Joe's Cafe", '1 Mall Road', { id: `ovt-j${i}` }));
    expect(dropCentroids(same).dropped).toHaveLength(0);
  });
  it('treats points equal at five decimals as one point', () => {
    const list = Array.from({ length: 9 }, (_, i) => p(`Shop ${i}`, '1 Mall Road', { lat: -38.023231 + i * 1e-7, lng: 145.30252 }));
    expect(dropCentroids(list).dropped).toHaveLength(9);
  });
  it('is deterministic in any input order', () => {
    const list = at(9);
    expect(dropCentroids([...list].reverse()).dropped.map((x: any) => x.id).sort()).toEqual(dropCentroids(list).dropped.map((x: any) => x.id).sort());
  });
});

it('lists the reasons', () => {
  expect(QUALITY_REASONS).toEqual(['truncated-name', 'junk-name', 'bad-address', 'centroid']);
});
