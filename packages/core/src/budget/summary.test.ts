import { describe, expect, it } from 'vitest';
import type { SpendEntry } from '../domain/types';
import { budgetSummary, entriesThisWeek, weeklyTotals } from './summary';

const d = (y: number, m: number, day: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, day, h, min, s);
let n = 0;
const mk = (amount: number, at: Date): SpendEntry => ({ id: `e${n++}`, amount, category: 'groceries', at: at.toISOString() });

describe('entriesThisWeek', () => {
  const now = d(2026, 10, 28, 12);
  it('is empty for undefined', () => expect(entriesThisWeek(undefined, now)).toEqual([]));
  it('includes Monday 00:00 and Sunday 23:59:59, excludes the neighbours', () => {
    const inside = [mk(1, d(2026, 10, 26, 0, 0, 0)), mk(1, d(2026, 11, 1, 23, 59, 59))];
    const outside = [mk(1, d(2026, 10, 25, 23, 59, 59)), mk(1, d(2026, 11, 2, 0, 0, 0))];
    expect(entriesThisWeek([...outside, ...inside], now)).toEqual(inside);
  });
  it('an entry belongs to the week of its own date, whatever week the view is in', () => {
    const e = mk(5, d(2026, 10, 20, 9));
    expect(entriesThisWeek([e], now)).toEqual([]);
    expect(entriesThisWeek([e], d(2026, 10, 21, 12))).toEqual([e]);
  });
});

describe('budgetSummary', () => {
  const sum = (spent: number, budget: number | undefined, now: Date) => budgetSummary(spent > 0 ? [mk(spent, new Date(now.getTime() - 1000))] : [], budget, now);

  describe('daysLeft counts calendar days including today', () => {
    it.each([
      ['Monday 00:00', d(2026, 10, 26, 0, 0), 7],
      ['Tuesday', d(2026, 10, 27, 15), 6],
      ['Wednesday', d(2026, 10, 28, 12), 5],
      ['Saturday', d(2026, 10, 31, 12), 2],
      ['Sunday 00:00', d(2026, 11, 1, 0, 0), 1],
      ['Sunday 23:59', d(2026, 11, 1, 23, 59), 1],
      ['Monday after', d(2026, 11, 2, 0, 0), 7],
    ])('%s', (_l, now, days) => {
      expect(budgetSummary([], 100, now).daysLeft).toBe(days);
    });
  });

  it('no budget: spent only, no remaining, no percent, no per-day, pace no-budget', () => {
    const now = d(2026, 10, 28, 12);
    const s = sum(30, undefined, now);
    expect(s).toEqual({ spent: 30, remaining: null, over: 0, percentSpent: null, daysLeft: 5, perDayLeft: null, pace: 'no-budget' });
    expect(sum(30, 0, now).pace).toBe('no-budget');
    expect(sum(30, -5, now).remaining).toBeNull();
    expect(sum(30, NaN, now).pace).toBe('no-budget');
  });

  it('works out remaining, percent and per-day with cents rounding', () => {
    const now = d(2026, 10, 28, 12); // 5 days left
    const s = budgetSummary([mk(10.1, d(2026, 10, 27, 9)), mk(20.2, d(2026, 10, 28, 9))], 100, now);
    expect(s.spent).toBe(30.3);
    expect(s.remaining).toBe(69.7);
    expect(s.over).toBe(0);
    expect(s.percentSpent).toBe(30.3);
    expect(s.perDayLeft).toBe(13.94);
  });

  it('sums only this week and ignores last week', () => {
    const now = d(2026, 10, 28, 12);
    const s = budgetSummary([mk(50, d(2026, 10, 20, 9)), mk(5, d(2026, 10, 27, 9))], 100, now);
    expect(s.spent).toBe(5);
  });

  it('over budget: remaining 0, over amount, no per-day, pace over', () => {
    const now = d(2026, 10, 28, 12);
    const s = sum(112.5, 100, now);
    expect(s).toMatchObject({ spent: 112.5, remaining: 0, over: 12.5, perDayLeft: null, pace: 'over' });
    expect(s.percentSpent).toBe(112.5);
  });

  it('spent exactly the budget is not over, remaining 0, no per-day', () => {
    const s = sum(100, 100, d(2026, 10, 28, 12));
    expect(s).toMatchObject({ remaining: 0, over: 0, perDayLeft: null });
    expect(s.pace).not.toBe('over');
  });

  it('rounds the budget to cents so over, remaining and pace agree', () => {
    const now = d(2026, 10, 28, 12);
    const at85_56 = sum(85.56, 85.555, now); // budget becomes 85.56
    expect(at85_56).toMatchObject({ over: 0, remaining: 0, pace: 'a-bit-fast' });
    expect(sum(85.57, 85.555, now)).toMatchObject({ over: 0.01, pace: 'over' });
  });
  it('sums money in whole cents (0.1 + 0.2 = 0.3)', () => {
    const now = d(2026, 10, 28, 12);
    expect(budgetSummary([mk(0.1, d(2026, 10, 27)), mk(0.2, d(2026, 10, 27, 1))], 10, now).spent).toBe(0.3);
  });

  describe('pace (Wednesday noon: 2.5 of 7 days elapsed = 35.7%)', () => {
    const now = d(2026, 10, 28, 12);
    it('on-track within 10 points of the week', () => expect(sum(45, 100, now).pace).toBe('on-track'));
    it('on-track when well under', () => expect(sum(5, 100, now).pace).toBe('on-track'));
    it('a-bit-fast beyond 10 points', () => expect(sum(47, 100, now).pace).toBe('a-bit-fast'));
    it('over when spent > budget', () => expect(sum(100.01, 100, now).pace).toBe('over'));
  });

  describe('first day (Monday)', () => {
    it('is on-track however much is spent, unless over', () => {
      const now = d(2026, 10, 26, 9);
      expect(sum(60, 100, now).pace).toBe('on-track');
      expect(sum(100, 100, now).pace).toBe('on-track');
      expect(sum(100.01, 100, now).pace).toBe('over');
    });
    it('Monday 23:59 is still the first day', () => {
      expect(sum(60, 100, d(2026, 10, 26, 23, 59)).pace).toBe('on-track');
    });
    it('Tuesday 00:00 is not, and 60% against 14.3% is a-bit-fast', () => {
      expect(sum(60, 100, d(2026, 10, 27, 0, 0)).pace).toBe('a-bit-fast');
    });
  });

  describe('daylight saving days use the real length of the local day', () => {
    // On a DST Sunday the pace line is only reachable early in the day (later, the threshold passes 100%).
    it('Sunday 4 Oct 2026 (23h): 03:00 is 2 real hours in, so elapsed 86.96% of the day', () => {
      const now = d(2026, 10, 4, 3, 0);
      expect(sum(97.2, 100, now).pace).toBe('a-bit-fast'); // 97.2 > 96.96; a 24h day would give 97.5 and on-track
      expect(sum(96.9, 100, now).pace).toBe('on-track');
      expect(budgetSummary([], 100, now).daysLeft).toBe(1);
    });
    it('Sunday 5 Apr 2026 (25h): 03:00 is 4 real hours in', () => {
      const now = d(2026, 4, 5, 3, 0);
      expect(sum(97.7, 100, now).pace).toBe('on-track'); // 97.7 < 98.0; a 24h day would give 97.5 and a-bit-fast
      expect(sum(98.1, 100, now).pace).toBe('a-bit-fast');
      expect(budgetSummary([], 100, now).daysLeft).toBe(1);
    });
    it('the DST Sunday still belongs to the week that began on Monday', () => {
      const e = mk(10, d(2026, 10, 4, 12));
      expect(entriesThisWeek([e], d(2026, 10, 4, 23, 59))).toEqual([e]);
      expect(entriesThisWeek([e], d(2026, 10, 5, 0, 0))).toEqual([]);
    });
  });
});

