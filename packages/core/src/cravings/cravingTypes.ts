/** The types the home screen groups cravings by. Order is the pill order. */
export const CRAVING_TYPES = [
  { id: 'fast-food', label: 'Fast food' },
  { id: 'sweet', label: 'Sweet' },
  { id: 'salty-crunchy', label: 'Salty and crunchy' },
  { id: 'hot-meals', label: 'Hot meals' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'bakery', label: 'Bakery' },
] as const;

export type CravingTypeId = (typeof CRAVING_TYPES)[number]['id'];

/**
 * Every craving id to exactly one type. Explicit on purpose: a craving's `category` text does not map
 * one to one (a sausage roll is "fast food" but belongs with the bakery), and a test fails when an id
 * is missing here or stale, so a new craving cannot ship without a type.
 */
export const CRAVING_TYPE_OF: Readonly<Record<string, CravingTypeId>> = {
  burger: 'fast-food', pizza: 'fast-food', 'fried-chicken': 'fast-food', kebab: 'fast-food',
  'fish-and-chips': 'fast-food', 'tacos-burritos': 'fast-food',
  chocolate: 'sweet', 'anzac-biscuits': 'sweet',
  'hot-chips': 'salty-crunchy', nachos: 'salty-crunchy', 'chicken-nuggets': 'salty-crunchy',
  'instant-noodles': 'hot-meals', 'butter-chicken-jar-sauce': 'hot-meals', 'lasagne-frozen': 'hot-meals', 'chinese-takeaway': 'hot-meals',
  'bubble-tea': 'drinks', 'soft-drink': 'drinks', milkshake: 'drinks',
  pastry: 'bakery', 'sausage-roll': 'bakery',
};

export function cravingTypeOf(cravingId: string): CravingTypeId | undefined {
  return Object.prototype.hasOwnProperty.call(CRAVING_TYPE_OF, cravingId) ? CRAVING_TYPE_OF[cravingId] : undefined;
}

export function cravingIdsOfType(type: CravingTypeId): string[] {
  return Object.keys(CRAVING_TYPE_OF).filter((id) => CRAVING_TYPE_OF[id] === type);
}
