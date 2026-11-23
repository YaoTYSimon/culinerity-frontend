import { describe, expect, it } from 'vitest';
import { rankBulk } from './bulk';
import type { BulkKind, BulkPlace } from './tier';
import { SUPERMARKET_BRANDS, brandOf, eateryKindsFor, whereToGet } from './whereToGet';

const here = { lat: -37.8136, lng: 144.9631 };
const place = (id: string, name: string, kind: BulkKind, m: number): BulkPlace => ({
  id: `ovt-${id}`, name, kind, lat: here.lat + m / 111195, lng: here.lng, address: '1 Test St', price: 'unknown',
  source: 'overture', sourceDataset: 'meta', release: '2026-10-21.0', licence: 'CDLA-Permissive-2.0',
});
const rank = (ps: BulkPlace[]) => rankBulk(ps, here);

describe('brandOf', () => {
  it('names the five brands', () => {
    expect(SUPERMARKET_BRANDS).toEqual(['Coles', 'Woolworths', 'Aldi', 'IGA', 'FoodWorks']);
  });
  it('matches whole brand names, case-insensitively', () => {
    expect(brandOf('Coles Footscray')).toBe('Coles');
    expect(brandOf('WOOLWORTHS Metro')).toBe('Woolworths');
    expect(brandOf('aldi')).toBe('Aldi');
    expect(brandOf('Preston IGA Xpress')).toBe('IGA');
    expect(brandOf('IGA')).toBe('IGA');
    expect(brandOf('FoodWorks Brunswick')).toBe('FoodWorks');
    expect(brandOf('Food Works Brunswick')).toBe('FoodWorks');
    expect(brandOf('Supa IGA (Coburg)')).toBe('IGA');
  });
  it('does not match a brand inside another word', () => {
    expect(brandOf('Pigalle Grocer')).toBeNull();
    expect(brandOf('Nicoles Market')).toBeNull();
    expect(brandOf('Aldine Deli')).toBeNull();
    expect(brandOf('Bigamy IGAS')).toBeNull();
    expect(brandOf('Woolworthsy')).toBeNull();
    expect(brandOf('Coleslaw Bar')).toBeNull();
  });
});

describe('eateryKindsFor', () => {
  it('maps takeaway cravings to takeaway and cafe-restaurant', () => {
    for (const id of ['chicken-nuggets', 'hot-chips', 'kebab', 'pizza', 'burger', 'fried-chicken', 'bubble-tea']) {
      expect(eateryKindsFor(id), id).toEqual(['takeaway', 'cafe-restaurant']);
    }
  });
  it('maps shop-bought cravings to nothing', () => {
    for (const id of ['chocolate', 'soft-drink', 'lasagne-frozen', 'nope']) expect(eateryKindsFor(id), id).toEqual([]);
  });
});

describe('whereToGet', () => {
  const ranked = rank([
    place('c1', 'Coles Far', 'supermarket', 2000),
    place('c2', 'Coles Near', 'supermarket', 300),
    place('w', 'Woolworths Metro', 'supermarket', 500),
    place('x', 'Corner Grocer', 'supermarket', 100),
    place('i', 'Pigalle IGA', 'supermarket', 900),
    place('t1', 'Nugget Shop', 'takeaway', 200),
    place('t2', 'Fish Bar', 'takeaway', 400),
    place('t3', 'Chicken Bar', 'takeaway', 600),
    place('t4', 'Wok Bar', 'cafe-restaurant', 700),
    place('t5', 'Far Bar', 'takeaway', 800),
    place('b', 'Bakery', 'bakery', 50),
  ]);
  it('gives the nearest supermarket for each brand, nearest first, skipping unbranded shops', () => {
    const { supermarkets } = whereToGet(ranked, 'chicken-nuggets');
    expect(supermarkets.map((r) => r.place.name)).toEqual(['Coles Near', 'Woolworths Metro', 'Pigalle IGA']);
  });
  it('gives the nearest takeaway and cafe-restaurant places, at most three', () => {
    const { eateries } = whereToGet(ranked, 'chicken-nuggets');
    expect(eateries.map((r) => r.place.name)).toEqual(['Nugget Shop', 'Fish Bar', 'Chicken Bar']);
  });
  it('gives no eateries for a shop-bought craving', () => {
    expect(whereToGet(ranked, 'chocolate').eateries).toEqual([]);
  });
  it('is empty for an empty list', () => {
    expect(whereToGet([], 'pizza')).toEqual({ supermarkets: [], eateries: [] });
  });
  it('only matches a brand in the name for supermarket kind', () => {
    const r = rank([place('k', 'Coles Cafe', 'cafe-restaurant', 10)]);
    expect(whereToGet(r, 'kebab').supermarkets).toEqual([]);
  });
});
