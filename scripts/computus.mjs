// Easter date algorithms for the cultural calendar. Pure, no clock.

const iso = (d) => d.toISOString().slice(0, 10);
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const addDays = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/** Western Easter Sunday (Gregorian computus, Meeus/Jones/Butcher), YYYY-MM-DD. */
export function gregorianEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(utc(year, month, day));
}

/** Orthodox Easter Sunday: Meeus Julian algorithm, converted to the Gregorian calendar (+13 days, valid 1900-2099). */
export function orthodoxEaster(year) {
  if (year < 1900 || year > 2099) throw new Error(`orthodoxEaster supports 1900 to 2099, got ${year}`);
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return addDays(iso(utc(year, month, day)), 13);
}

/** Inclusive window of a computed occasion in a Gregorian year, or undefined for occasions that are not computed. */
export function computedRange(occasion, year) {
  if (occasion === 'easter') {
    const e = gregorianEaster(year);
    return { start: addDays(e, -2), end: addDays(e, 1) }; // Good Friday to Easter Monday
  }
  if (occasion === 'lent') {
    const e = gregorianEaster(year);
    return { start: addDays(e, -46), end: addDays(e, -1) }; // Ash Wednesday to Holy Saturday
  }
  if (occasion === 'orthodox-great-lent') {
    const e = orthodoxEaster(year);
    return { start: addDays(e, -48), end: addDays(e, -1) }; // Clean Monday to Holy Saturday
  }
  if (occasion === 'orthodox-easter') {
    const e = orthodoxEaster(year);
    return { start: e, end: e };
  }
  return undefined;
}
