import { certifiedMeatNote, fitsProfile, type Fit } from '../food/rules';
import type { FoodProfile } from '../food/types';
import type { Recipe, Substitution } from '../recipes/types';
import { dateStatus, type DateStatus } from './dates';
import type { PantryItem, PantryState } from './types';

export type Tier = 'now' | 'one' | 'few';
export type MissingReason = 'absent' | 'past-date' | 'not-enough';

export interface MissingItem {
  ingredient: string;
  grams: number;
  reason: MissingReason;
  costCents: number | null;
}
export interface AppliedSub {
  from: string;
  to: string;
  note: string;
}
export interface RecipeMatch {
  recipeId: string;
  tier: Tier;
  have: number;
  core: number;
  missing: MissingItem[];
  subs: AppliedSub[];
  missingCostCents: number | null;
  /** Pantry item ids due within 3 days that this recipe uses. */
  usesSoon: string[];
  fit: 'fits' | 'check';
  kitchen: boolean;
  certifiedMeat: 'halal' | 'kosher' | null;
  /** Pantry item ids past a best-before that this recipe uses: show the "look and smell" line. */
  checkDates: string[];
}

export interface MatchInput {
  recipes: Recipe[];
  pantry: PantryState;
  food?: FoodProfile;
  now: Date;
  /** Sample dollars per kg, by ingredient id. */
  prices: Map<string, number>;
  substitutions: Substitution[];
  /** Ingredient ids whose past best-before date is treated like a use-by. */
  highRisk: Set<string>;
}

/** Assumed everywhere or text-only: never counted, never missing. */
const NEVER_COUNTED = new Set(['water', 'salt', 'pepper']);
const MAX_MISSING_SHOWN = 3;
const SOON_STATUSES = new Set<DateStatus['status']>(['soon', 'today']);
const TEN_CENTS = 10;

export const scaledGrams = (grams: number, serves: number, recipeServes: number): number => Math.max(1, Math.round((grams * serves) / recipeServes));

/** Cents for `grams` at `perKg` dollars per kg, rounded to the nearest cent; null with no price. */
function lineCents(grams: number, perKg: number | undefined): number | null {
  if (perKg === undefined) return null;
  return Math.round((grams * Math.round(perKg * 100)) / 1000);
}

const roundUpTo10 = (cents: number): number => Math.ceil(cents / TEN_CENTS) * TEN_CENTS;

function totalCents(parts: Array<number | null>): number | null {
  let sum = 0;
  for (const p of parts) {
    if (p === null) return null;
    sum += p;
  }
  return roundUpTo10(sum);
}

/** Total of the missing items rounded up to the next 10c; null when any has no price (never 0). */
export const costCents = (missing: MissingItem[]): number | null => totalCents(missing.map((m) => m.costCents));

/** Sample cost of one serve using every counted ingredient; null when any has no price. */
export function recipeCostPerServeCents(recipe: Recipe, prices: Map<string, number>): number | null {
  const total = totalCents(recipe.ingredients.map((i) => lineCents(i.grams, prices.get(i.ingredient))));
  return total === null ? null : Math.round(total / recipe.serves);
}

interface Usable {
  /** Usable pantry items by ingredient id. */
  byIngredient: Map<string, Array<{ item: PantryItem; status: DateStatus }>>;
  staples: Set<string>;
  /** Ingredient ids that only have set-aside items. */
  pastDate: Set<string>;
  setAside: PantryItem[];
}

/** Step 1: which items can be ingredients. Cooked items never are; free text never is. */
function usableItems(pantry: PantryState, now: Date, highRisk: Set<string>): Usable {
  const out: Usable = { byIngredient: new Map(), staples: new Set(pantry.staples), pastDate: new Set(), setAside: [] };
  for (const item of pantry.items) {
    if (item.dateKind === 'cooked') continue;
    const status = dateStatus(item, now, item.ingredientId !== undefined && highRisk.has(item.ingredientId));
    if (!status.usable) {
      out.setAside.push(item);
      if (item.ingredientId) out.pastDate.add(item.ingredientId);
      continue;
    }
    if (!item.ingredientId) continue;
    const list = out.byIngredient.get(item.ingredientId) ?? [];
    list.push({ item, status });
    out.byIngredient.set(item.ingredientId, list);
  }
  return out;
}

type Cover = { kind: 'have'; used: Array<{ item: PantryItem; status: DateStatus }> } | { kind: 'short'; shortBy: number } | { kind: 'none' };

/** Does the pantry cover `need` grams of the ingredient? A staple or a blank quantity means enough. */
function cover(usable: Usable, ingredient: string, need: number): Cover {
  if (usable.staples.has(ingredient)) return { kind: 'have', used: [] };
  const entries = usable.byIngredient.get(ingredient);
  if (!entries) return { kind: 'none' };
  if (entries.some((e) => e.item.grams === undefined)) return { kind: 'have', used: entries };
  const total = entries.reduce((sum, e) => sum + (e.item.grams as number), 0);
  return total >= need ? { kind: 'have', used: entries } : { kind: 'short', shortBy: need - total };
}

