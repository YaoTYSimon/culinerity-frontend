// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dropNearChecked, similarReliefNames } from './checkedOverlap.mjs';

const checked = [{ name: 'Earth Village Breadland', lat: -37.682, lng: 144.584 }, { name: 'BANSIC Foodhub, Heidelberg West', lat: -37.7486, lng: 145.043 }];
const row = (id: string, name: string, lat: number, lng: number, kind = 'food-relief') => ({ id, name, kind, lat, lng });
const north = (m: number) => -37.682 + m / 111195;

describe('similarReliefNames', () => {
  it('matches on a distinctive word or a compacted name, never on shared relief words', () => {
    expect(similarReliefNames('Earth Village Eats', 'Earth Village Breadland')).toBe(true);
    expect(similarReliefNames('BANSIC Food Hub', 'BANSIC Foodhub, Heidelberg West')).toBe(true);
    expect(similarReliefNames('Merri Food Hub', 'Earth Village Breadland')).toBe(false);
    expect(similarReliefNames('Community Pantry', 'Another Community Pantry')).toBe(false);
  });
});

describe('dropNearChecked', () => {
  it('drops a similar-named food relief row within 100 m and keeps it beyond, or with a different name', () => {
    const rows = [row('a', 'Earth Village Eats', north(60), 144.584), row('b', 'Earth Village Eats', north(400), 144.584), row('c', 'Other Pantry', north(10), 144.584)];
    const r = dropNearChecked(rows, checked);
    expect(r.dropped).toEqual([{ id: 'a', name: 'Earth Village Eats', of: 'Earth Village Breadland' }]);
    expect(r.kept.map((p) => p.id)).toEqual(['b', 'c']);
  });
  it('never touches other kinds', () => {
    const rows = [row('a', 'Earth Village Eats', north(10), 144.584, 'cafe-restaurant')];
    expect(dropNearChecked(rows, checked).kept).toHaveLength(1);
  });
});
