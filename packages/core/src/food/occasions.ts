import { occasionDefs } from '../cultural/source';
import { sanitizeFoodProfile } from './sanitize';
import type { CalendarRow, FoodProfile, OccasionDef, OccasionId } from './types';

export interface ActiveOccasion {
  id: OccasionId;
  /** `<id>-<start year>`, what "Not now" stores. */
  key: string;
  label: string;
  start: string;
  end: string;
  approx: boolean;
  phase: 'soon' | 'now';
  /** Shows the "gatherings can cost more" budget link. */
  gathering: boolean;
  /** The occasion begins at sundown the evening before `start` (Passover, Rosh Hashanah). */
  evening: boolean;
}

/** An occasion in the next twelve months, for the "Coming up" list. */
export type UpcomingOccasion = Omit<ActiveOccasion, 'phase'>;

const LEAD_DAYS = 7;

function describe(row: CalendarRow, def: OccasionDef | undefined): UpcomingOccasion {
  return {
    id: row.occasion as OccasionId,
    key: occasionKey(row),
    label: def?.label ?? row.occasion,
    start: row.start,
    end: row.end,
    approx: row.approx,
    gathering: def?.gathering ?? false,
    evening: beginsEvening(row),
  };
}

export const occasionKey = (row: Pick<CalendarRow, 'occasion' | 'start'>): string => `${row.occasion}-${row.start.slice(0, 4)}`;

/** Calendar-day arithmetic on YYYY-MM-DD strings, free of time zones and daylight saving. */
function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Read from the calendar row's own note, so the wording follows the sourced data. */
const beginsEvening = (row: CalendarRow): boolean => /sundown the evening before/i.test(row.note ?? '');

const localDay = (d: Date): string =>
  `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Chosen occasions shown from 7 days before the start to the end (plus a day when approximate), minus dismissed ones.
 * `now` phases come first, the most recently started first; then `soon`, the earliest start first. The caller shows the first.
 */
export function occasionsOn(
  rows: CalendarRow[],
  chosen: OccasionId[],
  dismissed: string[],
  now: Date,
  defs: OccasionDef[] = occasionDefs(),
): ActiveOccasion[] {
  const today = localDay(now);
  const active: ActiveOccasion[] = [];
  for (const row of rows) {
    if (!(chosen as string[]).includes(row.occasion) || dismissed.includes(occasionKey(row))) continue;
    const from = shiftDay(row.start, -LEAD_DAYS);
    const to = row.approx ? shiftDay(row.end, 1) : row.end;
    if (today < from || today > to) continue;
    const def = defs.find((d) => d.id === row.occasion);
    active.push({ ...describe(row, def), phase: today < row.start ? 'soon' : 'now' });
  }
  const rank = (o: ActiveOccasion): number => (o.phase === 'now' ? 0 : 1);
  return active
    .map((o, i) => ({ o, i }))
    .sort((a, b) => {
      if (rank(a.o) !== rank(b.o)) return rank(a.o) - rank(b.o);
      if (a.o.start !== b.o.start) return a.o.phase === 'now' ? (a.o.start < b.o.start ? 1 : -1) : a.o.start < b.o.start ? -1 : 1;
      return a.i - b.i;
    })
    .map(({ o }) => o);
}

/** The chosen occasions that are on now or start within twelve months, earliest first. Dismissals do not hide them here. */
export function upcomingOccasions(
  rows: CalendarRow[],
  chosen: OccasionId[],
  now: Date,
  defs: OccasionDef[] = occasionDefs(),
): UpcomingOccasion[] {
  const today = localDay(now);
  const limit = `${String(now.getFullYear() + 1).padStart(4, '0')}${today.slice(4)}`;
  return rows
    .filter((r) => (chosen as string[]).includes(r.occasion) && r.end >= today && r.start <= limit)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .map((r) => describe(r, defs.find((d) => d.id === r.occasion)));
}

/** The food profile with one more dismissed key, keeping only keys from last year onward (the cap is applied by the sanitiser). */
export function dismissOccasion(food: FoodProfile, key: string, now: Date): FoodProfile {
  const oldest = now.getFullYear() - 1;
  const kept = food.dismissed.filter((k) => Number(k.slice(-4)) >= oldest && k !== key);
  return sanitizeFoodProfile({ ...food, dismissed: [...kept, key] }) ?? food;
}
