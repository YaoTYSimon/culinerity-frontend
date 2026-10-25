export type HealthLabel = 'Healthier' | 'Similar' | 'Less healthy';

/** Scores within this many points of the craving's own count as "Similar". */
export const SIMILAR_BAND = 8;

/** Coarse health of a swap relative to the craving it replaces; null when there is nothing to compare. */
export function healthLabel(swapHealth: number, cravingHealth: number | null): HealthLabel | null {
  if (cravingHealth === null || !Number.isFinite(cravingHealth) || !Number.isFinite(swapHealth)) return null;
  const diff = swapHealth - cravingHealth;
  if (diff > SIMILAR_BAND) return 'Healthier';
  if (diff < -SIMILAR_BAND) return 'Less healthy';
  return 'Similar';
}
