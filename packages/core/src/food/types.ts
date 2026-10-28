/** Three-state flag. `unknown` never satisfies a rule. */
export type TriState = 'yes' | 'no' | 'unknown';

export const DIET_RULES = ['halal', 'kosher', 'vegetarian', 'vegan', 'noBeef', 'noPork', 'noAlcohol', 'glutenFree'] as const;
export type DietRule = (typeof DIET_RULES)[number];

export const OCCASION_IDS = [
  'ramadan', 'eid-al-fitr', 'eid-al-adha', 'lunar-new-year', 'diwali', 'lent', 'easter', 'orthodox-great-lent',
  'orthodox-easter', 'passover', 'rosh-hashanah', 'hanukkah', 'christmas',
] as const;
export type OccasionId = (typeof OCCASION_IDS)[number];

/** FSANZ mandatory declaration list (Standard 1.2.3, Schedule 9), tree nuts listed separately. */
export type AllergenId =
  | 'wheat' | 'fish' | 'crustacean' | 'mollusc' | 'egg' | 'milk' | 'lupin' | 'peanut' | 'soy' | 'sesame'
  | 'almond' | 'brazil-nut' | 'cashew' | 'hazelnut' | 'macadamia' | 'pecan' | 'pistachio' | 'pine-nut' | 'walnut'
  | 'barley' | 'oats' | 'rye' | 'sulphites';

export interface RuleFlags {
  halal: TriState;
  kosher: TriState;
  vegetarian: TriState;
  vegan: TriState;
  /** "Contains" flags: beef, pork, alcohol, gluten. */
  beef: TriState;
  pork: TriState;
  alcohol: TriState;
  gluten: TriState;
  allergens: AllergenId[];
  allergensKnown: boolean;
  /** Meat or poultry whose acceptability depends on how it was slaughtered. */
  certifiedMeat: boolean;
}

export interface FoodInfo {
  itemId: string;
  traditions: string[];
  flags: RuleFlags;
  significance?: string;
}

export interface FoodProfile {
  traditions: string[];
  rules: DietRule[];
  allergies: string[];
  occasions: OccasionId[];
  dismissed: string[];
}

export interface CulturalMeal {
  id: string;
  at: string;
  tradition: string;
  dish?: string;
  with?: 'family' | 'friends' | 'community' | 'alone';
}

/** A food region or home-cooking style, never a group of people. */
export interface Tradition {
  id: string;
  label: string;
  note?: string;
}

export interface OccasionDef {
  /** `yom-kippur` is in the dataset but never selectable. */
  id: OccasionId | 'yom-kippur';
  label: string;
  /** Shows the "gatherings can cost more" budget link. */
  gathering: boolean;
  selectable: boolean;
}

export type CalendarMethod = 'hijri-calculated' | 'computus' | 'hebcal' | 'table' | 'fixed';

/** Dates are YYYY-MM-DD, inclusive, Melbourne local. */
export interface CalendarRow {
  occasion: OccasionId | 'yom-kippur';
  start: string;
  end: string;
  approx: boolean;
  method: CalendarMethod;
  sourceId: string;
  checked: string;
  note?: string;
}

export interface SourceRecord {
  id: string;
  publisher: string;
  title: string;
  url: string;
  licence: string;
  accessed: string;
  verification: 'primary' | 'secondary';
}

/** One attribute row per ingredient; the generator derives item flags from these. */
export interface IngredientAttr {
  id: string;
  name: string;
  vegetarian: TriState;
  vegan: TriState;
  halal: TriState | 'certified-meat';
  kosher: TriState | 'certified-meat';
  beef: TriState;
  pork: TriState;
  alcohol: TriState;
  gluten: TriState;
  allergens: AllergenId[] | 'unknown';
  attributeSourceId?: string;
}

export interface CulturalData {
  generatedAt: string;
  sources: SourceRecord[];
  traditions: Tradition[];
  occasions: OccasionDef[];
  calendar: CalendarRow[];
  notFound: string[];
}
