/** The kitchen equipment a recipe can need. One table: the id, the short label and the phrase used in "Needs an oven". */
export const EQUIPMENT = [
  { id: 'stove', label: 'Stove', phrase: 'a stove' },
  { id: 'oven', label: 'Oven', phrase: 'an oven' },
  { id: 'microwave', label: 'Microwave', phrase: 'a microwave' },
  { id: 'kettle', label: 'Kettle', phrase: 'a kettle' },
  { id: 'toaster', label: 'Toaster', phrase: 'a toaster' },
  { id: 'rice-cooker', label: 'Rice cooker', phrase: 'a rice cooker' },
  { id: 'slow-cooker', label: 'Slow cooker', phrase: 'a slow cooker' },
  { id: 'air-fryer', label: 'Air fryer', phrase: 'an air fryer' },
  { id: 'blender', label: 'Blender', phrase: 'a blender' },
] as const;

export type EquipmentId = (typeof EQUIPMENT)[number]['id'];

export const EQUIPMENT_IDS: readonly EquipmentId[] = EQUIPMENT.map((e) => e.id);

export const isEquipmentId = (x: unknown): x is EquipmentId => (EQUIPMENT_IDS as readonly unknown[]).includes(x);

/** Known ids only, once each, in table order. Anything else is dropped. Never throws. */
export function cleanEquipment(value: unknown): EquipmentId[] {
  if (!Array.isArray(value)) return [];
  const have = new Set(value.filter(isEquipmentId));
  return EQUIPMENT_IDS.filter((id) => have.has(id));
}

/**
 * The needed equipment a person lacks. With nothing chosen (`have` empty or absent) nothing is filtered, so it is always empty.
 */
export function lackedEquipment(needs: readonly EquipmentId[], have: readonly EquipmentId[] | undefined): EquipmentId[] {
  if (!have || have.length === 0) return [];
  return needs.filter((n) => !have.includes(n));
}

/** "an oven" or "a stove and a toaster". */
export function equipmentPhrase(ids: readonly EquipmentId[]): string {
  const parts = ids.map((id) => EQUIPMENT.find((e) => e.id === id)?.phrase ?? id);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? '');
}
