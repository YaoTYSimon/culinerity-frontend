/** Local-time (device zone) week helpers. Weeks run Monday 00:00 to the next Monday 00:00. */

export const DAYS_PER_WEEK = 7;

export const startOfLocalDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Calendar-day arithmetic that stays on local midnight across daylight-saving changes. */
export const addLocalDays = (d: Date, days: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());

/** Days since Monday: Monday 0 ... Sunday 6. */
export const dayIndexMonday = (d: Date): number => (d.getDay() + 6) % 7;

/** Local midnight of the Monday that starts the week containing `now`. */
export function weekStartMonday(now: Date): Date {
  return addLocalDays(startOfLocalDay(now), -dayIndexMonday(now));
}

/** [start, end) of the Monday week containing `at`. */
export function weekBounds(at: Date): { start: Date; end: Date } {
  const start = weekStartMonday(at);
  return { start, end: addLocalDays(start, DAYS_PER_WEEK) };
}

export const isInWeek = (iso: string, bounds: { start: Date; end: Date }): boolean => {
  const t = Date.parse(iso);
  return t >= bounds.start.getTime() && t < bounds.end.getTime();
};
