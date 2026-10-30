import type { Recipe } from '../recipes/types';

/** General guidance paraphrased from the NSW Food Authority leftovers page (sources: nsw-fa-leftovers). No temperatures are printed. */
const LEFTOVERS = [
  'Put leftovers in the fridge within 2 hours of cooking.',
  'Eat leftovers within 3 days.',
  'Reheat until steaming hot all the way through.',
  'Throw out food that has been left out of the fridge for more than 4 hours in total.',
];
const RICE_PASTA = 'Cooked rice and pasta are the exception: eat them within 2 days, and reheat them only once.';

/** From the NSW Food Authority cooking pages (sources: nsw-fa-cooking-temps, nsw-fa-poultry-raw-meat). The colour caution and thermometer advice come from the cooking-temperatures page; no figure is printed. */
const COOK_THROUGH = [
  'Cook chicken and mince right through to the centre, until no pink is left and the juices run clear.',
  'Colour alone is not a reliable test. A food thermometer reading is the safest check.',
  'Do not wash raw chicken, and keep raw meat away from food that is eaten without cooking.',
];

/** From the NSW Food Authority eggs page (source: nsw-fa-eggs). */
const EGG = [
  'Cook eggs until the white is completely firm and the yolk has started to thicken.',
  'Children under 2, pregnant women, people over 70 and people with a weakened immune system should not eat raw or lightly cooked eggs.',
];

/** The fixed food-safety lines for a recipe, in the app's own words. Empty when none apply. */
export function safetyLines(recipe: Recipe): string[] {
  const lines: string[] = recipe.cookThroughSourceId ? [...COOK_THROUGH] : [];
  if (recipe.ingredients.some((i) => i.ingredient === 'egg')) lines.push(...EGG);
  if (recipe.safety.length > 0) {
    lines.push(...LEFTOVERS);
    if (recipe.safety.includes('rice') || recipe.safety.includes('pasta')) lines.push(RICE_PASTA);
  }
  return lines;
}
