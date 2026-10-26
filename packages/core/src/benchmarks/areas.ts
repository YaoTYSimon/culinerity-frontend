import type { Area } from './types';

/** The drawn range of the SEIFA scale, and its national average (the index is built so the average is 1,000). */
export const SEIFA_SCALE = { min: 700, max: 1200, average: 1000 } as const;

/** A copy sorted with the lowest score (most disadvantaged) first. */
export function areasByDisadvantage(areas: Area[]): Area[] {
  return areas.slice().sort((a, b) => a.seifaIrsdScore - b.seifaIrsdScore);
}

/** Where a score sits along the scale, 0 to 100, clamped to the drawn range. */
export function seifaPosition(score: number): number {
  const { min, max } = SEIFA_SCALE;
  return Math.min(100, Math.max(0, ((score - min) / (max - min)) * 100));
}
