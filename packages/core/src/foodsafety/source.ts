import { foodSafetyData } from './generated/foodsafety.generated';
import type { FoodSafetyData, FoodSafetySource } from './types';

export { foodSafetyData };

/** The sources a section's lines cite, in first-cited order. */
export function sourcesFor(sectionId: string, data: FoodSafetyData = foodSafetyData): FoodSafetySource[] {
  const section = data.sections.find((s) => s.id === sectionId);
  const ids = [...new Set((section?.lines ?? []).flatMap((l) => l.sourceIds))];
  return ids.flatMap((id) => data.sources.filter((s) => s.id === id));
}
