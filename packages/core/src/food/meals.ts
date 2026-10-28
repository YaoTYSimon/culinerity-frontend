import { capNewestByAt, isIsoDateTime } from '../budget/entries';
import { addLocalDays, dayIndexMonday, DAYS_PER_WEEK, isInWeek, weekBounds, weekStartMonday } from '../budget/week';
import { MAX_TEXT } from './sanitize';
import type { CulturalMeal } from './types';

export const MAX_MEALS = 200;
export const MEAL_RETENTION_WEEKS = 8;

const WITH = ['family', 'friends', 'community', 'alone'] as const;
const shortText = (x: unknown): x is string => typeof x === 'string' && x.length <= MAX_TEXT;

export function isCulturalMeal(x: unknown): x is CulturalMeal {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    m.id !== '' &&
    isIsoDateTime(m.at) &&
    shortText(m.tradition) &&
    m.tradition !== '' &&
    (m.dish === undefined || shortText(m.dish)) &&
    (m.with === undefined || (WITH as readonly unknown[]).includes(m.with))
  );
}

/** A clean copy with only known fields. */
function cleanMeal(m: CulturalMeal): CulturalMeal {
  const out: CulturalMeal = { id: m.id, at: m.at, tradition: m.tradition };
  if (m.dish !== undefined) out.dish = m.dish;
  if (m.with !== undefined) out.with = m.with;
  return out;
}

const cap = (meals: CulturalMeal[]): CulturalMeal[] => capNewestByAt(meals, MAX_MEALS);

/** Add a meal dated now or earlier, within this or last Monday week. Anything invalid leaves the same array. */
export function addMeal(list: CulturalMeal[] | undefined, meal: CulturalMeal, now: Date): CulturalMeal[] {
  const meals = list ?? [];
  if (!isCulturalMeal(meal) || meals.some((m) => m.id === meal.id)) return meals;
  const at = Date.parse(meal.at);
  const earliest = addLocalDays(weekStartMonday(now), -DAYS_PER_WEEK).getTime();
  if (at > now.getTime() || at < earliest) return meals;
  return cap([...meals, cleanMeal(meal)]);
}

export function removeMeal(list: CulturalMeal[] | undefined, id: string): { meals: CulturalMeal[]; removed?: CulturalMeal } {
  const meals = list ?? [];
  const removed = meals.find((m) => m.id === id);
  return removed ? { meals: meals.filter((m) => m.id !== id), removed } : { meals };
}

/** Undo a removal. Skips the date check, because the meal was valid when it was first added. */
export function restoreMeal(list: CulturalMeal[] | undefined, meal: CulturalMeal): CulturalMeal[] {
  const meals = list ?? [];
  if (!isCulturalMeal(meal) || meals.some((m) => m.id === meal.id)) return meals;
  return cap([...meals, cleanMeal(meal)]);
}

/** Drop invalid and repeated-id meals (first wins), prune past the retention period when `now` is given, keep the newest 200. */
export function sanitizeMeals(list: unknown[], now?: Date): CulturalMeal[] {
  const seen = new Set<string>();
  const oldest = now ? addLocalDays(now, -MEAL_RETENTION_WEEKS * DAYS_PER_WEEK).getTime() : -Infinity;
  const valid = list
    .filter(isCulturalMeal)
    .filter((m) => !seen.has(m.id) && !!seen.add(m.id))
    .filter((m) => Date.parse(m.at) >= oldest);
  return cap(valid.map(cleanMeal));
}

const newestFirst = (a: CulturalMeal, b: CulturalMeal): number => Date.parse(b.at) - Date.parse(a.at);

/** This week (Monday to Sunday, seven day slots) and last week, newest first. No targets, only what happened. */
export function culturalWeek(
  meals: CulturalMeal[] | undefined,
  now: Date,
): { days: boolean[]; todayIndex: number; count: number; thisWeek: CulturalMeal[]; lastWeek: CulturalMeal[] } {
  const list = meals ?? [];
  const current = weekBounds(now);
  const previous = weekBounds(addLocalDays(current.start, -DAYS_PER_WEEK));
  const thisWeek = list.filter((m) => isInWeek(m.at, current)).sort(newestFirst);
  const lastWeek = list.filter((m) => isInWeek(m.at, previous)).sort(newestFirst);
  const days = Array.from({ length: DAYS_PER_WEEK }, () => false);
  for (const m of thisWeek) days[dayIndexMonday(new Date(m.at))] = true;
  return { days, todayIndex: dayIndexMonday(now), count: thisWeek.length, thisWeek, lastWeek };
}
