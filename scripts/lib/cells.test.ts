// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CELL_DEG, cellKey, neighbours } from './cells.mjs';

describe('cellKey', () => {
  it('uses 0.1 degree cells from the box corner', () => {
    expect(CELL_DEG).toBe(0.1);
    expect(cellKey(-38.6, 144.3)).toBe('0_0');
    expect(cellKey(-37.8, 144.96)).toBe('6_8');
  });
  // [lat, lng, key]: points exactly on a boundary go to the higher cell; the far box edge to the last cell.
  it.each([
    [-38.5, 144.3, '0_1'],
    [-38.6, 144.4, '1_0'],
    [-37.9, 144.4, '1_7'],
    [-37.4, 145.8, '14_11'],
    [-37.4001, 145.7999, '14_11'],
  ])('puts (%s, %s) in %s', (lat, lng, key) => {
    expect(cellKey(lat, lng)).toBe(key);
  });
});

describe('neighbours', () => {
  it('returns nine keys row-major for an interior cell, including itself', () => {
    expect(neighbours('5_5')).toEqual(['4_4', '5_4', '6_4', '4_5', '5_5', '6_5', '4_6', '5_6', '6_6']);
  });
  it('is clipped at the box edge', () => {
    expect(neighbours('0_0')).toEqual(['0_0', '1_0', '0_1', '1_1']);
    expect(neighbours('14_11')).toHaveLength(4);
    expect(neighbours('7_0')).toHaveLength(6);
  });
});
