import { addLocalDays } from '../budget/week';
import type { PantryItem } from './types';

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
const SOON_DAYS = 3;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EAT_BY_DAYS = 3;
const EAT_BY_DAYS_RICE_PASTA = 2;
const RICE_OR_PASTA = /rice|pasta|spaghetti|noodle/i;

export const PAST_USE_BY = "Past its use-by date. It shouldn't be eaten.";
export const PAST_BEST_BEFORE_CHECK = 'Past its best-before. Check it looks and smells right.';
export const PAST_GUIDE = 'Past the guide. Best to throw it out.';

export type DateStatusKind = 'none' | 'ok' | 'soon' | 'today' | 'past' | 'check-look';
export interface DateStatus {
  status: DateStatusKind;
  label: string;
  usable: boolean;
}

/** A real calendar day written YYYY-MM-DD. */
export function isIsoDay(text: unknown): text is string {
  if (typeof text !== 'string') return false;
  const m = DAY.exec(text);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const day = new Date(Date.UTC(y, mo - 1, d));
  return day.getUTCFullYear() === y && day.getUTCMonth() === mo - 1 && day.getUTCDate() === d;
}

/** Whole days since 1970-01-01 for a YYYY-MM-DD string. Zone-free, so daylight-saving changes cannot shift it. */
function isoDayNumber(iso: string): number {
  const m = DAY.exec(iso) as RegExpExecArray;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

/** The same number for the local calendar day of `now`. */
const todayNumber = (now: Date): number => Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_PER_DAY;

/** Days from today (local) to the day: negative when it has passed. */
export const daysFromToday = (iso: string, now: Date): number => isoDayNumber(iso) - todayNumber(now);

/** True when the day is no more than five years after today. */
export function withinFiveYears(iso: string, now: Date): boolean {
  const limit = Date.UTC(now.getFullYear() + 5, now.getMonth(), now.getDate()) / MS_PER_DAY;
  return isoDayNumber(iso) <= limit;
}

const shortDay = (d: Date): string => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

function localDay(iso: string): Date {
  const m = DAY.exec(iso) as RegExpExecArray;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? '' : 's'}`;

const eatByDays = (item: PantryItem): number => (RICE_OR_PASTA.test(`${item.ingredientId ?? ''} ${item.name}`) ? EAT_BY_DAYS_RICE_PASTA : EAT_BY_DAYS);

/** The NSW leftovers guide for a cooked item: 3 days, rice and pasta 2. Null when the item is not cooked with a date. */
export function eatBy(item: PantryItem, now: Date): { label: string; past: boolean } | null {
  if (item.dateKind !== 'cooked' || !item.date || !isIsoDay(item.date)) return null;
  const last = addLocalDays(localDay(item.date), eatByDays(item));
  const iso = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  const left = daysFromToday(iso, now);
  return { label: left < 0 ? PAST_GUIDE : `Eat by ${shortDay(last)}`, past: left < 0 };
}

function countdown(prefix: string, left: number, date: string): DateStatus {
  if (left === 0) return { status: 'today', label: `${prefix} today`, usable: true };
  if (left === 1) return { status: 'soon', label: `${prefix} tomorrow`, usable: true };
  if (left <= SOON_DAYS) return { status: 'soon', label: `${prefix} in ${left} days`, usable: true };
  return { status: 'ok', label: `${prefix} ${shortDay(localDay(date))}`, usable: true };
}

/** What a date means for one item. A guide, never a safety verdict beyond the FSANZ use-by rule. */
export function dateStatus(item: PantryItem, now: Date, highRisk: boolean): DateStatus {
  if (!item.dateKind || !item.date || !isIsoDay(item.date)) return { status: 'none', label: '', usable: true };
  const left = daysFromToday(item.date, now);
  switch (item.dateKind) {
    case 'use-by':
      return left < 0 ? { status: 'past', label: PAST_USE_BY, usable: false } : countdown('Use by', left, item.date);
    case 'best-before':
      if (left >= 0) return countdown('Best before', left, item.date);
      return highRisk
        ? { status: 'past', label: "Past its best-before. It shouldn't be eaten.", usable: false }
        : { status: 'check-look', label: PAST_BEST_BEFORE_CHECK, usable: true };
    case 'cooked': {
      const e = eatBy(item, now) as { label: string; past: boolean };
      if (e.past) return { status: 'past', label: e.label, usable: false };
      const toGo = eatByDays(item) + left;
      return { status: toGo === 0 ? 'today' : toGo <= SOON_DAYS ? 'soon' : 'ok', label: e.label, usable: true };
    }
    case 'opened': {
      const ago = -left;
      const label = ago <= 0 ? 'Opened today' : ago === 1 ? 'Opened yesterday' : `Opened ${plural(ago, 'day')} ago`;
      return { status: 'ok', label, usable: true };
    }
  }
}