describe('weeklyTotals', () => {
  const now = d(2026, 10, 28, 12);
  it('lists the current week first then older weeks, with zero weeks included', () => {
    const entries = [mk(10, d(2026, 10, 28, 9)), mk(5.5, d(2026, 10, 27, 9)), mk(7, d(2026, 10, 20, 9)), mk(3, d(2026, 10, 5, 9))];
    expect(weeklyTotals(entries, now, 4)).toEqual([
      { weekStart: '2026-10-26', total: 15.5 },
      { weekStart: '2026-10-19', total: 7 },
      { weekStart: '2026-10-12', total: 0 },
      { weekStart: '2026-10-05', total: 3 },
    ]);
  });
  it('handles undefined and non-positive week counts', () => {
    expect(weeklyTotals(undefined, now, 2)).toEqual([
      { weekStart: '2026-10-26', total: 0 },
      { weekStart: '2026-10-19', total: 0 },
    ]);
    expect(weeklyTotals([], now, 0)).toEqual([]);
  });
  it('week starts across the DST change are still Mondays', () => {
    expect(weeklyTotals([], d(2026, 10, 7, 12), 2).map((w) => w.weekStart)).toEqual(['2026-10-05', '2026-09-28']);
  });
});

describe('weeklyTotals as the view uses it', () => {
  it('puts the current Monday week first and matches the summary, so slice(1) is the earlier weeks', () => {
    const now = new Date(2026, 9, 28, 12, 0, 0);
    const at = (d: number) => new Date(2026, 9, d, 10, 0, 0).toISOString();
    const entries = [
      { id: 'a', amount: 10, category: 'groceries' as const, at: at(27) },
      { id: 'b', amount: 7, category: 'groceries' as const, at: at(21) },
    ];
    const totals = weeklyTotals(entries, now, 3);
    expect(totals[0]).toEqual({ weekStart: '2026-10-26', total: budgetSummary(entries, undefined, now).spent });
    expect(totals.slice(1).map((w) => w.weekStart)).toEqual(['2026-10-19', '2026-10-12']);
    expect(totals[1]?.total).toBe(7);
  });
});
