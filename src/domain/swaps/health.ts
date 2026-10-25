import type { Nutrition } from '../types';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * The single health score: 0-100, higher is healthier. Per-serve figures.
 * Starts at 40; rewards protein and fibre; penalises sugar, sodium and energy
 * density (kJ per serve). Each term is capped so no one nutrient dominates.
 */
export function healthScore(n: Nutrition): number {
  const protein = clamp(n.proteinG, 0, 35) * 1.0; // up to +35
  const fibre = clamp(n.fibreG, 0, 10) * 2.5; // up to +25
  const sugar = clamp(n.sugarG, 0, 60) * 0.7; // up to -42
  const sodium = (clamp(n.sodiumMg, 0, 2000) / 100) * 0.8; // up to -16
  const energy = clamp(n.energyKj, 0, 3000) * 0.008; // up to -24
  return clamp(Math.round(40 + protein + fibre - sugar - sodium - energy), 0, 100);
}