interface Evaluation {
  have: number;
  core: number;
  missing: MissingItem[];
  subs: AppliedSub[];
  used: Array<{ item: PantryItem; status: DateStatus }>;
}

/** Step 2: have, substitute or missing for each counted, non-optional ingredient. */
function evaluate(recipe: Recipe, input: MatchInput, usable: Usable): Evaluation {
  const ev: Evaluation = { have: 0, core: 0, missing: [], subs: [], used: [] };
  for (const row of recipe.ingredients) {
    if (row.optional || NEVER_COUNTED.has(row.ingredient)) continue;
    ev.core += 1;
    const need = scaledGrams(row.grams, input.pantry.serves, recipe.serves);
    const own = cover(usable, row.ingredient, need);
    if (own.kind === 'have') {
      ev.have += 1;
      ev.used.push(...own.used);
      continue;
    }
    const sub = own.kind === 'none' ? input.substitutions.find((s) => s.from === row.ingredient && cover(usable, s.to, need).kind === 'have') : undefined;
    if (sub) {
      ev.have += 1;
      ev.subs.push({ from: sub.from, to: sub.to, note: sub.note });
      ev.used.push(...(cover(usable, sub.to, need) as Extract<Cover, { kind: 'have' }>).used);
      continue;
    }
    const grams = own.kind === 'short' ? own.shortBy : need;
    const reason: MissingReason = own.kind === 'short' ? 'not-enough' : usable.pastDate.has(row.ingredient) ? 'past-date' : 'absent';
    ev.missing.push({ ingredient: row.ingredient, grams, reason, costCents: lineCents(grams, input.prices.get(row.ingredient)) });
  }
  return ev;
}

const tierOf = (missing: number): Tier | null => (missing === 0 ? 'now' : missing === 1 ? 'one' : missing <= MAX_MISSING_SHOWN ? 'few' : null);

const TIER_ORDER: Record<Tier, number> = { now: 0, one: 1, few: 2 };

const sameTradition = (recipe: Recipe, food: FoodProfile | undefined): boolean => {
  if (!food) return false;
  const chosen = new Set(food.traditions.map((t) => t.toLowerCase()));
  return recipe.traditions.some((t) => chosen.has(t.toLowerCase()));
};

const coverage = (m: RecipeMatch): number => (m.core === 0 ? 1 : m.have / m.core);

/** Step 5: tier, fits before check, more use-soon, kitchen, coverage, cost (null last), name. Array.sort is stable, so ties keep input order. */
function compareMatches(nameOf: (id: string) => string) {
  return (a: RecipeMatch, b: RecipeMatch): number =>
    TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
    Number(a.fit === 'check') - Number(b.fit === 'check') ||
    b.usesSoon.length - a.usesSoon.length ||
    Number(b.kitchen) - Number(a.kitchen) ||
    coverage(b) - coverage(a) ||
    (a.missingCostCents === null ? 1 : 0) - (b.missingCostCents === null ? 1 : 0) ||
    (a.missingCostCents ?? 0) - (b.missingCostCents ?? 0) ||
    nameOf(a.recipeId).localeCompare(nameOf(b.recipeId));
}

export function matchRecipes(input: MatchInput): { matches: RecipeMatch[]; hidden: number; setAside: PantryItem[] } {
  const usable = usableItems(input.pantry, input.now, input.highRisk);
  const matches: RecipeMatch[] = [];
  let hidden = 0;
  for (const recipe of input.recipes) {
    const ev = evaluate(recipe, input, usable);
    const tier = tierOf(ev.missing.length);
    if (!tier) continue;
    const fit: Fit = fitsProfile(recipe.info, input.food);
    if (fit === 'out') {
      hidden += 1;
      continue;
    }
    const used = [...new Map(ev.used.map((u) => [u.item.id, u])).values()];
    matches.push({
      recipeId: recipe.id,
      tier,
      have: ev.have,
      core: ev.core,
      missing: ev.missing,
      subs: ev.subs,
      missingCostCents: costCents(ev.missing),
      usesSoon: used.filter((u) => SOON_STATUSES.has(u.status.status)).map((u) => u.item.id),
      fit,
      kitchen: sameTradition(recipe, input.food),
      certifiedMeat: input.food ? certifiedMeatNote(recipe.info, input.food.rules) : null,
      checkDates: used.filter((u) => u.status.status === 'check-look').map((u) => u.item.id),
    });
  }
  const names = new Map(input.recipes.map((r) => [r.id, r.name]));
  matches.sort(compareMatches((id) => names.get(id) ?? id));
  return { matches, hidden, setAside: usable.setAside };
}

/** The single missing ingredients that unlock the most `one`-tier recipes; ties by id. */
export function suggestAdditions(matches: RecipeMatch[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const m of matches) if (m.tier === 'one') counts.set(m.missing[0].ingredient, (counts.get(m.missing[0].ingredient) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([id]) => id);
}
