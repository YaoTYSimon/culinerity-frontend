import { describe, expect, it } from 'vitest';
import { calendar, occasionDefs } from '../cultural/source';
import { dismissOccasion, occasionKey, occasionsOn, upcomingOccasions } from './occasions';
import type { FoodProfile } from './types';
import type { CalendarRow } from './types';

const cal = calendar();
const at = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const plusDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const keys = (r: Array<{ key: string }>) => r.map((x) => x.key);

describe('occasionKey', () => {
  it('is id plus start year', () => {
    expect(occasionKey({ occasion: 'ramadan', start: '2027-02-08' } as CalendarRow)).toBe('ramadan-2027');
  });
});

describe('occasionsOn', () => {
  it('returns nothing when nothing is chosen', () => {
    expect(occasionsOn(cal, [], [], at('2027-02-10'))).toEqual([]);
  });
  it('Ramadan 2027 is soon on 2027-02-01 and now on 2027-02-08', () => {
    const soon = occasionsOn(cal, ['ramadan'], [], at('2027-02-01'));
    expect(soon).toHaveLength(1);
    expect(soon[0]).toMatchObject({ id: 'ramadan', key: 'ramadan-2027', start: '2027-02-08', end: '2027-03-08', approx: true, phase: 'soon', gathering: false });
    expect(soon[0].label).toBe(occasionDefs().find((o) => o.id === 'ramadan')!.label);
    expect(occasionsOn(cal, ['ramadan'], [], at('2027-02-08'))[0].phase).toBe('now');
  });
  it('is not shown eight days before the start', () => {
    expect(occasionsOn(cal, ['ramadan'], [], at('2027-01-31'))).toEqual([]);
  });
  it('for every approx row the end day plus one is active and the day after is not', () => {
    const approx = cal.filter((r) => r.approx && r.occasion !== 'yom-kippur');
    expect(approx.length).toBeGreaterThan(0);
    for (const row of approx) {
      const key = occasionKey(row);
      const id = row.occasion as Exclude<CalendarRow['occasion'], 'yom-kippur'>;
      expect(keys(occasionsOn(cal, [id], [], at(plusDays(row.end, 1))))).toContain(key);
      expect(keys(occasionsOn(cal, [id], [], at(plusDays(row.end, 2))))).not.toContain(key);
    }
  });
  it('for exact rows the day after the end is not active', () => {
    for (const row of cal.filter((r) => !r.approx && r.occasion !== 'yom-kippur')) {
      const id = row.occasion as Exclude<CalendarRow['occasion'], 'yom-kippur'>;
      expect(keys(occasionsOn(cal, [id], [], at(row.end)))).toContain(occasionKey(row));
      expect(keys(occasionsOn(cal, [id], [], at(plusDays(row.end, 1))))).not.toContain(occasionKey(row));
    }
  });
  it('orders now before soon, now by latest start, soon by earliest start', () => {
    const r = occasionsOn(cal, ['ramadan', 'lent'], [], at('2029-02-14'));
    expect(r.map((x) => x.id)).toEqual(['lent', 'ramadan']);
    expect(r.map((x) => x.phase)).toEqual(['now', 'now']);
    const mixed = occasionsOn(cal, ['ramadan', 'lunar-new-year', 'lent'], [], at('2029-02-10'));
    expect(mixed.map((x) => `${x.id}:${x.phase}`)).toEqual(['ramadan:now', 'lunar-new-year:soon', 'lent:soon']);
  });
  it('a dismissed key stays hidden', () => {
    expect(occasionsOn(cal, ['ramadan'], ['ramadan-2027'], at('2027-02-10'))).toEqual([]);
  });
  it('an occasion not chosen never shows', () => {
    expect(occasionsOn(cal, ['diwali'], [], at('2027-02-10'))).toEqual([]);
  });
  it('shows nothing after the calendar ends, and does not throw', () => {
    expect(occasionsOn(cal, ['ramadan', 'lent', 'christmas'], [], at('2031-02-10'))).toEqual([]);
    expect(occasionsOn([], ['ramadan'], [], at('2027-02-10'))).toEqual([]);
  });
  it('Hanukkah across the new year keys by start year', () => {
    const r = occasionsOn(cal, ['hanukkah'], [], at('2028-01-01'));
    expect(keys(r)).toEqual(['hanukkah-2027']);
    expect(r[0].phase).toBe('now');
  });
  it('evening-start Passover shows from seven days before', () => {
    expect(keys(occasionsOn(cal, ['passover'], [], at('2027-04-15')))).toEqual(['passover-2027']);
    expect(occasionsOn(cal, ['passover'], [], at('2027-04-14'))).toEqual([]);
  });
  it('gathering comes from the occasion definition', () => {
    expect(occasionsOn(cal, ['christmas'], [], at('2026-12-25'))[0].gathering).toBe(true);
    expect(occasionsOn(cal, ['lent'], [], at('2027-02-10'))[0].gathering).toBe(false);
  });
});

describe('evening starts', () => {
  it('Passover and Rosh Hashanah begin the evening before; Hanukkah, Eid and Ramadan do not say so', () => {
    const ev = (id: 'passover' | 'rosh-hashanah' | 'hanukkah' | 'eid-al-fitr' | 'ramadan', day: string) =>
      occasionsOn(cal, [id], [], at(day))[0].evening;
    expect(ev('passover', '2027-04-20')).toBe(true);
    expect(ev('rosh-hashanah', '2027-10-01')).toBe(true);
    expect(ev('hanukkah', '2026-12-01')).toBe(false);
    expect(ev('eid-al-fitr', '2027-03-05')).toBe(false);
    expect(ev('ramadan', '2027-02-05')).toBe(false);
  });
});

describe('dismissOccasion', () => {
  const food = (dismissed: string[]): FoodProfile => ({ traditions: [], rules: [], allergies: [], occasions: ['ramadan'], dismissed });
  it('adds the key once', () => {
    expect(dismissOccasion(food([]), 'ramadan-2027', at('2027-02-05')).dismissed).toEqual(['ramadan-2027']);
    expect(dismissOccasion(food(['ramadan-2027']), 'ramadan-2027', at('2027-02-05')).dismissed).toEqual(['ramadan-2027']);
  });
  it('prunes keys more than a year old and caps at 20', () => {
    expect(dismissOccasion(food(['lent-2025', 'easter-2026']), 'ramadan-2027', at('2027-02-05')).dismissed).toEqual(['easter-2026', 'ramadan-2027']);
    const many = Array.from({ length: 25 }, (_, i) => `a${'b'.repeat(i % 3)}-2027`);
    expect(dismissOccasion(food(many), 'z-2027', at('2027-02-05')).dismissed.length).toBeLessThanOrEqual(20);
  });
});

describe('upcomingOccasions', () => {
  it('lists chosen occasions from now to twelve months ahead in date order, ignoring dismissals', () => {
    const r = upcomingOccasions(cal, ['lent', 'ramadan', 'christmas'], at('2026-10-28'));
    expect(keys(r)).toEqual(['christmas-2026', 'ramadan-2027', 'lent-2027']);
    expect(r[1]).toMatchObject({ approx: true, label: 'Ramadan' });
  });
  it('includes one under way and drops finished or too distant ones', () => {
    expect(keys(upcomingOccasions(cal, ['ramadan'], at('2027-02-20')))).toEqual(['ramadan-2027', 'ramadan-2028']);
    expect(keys(upcomingOccasions(cal, ['ramadan'], at('2027-03-10')))).toEqual(['ramadan-2028']);
    expect(upcomingOccasions(cal, [], at('2026-10-28'))).toEqual([]);
  });
});
