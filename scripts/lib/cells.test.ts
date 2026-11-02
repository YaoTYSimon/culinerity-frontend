// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BULK_BOX as CORE_BOX, BULK_CELL_DEG, cellKey as coreCellKey, neighbourKeys } from '../../packages/core/src/places/bulk';
import { CELL_DEG, cellKey, neighbours } from './cells.mjs';
import { BULK_BOX } from './validateBulk.mjs';

describe('cellKey', () => {
  it('uses 0.015 degree cells from the box corner', () => {
    expect(CELL_DEG).toBe(0.015);
    expect(cellKey(-38.6, 144.3)).toBe('0_0');
    expect(cellKey(-37.8, 144.96)).toBe('44_53');
  });
  // [lat, lng, key]: points exactly on a boundary go to the higher cell; the far box edge to the last cell.
  it.each([
    [-38.585, 144.3, '0_1'],
    [-38.6, 144.315, '1_0'],
    [-37.91, 144.39, '6_46'],
    [-37.4, 145.8, '99_79'],
    [-37.4001, 145.7999, '99_79'],
  ])('puts (%s, %s) in %s', (lat, lng, key) => {
    expect(cellKey(lat, lng)).toBe(key);
  });
});

describe('core loader maths equals the script', () => {
  const points: Array<[number, number]> = [
    [-38.6, 144.3], [-37.4, 145.8], [-37.8136, 144.9631], [-37.91, 144.39], [-38.585, 144.315],
    [-37.4001, 145.7999], [-38.15, 144.36], [-37.9, 145.2], [-37.7, 144.7], [-38.3, 145.05],
  ];
  it('shares the box and the cell size', () => {
    expect(BULK_CELL_DEG).toBe(CELL_DEG);
    expect(CORE_BOX.lat).toEqual(BULK_BOX.lat);
    expect(CORE_BOX.lng).toEqual(BULK_BOX.lng);
  });
  it.each(points)('gives the same key and neighbours for (%s, %s)', (lat, lng) => {
    expect(coreCellKey(lat, lng)).toBe(cellKey(lat, lng));
    expect(neighbourKeys(cellKey(lat, lng))).toEqual(neighbours(cellKey(lat, lng)));
  });
});

describe('neighbours', () => {
  it('returns nine keys row-major for an interior cell, including itself', () => {
    expect(neighbours('5_5')).toEqual(['4_4', '5_4', '6_4', '4_5', '5_5', '6_5', '4_6', '5_6', '6_6']);
  });
  it('is clipped at the box edge', () => {
    expect(neighbours('0_0')).toEqual(['0_0', '1_0', '0_1', '1_1']);
    expect(neighbours('99_79')).toHaveLength(4);
    expect(neighbours('7_0')).toHaveLength(6);
  });
});
