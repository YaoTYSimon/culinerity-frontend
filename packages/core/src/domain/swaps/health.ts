import type { Nutrition } from '../types';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Raw score range that maps onto 0-100. Raw values outside it are clamped. */
const RAW_MIN = -20;
const RAW_MAX = 120;

/**
 * The single health score: 0-100 (one decimal), higher is healthier. Per-serve figures.
 * raw = 60 baseline
 *     + protein (cap 35, x1) + fibre (cap 10, x2.5)
 *     + lightness bonus (up to +30 for near-zero energy, fading to 0 at 1500 kJ)
 *     - sugar (cap 60, x0.7) - sodium (cap 2000 mg, 0.8 per 100 mg) - energy (cap 3000 kJ, x0.008)
 * then linearly rescaled from [RAW_MIN, RAW_MAX] so distinct items spread across the scale
 * instead of piling up at 0.
 */
export function healthScore(n: Nutrition): number {
  const protein = clamp(n.proteinG, 0, 35);
  const fibre = clamp(n.fibreG, 0, 10) * 2.5;
  const lightness = 30 * (1 - clamp(n.energyKj, 0, 1500) / 1500);
  const sugar = clamp(n.sugarG, 0, 60) * 0.7;
  const sodium = (clamp(n.sodiumMg, 0, 2000) / 100) * 0.8;
  const energy = clamp(n.energyKj, 0, 3000) * 0.008;
  const raw = 60 + protein + fibre + lightness - sugar - sodium - energy;
  const scaled = ((clamp(raw, RAW_MIN, RAW_MAX) - RAW_MIN) / (RAW_MAX - RAW_MIN)) * 100;
  return Math.round(scaled * 10) / 10;
}
