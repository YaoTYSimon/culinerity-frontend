import { describe, expect, it } from 'vitest';
import { areasByDisadvantage, seifaPosition, SEIFA_SCALE } from './areas';
import type { Area } from './types';

const area = (name: string, score: number): Area => ({ name, seifaIrsdScore: score, seifaDecileVic: 1, release: 'r', sourceId: 's' });

describe('areasByDisadvantage', () => {
  it('sorts lowest score (most disadvantaged) first without changing the input', () => {
    const input = [area('b', 900), area('a', 800), area('c', 1000)];
    expect(areasByDisadvantage(input).map((a) => a.name)).toEqual(['a', 'b', 'c']);
    expect(input.map((a) => a.name)).toEqual(['b', 'a', 'c']);
  });
});

describe('seifaPosition', () => {
  it('maps a score to 0-100 along the scale and clamps outside it', () => {
    expect(seifaPosition(SEIFA_SCALE.min)).toBe(0);
    expect(seifaPosition(SEIFA_SCALE.max)).toBe(100);
    expect(seifaPosition(SEIFA_SCALE.average)).toBe(60);
    expect(seifaPosition(0)).toBe(0);
    expect(seifaPosition(5000)).toBe(100);
  });
});
