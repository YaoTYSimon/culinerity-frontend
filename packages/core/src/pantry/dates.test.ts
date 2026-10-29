import { describe, expect, it } from 'vitest';
import { dateStatus, eatBy, isIsoDay } from './dates';
import type { DateKind, PantryItem } from './types';

const NOW = new Date(2026, 9, 29, 15, 30, 0);
const it_ = (dateKind?: DateKind, date?: string, extra: Partial<PantryItem> = {}): PantryItem => ({ id: 'x', name: 'Thing', addedAt: '2026-10-01T00:00:00.000Z', dateKind, date, ...extra });

describe('isIsoDay', () => {
  it.each([['2026-10-29', true], ['2026-02-30', false], ['2028-02-29', true], ['2026-2-3', false], ['', false], ['2026-10-29T00:00', false], ['abcd-ef-gh', false]])('%s', (t, ok) => {
    expect(isIsoDay(t)).toBe(ok);
  });
});

describe('dateStatus', () => {
  it('no date is none and usable', () => {
    expect(dateStatus(it_(), NOW, false)).toMatchObject({ status: 'none', usable: true });
  });
  it('use-by yesterday is past and not usable', () => {
    const r = dateStatus(it_('use-by', '2026-10-28'), NOW, false);
    expect(r).toMatchObject({ status: 'past', usable: false });
    expect(r.label).toBe("Past its use-by date. It shouldn't be eaten.");
  });
  it('use-by today is usable', () => {
    expect(dateStatus(it_('use-by', '2026-10-29'), NOW, false)).toMatchObject({ status: 'today', usable: true, label: 'Use by today' });
  });
  it('use-by in 2 days is soon, in 3 days soon, in 4 days ok', () => {
    expect(dateStatus(it_('use-by', '2026-10-31'), NOW, false)).toMatchObject({ status: 'soon', usable: true });
    expect(dateStatus(it_('use-by', '2026-11-01'), NOW, false).status).toBe('soon');
    expect(dateStatus(it_('use-by', '2026-11-02'), NOW, false).status).toBe('ok');
  });
  it('best-before yesterday: high risk is past and unusable, otherwise check-look and usable', () => {
    expect(dateStatus(it_('best-before', '2026-10-28'), NOW, true)).toMatchObject({ status: 'past', usable: false });
    const r = dateStatus(it_('best-before', '2026-10-28'), NOW, false);
    expect(r).toMatchObject({ status: 'check-look', usable: true });
    expect(r.label).toBe('Past its best-before. Check it looks and smells right.');
  });
  it('best-before today and future are usable', () => {
    expect(dateStatus(it_('best-before', '2026-10-29'), NOW, true)).toMatchObject({ status: 'today', usable: true });
    expect(dateStatus(it_('best-before', '2026-12-01'), NOW, true)).toMatchObject({ status: 'ok', usable: true });
  });
  it('opened shows days ago and gives no verdict', () => {
    expect(dateStatus(it_('opened', '2026-10-24'), NOW, true)).toMatchObject({ status: 'ok', usable: true, label: 'Opened 5 days ago' });
    expect(dateStatus(it_('opened', '2026-10-29'), NOW, false).label).toBe('Opened today');
    expect(dateStatus(it_('opened', '2026-10-28'), NOW, false).label).toBe('Opened yesterday');
  });
  it('cooked follows the eat-by guide', () => {
    expect(dateStatus(it_('cooked', '2026-10-27', { name: 'Stew' }), NOW, false)).toMatchObject({ status: 'soon', usable: true });
    expect(dateStatus(it_('cooked', '2026-10-25', { name: 'Stew' }), NOW, false)).toMatchObject({ status: 'past', usable: false, label: 'Past the guide. Best to throw it out.' });
  });
  it('is right across the DST Sundays 2026-04-05 and 2026-10-04', () => {
    const apr = new Date(2026, 3, 5, 12);
    expect(dateStatus(it_('use-by', '2026-04-04'), apr, false).status).toBe('past');
    expect(dateStatus(it_('use-by', '2026-04-05'), apr, false).status).toBe('today');
    expect(dateStatus(it_('use-by', '2026-04-08'), apr, false).status).toBe('soon');
    expect(dateStatus(it_('use-by', '2026-04-09'), apr, false).status).toBe('ok');
    const oct = new Date(2026, 9, 4, 0, 30);
    expect(dateStatus(it_('use-by', '2026-10-03'), oct, false).status).toBe('past');
    expect(dateStatus(it_('use-by', '2026-10-04'), oct, false).status).toBe('today');
    expect(dateStatus(it_('use-by', '2026-10-07'), oct, false).status).toBe('soon');
    expect(dateStatus(it_('use-by', '2026-10-08'), oct, false).status).toBe('ok');
    expect(eatBy(it_('cooked', '2026-10-03', { name: 'Stew' }), oct)).toEqual({ label: 'Eat by 6 Oct', past: false });
    expect(eatBy(it_('cooked', '2026-04-03', { name: 'Stew' }), new Date(2026, 3, 7, 1))).toEqual({ label: 'Past the guide. Best to throw it out.', past: true });
  });
});

describe('eatBy', () => {
  it('is null unless cooked with a date', () => {
    expect(eatBy(it_('use-by', '2026-10-29'), NOW)).toBeNull();
    expect(eatBy(it_(), NOW)).toBeNull();
  });
  it('cooked rice is 2 days, stew is 3', () => {
    expect(eatBy(it_('cooked', '2026-10-27', { name: 'Rice', ingredientId: 'rice' }), NOW)).toEqual({ label: 'Eat by 29 Oct', past: false });
    expect(eatBy(it_('cooked', '2026-10-26', { name: 'Rice', ingredientId: 'rice' }), NOW)).toMatchObject({ past: true });
    expect(eatBy(it_('cooked', '2026-10-26', { name: 'Stew' }), NOW)).toEqual({ label: 'Eat by 29 Oct', past: false });
    expect(eatBy(it_('cooked', '2026-10-25', { name: 'Stew' }), NOW)).toMatchObject({ past: true });
  });
  it('pasta is 2 days, matched by name too', () => {
    expect(eatBy(it_('cooked', '2026-10-27', { name: 'leftover Pasta' }), NOW)?.label).toBe('Eat by 29 Oct');
  });
});
