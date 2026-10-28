import type { Nutrition, PricePoint } from '../domain/types';

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
  /** Release or version of a database source, e.g. "Release 3". */
  version?: string;
  /** Attribution wording the licence asks for, shown in the credits area. */
  attribution?: string;
  verification: 'primary' | 'secondary';
}

/** Per-100g values exactly as read from the source row. */
export interface Per100g {
  energyKj: number;
  proteinG: number;
  fibreG: number;
  sugarG: number;
  sodiumMg: number;
}

export type AttributeKey = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'beef' | 'pork' | 'alcohol' | 'gluten' | 'allergens';

/** One attribute row per ingredient; the generator derives item flags from these. */
export interface IngredientAttr {
  id: string;
  name: string;
  /** Present only for ingredients used in a computed recipe. */
  per100g?: Per100g;
  nutritionSourceId?: string;
  /** The source's own code for the food row the values were read from. */
  nutritionCode?: string;
  vegetarian: TriState;
  vegan: TriState;
  halal: TriState | 'certified-meat';
  kosher: TriState | 'certified-meat';
  beef: TriState;
  pork: TriState;
  alcohol: TriState;
  gluten: TriState;
  allergens: AllergenId[] | 'unknown';
  /** True when `allergens` lists only the allergens known to be present and others may be too (packaged goods). */
  allergensPartial?: boolean;
  /** Source for every non-`unknown` attribute unless `attributeSources` names a different one. */
  attributeSourceId?: string;
  attributeSources?: Partial<Record<AttributeKey, string>>;
}

/** An item the catalogue adds: a food (alternative) or a craving, priced and with computed nutrition. */
export interface CulturalItem {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  unitLabel: string;
  kind: 'craving' | 'alternative';
}

export interface CulturalCatalogue {
  items: CulturalItem[];
  prices: PricePoint[];
  nutrition: Nutrition[];
  swaps: Array<{ cravingId: string; alternativeId: string; note: string }>;
  foodInfo: FoodInfo[];
  /** New craving ids, in file order (after the ten popular ones). */
  cravingIds: string[];
}


export interface CulturalData {
  generatedAt: string;
  sources: SourceRecord[];
  traditions: Tradition[];
  occasions: OccasionDef[];
  calendar: CalendarRow[];
  catalogue: CulturalCatalogue;
  notFound: string[];
}
