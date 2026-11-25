import type { ReactNode } from 'react';

/** The fixed set of food drawings. Our own simple strokes on a 24px grid, in currentColor, like the dock and place icons. */
export const ICON_KINDS = ['bowl', 'soup', 'noodles', 'rice', 'sandwich', 'egg', 'salad', 'curry', 'pasta', 'tray', 'plate'] as const;
export type IconKind = (typeof ICON_KINDS)[number];

/** One table: recipe id to icon. A recipe not listed gets the default bowl. A test checks that every recipe is listed. */
export const RECIPE_ICON: Record<string, IconKind> = {
  'scrambled-eggs-toast': 'egg', 'egg-and-pea-rice': 'rice', 'tuna-tomato-pasta': 'pasta', 'lentil-vegetable-soup': 'soup',
  'beans-on-toast': 'sandwich', 'banana-porridge': 'bowl', 'chickpea-tomato-stew': 'curry', 'potato-pea-mash': 'bowl',
  'corn-fritters': 'plate', 'salmon-potato-cakes': 'plate', 'kidney-bean-rice': 'rice', 'cheese-tomato-toastie': 'sandwich',
  'chana-masala': 'curry', 'aloo-gobi': 'curry', 'palak-dal': 'curry', 'simple-chicken-curry': 'curry',
  'cabbage-poriyal': 'plate', 'tomato-rice': 'rice', 'egg-curry': 'curry', 'potato-pea-masala': 'curry',
  'tomato-egg-stir-fry': 'egg', 'tofu-choy-sum-stir-fry': 'plate', 'wombok-mushroom-noodles': 'noodles', 'chicken-broccoli-stir-fry': 'plate',
  'pasta-pomodoro': 'pasta', 'minestrone-style-soup': 'soup', 'spaghetti-spinach-ricotta': 'pasta', 'beef-ragu-spaghetti': 'pasta',
  'village-salad': 'salad', 'spinach-rice': 'rice', 'greek-lentil-soup': 'soup', 'chicken-and-potato-tray': 'tray',
  'hummus-pita-plate': 'sandwich', 'lentils-and-rice': 'rice', 'pita-salad': 'salad', 'lamb-kofta-plate': 'plate',
  'tofu-noodle-salad': 'noodles', 'chicken-cabbage-salad': 'salad', 'tomato-tofu-rice': 'rice', 'vinegar-garlic-chicken': 'plate',
  'eggplant-omelette': 'egg', 'sauteed-cabbage-egg': 'egg', 'tomato-pepper-eggs': 'egg', 'tomato-bulgur-pilaf': 'rice',
  'chicken-veg-nuggets': 'plate', 'beef-veg-sausage-rolls': 'plate', 'lentil-sweet-potato-patties': 'plate',
  'ginger-chicken-veg-stir-fry': 'rice', 'san-choy-bow': 'salad', 'simple-beef-nachos': 'tray', 'chicken-avocado-soft-tacos': 'sandwich',
  'anzac-biscuits-home': 'plate', 'carrot-date-oat-biscuit': 'plate', 'banana-blueberry-smoothie': 'bowl', 'strawberry-yoghurt-smoothie': 'bowl',
  'eggplant-chickpea-stew': 'curry', 'coconut-dhal': 'curry', 'green-bean-coconut-curry': 'curry', 'pumpkin-coconut-curry': 'curry',
};

export const iconKindFor = (recipeId: string): IconKind => RECIPE_ICON[recipeId] ?? 'bowl';

const BOWL = 'M3 12h18a9 9 0 01-18 0z';
const DRAWINGS: Record<IconKind, ReactNode> = {
  bowl: <path d={`${BOWL}M8 8.5c1.5-1 2.5 1 4 0s2.5 1 4 0`} />,
  soup: <path d={`${BOWL}M8 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4`} />,
  noodles: <path d={`${BOWL}M7 9c1.5-2 3 2 4.5 0s3 2 4.5 0M15 4l-3 7`} />,
  rice: <path d={`${BOWL}M6.5 12a5.5 5.5 0 0111 0M10 9.5v.01M13 8.5v.01M14.5 10.5v.01`} />,
  sandwich: <path d="M4 10c0-3 3.5-5 8-5s8 2 8 5zM4 13.5h16M5 17h14a1 1 0 010 2H5a1 1 0 010-2z" />,
  egg: <path d="M12 4c4 0 8 2 8 6.5 0 4-3 7.5-8 7.5s-8-2.5-8-6.5C4 6 8 4 12 4zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />,
  salad: <path d={`${BOWL}M7 9c0-3 3-4 5-4 0 3-2 4-5 4zM12 9c1-3 4-3 6-2-1 2-3 3-6 2z`} />,
  curry: <path d={`${BOWL}M7 8.5c1-1.5 2-1.5 3 0M12 8.5v.01M14 8c1-1 2.5-.5 3 .5`} />,
  pasta: <path d="M12 4a8 8 0 100 16 8 8 0 000-16zM12 8.5a3.5 3.5 0 100 7M9 12a3 3 0 106 0M16.5 4.5L12 12" />,
  tray: <path d="M3 10h18v7H3zM1.5 12h1.5M21 12h1.5M7 10V8M12 10V6M17 10V8" />,
  plate: <path d="M12 4a8 8 0 100 16 8 8 0 000-16zM9 10.5a2 2 0 100 .01M15 10a2.5 2.5 0 100 .01M12 15.5v.01" />,
};

const SIZE = { sm: 'size-12', lg: 'size-20', fill: 'aspect-square w-full max-w-[140px]' } as const;

/** A round food icon. Decorative: the recipe name is always printed beside it. */
export function RecipeIcon({ kind, size = 'sm', className = '' }: { kind: IconKind; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-surface text-ink ${SIZE[size]} ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false" className="size-3/5">
        {DRAWINGS[kind]}
      </svg>
    </span>
  );
}
