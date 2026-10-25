import { describe, expect, it } from 'vitest';
import { addWeekSwap, removeOneWeekSwap, shareText, weekSummary, type WeekSwap } from './week';

const NOW = '2026-10-20T12:00:00.000Z';
const swap = (itemId: string, saving = 1.5) => ({ itemId, name: `Item ${itemId}`, saving });

describe('addWeekSwap', () => {
  it('adds an entry stamped with now', () => {
    expect(addWeekSwap(undefined, swap('a', 2), NOW)).toEqual([{ itemId: 'a', name: 'Item a', saving: 2, at: NOW }]);
  });
  it.each([0, -1, NaN, Infinity])('ignores saving %s', (s) => {
    const w: WeekSwap[] = [{ itemId: 'a', name: 'A', saving: 1, at: NOW }];
    expect(addWeekSwap(w, swap('b', s), NOW)).toEqual(w);
  });
  it('caps at 50, dropping the oldest', () => {
    let w: WeekSwap[] | undefined;
    for (let i = 0; i < 55; i++) w = addWeekSwap(w, swap(`i${i}`), NOW);
    expect(w).toHaveLength(50);
    expect(w![0].itemId).toBe('i5');
  });
});

describe('removeOneWeekSwap', () => {
  it('removes the newest entry of that item only', () => {
    const w: WeekSwap[] = [
      { itemId: 'a', name: 'A', saving: 1, at: '2026-10-18T00:00:00.000Z' },
      { itemId: 'b', name: 'B', saving: 1, at: '2026-10-19T00:00:00.000Z' },
      { itemId: 'a', name: 'A', saving: 2, at: '2026-10-19T01:00:00.000Z' },
    ];
    expect(removeOneWeekSwap(w, 'a')).toEqual([w[0], w[1]]);
  });
  it('is a no-op for unknown items or undefined', () => {
    expect(removeOneWeekSwap(undefined, 'a')).toEqual([]);
    const w: WeekSwap[] = [{ itemId: 'a', name: 'A', saving: 1, at: NOW }];
    expect(removeOneWeekSwap(w, 'z')).toEqual(w);
  });
});

describe('weekSummary', () => {
  it('groups taps of one item with a count and rounded total', () => {
    const w: WeekSwap[] = [
      { itemId: 'a', name: 'Falafel wrap', saving: 1.1, at: NOW },
      { itemId: 'a', name: 'Falafel wrap', saving: 2.2, at: NOW },
      { itemId: 'b', name: 'Soup', saving: 0.1, at: NOW },
    ];
    const s = weekSummary(w, NOW);
    expect(s.items).toEqual([
      { itemId: 'a', name: 'Falafel wrap', count: 2, saving: 3.3 },
      { itemId: 'b', name: 'Soup', count: 1, saving: 0.1 },
    ]);
    expect(s.total).toBe(3.4);
  });
  it('excludes 8 days old and includes 6 days old', () => {
    const w: WeekSwap[] = [
      { itemId: 'old', name: 'Old', saving: 5, at: '2026-10-12T12:00:00.000Z' },
      { itemId: 'new', name: 'New', saving: 2, at: '2026-10-14T12:00:00.000Z' },
    ];
    const s = weekSummary(w, NOW);
    expect(s.items.map((i) => i.itemId)).toEqual(['new']);
    expect(s.total).toBe(2);
  });
  it('is empty for undefined', () => {
    expect(weekSummary(undefined, NOW)).toEqual({ total: 0, items: [] });
  });
});

describe('shareText', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ itemId: `i${i}`, name: `Meal ${i}`, saving: 1 }));
  it('lists up to 8 items then +N more, total and signature, never the score', () => {
    const w = many.reduce<WeekSwap[]>((acc, s) => addWeekSwap(acc, s, NOW), []);
    const t = shareText(weekSummary(w, NOW));
    expect(t).toContain('Meal 7');
    expect(t).not.toContain('Meal 8');
    expect(t).toContain('+2 more');
    expect(t).toContain('$10.00');
    expect(t.trimEnd().endsWith('Made with Culinerity')).toBe(true);
    expect(t.toLowerCase()).not.toContain('score');
  });
  it('shows counts for repeated items', () => {
    const t = shareText({ total: 3, items: [{ itemId: 'a', name: 'Falafel wrap', count: 2, saving: 3 }] });
    expect(t).toContain('Falafel wrap ×2');
    expect(t).not.toContain('+');
  });
});
