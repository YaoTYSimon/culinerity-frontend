/** Dollars saved per serve against the craving, rounded to cents. Null unless it is a real, positive saving. */
export function savingVsCraving(cravingCost: number | null | undefined, swapCost: number | null | undefined): number | null {
  if (cravingCost == null || swapCost == null) return null;
  if (!Number.isFinite(cravingCost) || !Number.isFinite(swapCost)) return null;
  const saving = Math.round((cravingCost - swapCost) * 100) / 100;
  return saving > 0 ? saving : null;
}
