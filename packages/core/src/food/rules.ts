import { matchAllergies } from './allergens';
import type { AllergenId, DietRule, FoodInfo, FoodProfile, RuleFlags, TriState } from './types';

export type Fit = 'fits' | 'check' | 'out';

/** The spec's rule table: a rule is met only by `met`, excluded by `excludes`, and anything else (unknown) needs a check. */
const RULE_TABLE: Record<DietRule, { flag: keyof RuleFlags & ('halal' | 'kosher' | 'vegetarian' | 'vegan' | 'beef' | 'pork' | 'alcohol' | 'gluten'); met: TriState; excludes: TriState }> = {
  halal: { flag: 'halal', met: 'yes', excludes: 'no' },
  kosher: { flag: 'kosher', met: 'yes', excludes: 'no' },
  vegetarian: { flag: 'vegetarian', met: 'yes', excludes: 'no' },
  vegan: { flag: 'vegan', met: 'yes', excludes: 'no' },
  noBeef: { flag: 'beef', met: 'no', excludes: 'yes' },
  noPork: { flag: 'pork', met: 'no', excludes: 'yes' },
  noAlcohol: { flag: 'alcohol', met: 'no', excludes: 'yes' },
  glutenFree: { flag: 'gluten', met: 'no', excludes: 'yes' },
};

const SEVERITY: Record<Fit, number> = { fits: 0, check: 1, out: 2 };
const worst = (...fits: Fit[]): Fit => fits.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), 'fits');

/** `out` if any rule excludes, else `check` if any flag is unknown or there is no record, else `fits`. */
export function fitsRules(info: FoodInfo | undefined, rules: DietRule[]): Fit {
  if (rules.length === 0) return 'fits';
  if (!info) return 'check';
  let result: Fit = 'fits';
  for (const rule of rules) {
    const { flag, met, excludes } = RULE_TABLE[rule];
    const value = info.flags[flag];
    if (value === excludes) return 'out';
    if (value !== met) result = 'check';
  }
  return result;
}

/** `out` if an avoided allergen is listed; `check` if the list is incomplete or a word could not be mapped. */
export function fitsAllergies(info: FoodInfo | undefined, ids: AllergenId[], unmatched: string[]): Fit {
  if (ids.length === 0 && unmatched.length === 0) return 'fits';
  if (!info) return 'check';
  if (ids.some((id) => info.flags.allergens.includes(id))) return 'out';
  return !info.flags.allergensKnown || unmatched.length > 0 ? 'check' : 'fits';
}

/** Rules and allergies combined. No profile, or nothing chosen, fits. */
export function fitsProfile(info: FoodInfo | undefined, food: FoodProfile | undefined): Fit {
  if (!food) return 'fits';
  const { ids, unmatched } = matchAllergies(food.allergies);
  return worst(fitsRules(info, food.rules), fitsAllergies(info, ids, unmatched));
}

/** Which "use certified meat" line applies: only when the dish uses such meat and the person chose that rule. */
export function certifiedMeatNote(info: FoodInfo | undefined, rules: DietRule[]): 'halal' | 'kosher' | null {
  if (!info?.flags.certifiedMeat) return null;
  if (rules.includes('halal')) return 'halal';
  return rules.includes('kosher') ? 'kosher' : null;
}
