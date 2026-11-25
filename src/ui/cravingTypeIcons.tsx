import type { CravingTypeId } from '@culinerity/core';
import type { IconKind } from './recipeIcons';

const BOWL = 'M3 12h18a9 9 0 01-18 0zM8 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4';

const PATHS: Record<CravingTypeId | 'all', string> = {
  all: 'M5 5.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0zM14 5.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0zM5 15.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0zM14 15.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0z',
  'fast-food': 'M4 10c0-3 3.5-5 8-5s8 2 8 5zM4 13.5h16M5 17h14a1 1 0 010 2H5a1 1 0 010-2z',
  sweet: 'M9 12a3 3 0 106 0 3 3 0 00-6 0zM9.5 10L4 7v10l5.5-3M14.5 10L20 7v10l-5.5-3',
  'salty-crunchy': 'M6 10h12l-1.5 10h-9zM8 10V4M11 10V3M14 10V4.5M16.5 10V5.5',
  'hot-meals': BOWL,
  drinks: 'M6 8h12l-1.5 12h-9zM6 12h12M13 8l2-5h3',
  bakery: 'M4 11a4 4 0 014-4h8a4 4 0 014 4v1H4zM5 12v7h14v-7',
};

/** A small round-pill glyph: our own strokes, currentColor, decorative. */
export function CravingTypeIcon({ type }: { type: CravingTypeId | 'all' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0">
      <path d={PATHS[type]} />
    </svg>
  );
}

/** Round icon for a craving that has no photo (a drawing from the recipe icon set). */
export const CRAVING_ICON: Record<string, IconKind> = {
  'chicken-nuggets': 'plate', 'fish-and-chips': 'plate', 'sausage-roll': 'plate', 'chinese-takeaway': 'rice', nachos: 'tray',
  'tacos-burritos': 'sandwich', 'anzac-biscuits': 'plate', milkshake: 'bowl', 'butter-chicken-jar-sauce': 'curry', 'lasagne-frozen': 'pasta',
};
