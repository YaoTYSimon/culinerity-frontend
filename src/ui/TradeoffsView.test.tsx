import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TRADEOFF_LABELS, type TradeoffEntry } from '@culinerity/core';
import { TradeoffsView } from './TradeoffsView';
import { DISCLAIMER, EMPTY_WEEK, REFLECTION, RETENTION, SHARED_DEVICE, STAYS_WITH_PROFILE } from './tradeoffCopy';

// Wednesday 28 October 2026. This week began Monday 26th; last week began Monday 19th.
const NOW = new Date(2026, 9, 28, 12, 0, 0);
const entry = (id: string, day: number, category: TradeoffEntry['category'] = 'self-treat', note?: string, month = 9): TradeoffEntry => ({
  id, category, at: new Date(2026, month, day, 18, 0, 0).toISOString(), ...(note ? { note } : {}),
});
const L = TRADEOFF_LABELS;

function Harness({ initial, onSave, onOpenBudget = () => {} }: { initial?: TradeoffEntry[]; onSave?: (e: TradeoffEntry[]) => void; onOpenBudget?: () => void }) {
  const [entries, setEntries] = useState(initial);
  let n = 0;
  return (
    <TradeoffsView
      entries={entries} now={NOW} newId={() => `new-${++n}`} onOpenBudget={onOpenBudget} onOpenSupport={() => {}}
      onChange={(e) => { setEntries(e); onSave?.(e); }}
    />
  );
}
const show = (props: Parameters<typeof Harness>[0] = {}) => render(<Harness {...props} />);
const openAdd = () => fireEvent.click(screen.getByRole('button', { name: 'Add a trade-off' }));
const pick = (label: string) => fireEvent.click(within(screen.getByRole('group', { name: 'Add a trade-off' })).getByRole('button', { name: label }));
const status = () => screen.getByRole('status');

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());

describe('TradeoffsView', () => {
  it('one h1 "What we went without" and it takes focus', () => {
    show();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const h1 = screen.getByRole('heading', { level: 1, name: 'What we went without' });
    expect(h1).toHaveFocus();
  });

  it('empty week shows the empty sentence and never "0"', () => {
    show();
    expect(screen.getByText(EMPTY_WEEK)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b0\b/);
    expect(screen.queryByText(REFLECTION)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear all my trade-offs' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'See my food budget' })).toBeNull();
  });

  it('tapping a category saves immediately and announces "Added: <label>, today" in role=status', () => {
    const onSave = vi.fn();
    show({ onSave });
    openAdd();
    pick(L['meal-skipped']);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject([{ id: 'new-1', category: 'meal-skipped' }]);
    expect(status()).toHaveTextContent(`Added: ${L['meal-skipped']}, today.`);
  });

  it('the ten pills are in a fixed order', () => {
    show();
    openAdd();
    const names = within(screen.getByRole('group', { name: 'Add a trade-off' })).getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(Object.values(L));
  });

  it('Add a note saves a 140 char note, refuses 141 (field shows the limit, nothing saved)', () => {
    const onSave = vi.fn();
    show({ onSave });
    openAdd();
    pick(L['self-treat']);
    fireEvent.click(screen.getByRole('button', { name: 'Add a note' }));
    const field = screen.getByLabelText('Note (optional)');
    fireEvent.change(field, { target: { value: 'x'.repeat(141) } });
    expect(screen.getByText('141 of 140')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/140 characters or fewer/)).toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'y'.repeat(140) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave.mock.calls[1][0][0].note).toBe('y'.repeat(140));
    expect(onSave.mock.calls[1][0]).toHaveLength(1);
  });

  it('other opens the note field straight away and Skip leaves "Something else"', () => {
    show();
    openAdd();
    pick(L.other);
    expect(screen.getByLabelText('Note (optional)')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.queryByLabelText('Note (optional)')).toBeNull();
    const list = screen.getByRole('list', { name: "This week's trade-offs" });
    expect(within(list).getByText('Something else')).toBeInTheDocument();
  });

  it('other with a note is listed as "Something else: <note>"', () => {
    show();
    openAdd();
    pick(L.other);
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'the bus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(screen.getByText('Something else: the bus')).toBeInTheDocument();
  });

  it('Change day lists today and earlier days of this and last week only', () => {
    show();
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Change day' }));
    const day = screen.getByLabelText('Day') as HTMLInputElement;
    expect(day.max).toBe('2026-10-28');
    expect(day.min).toBe('2026-10-19');
    fireEvent.change(day, { target: { value: '2026-10-20' } });
    pick(L['self-treat']);
    expect(status()).toHaveTextContent(/Added: .*, Tue 20 Oct\./);
  });

  it('count sentence for 1 and 3 matches exactly; reflection only with an entry, same text for 1 and 9', () => {
    const { unmount } = show({ initial: [entry('a', 27)] });
    expect(screen.getByText('1 trade-off this week: this is what keeping food on the table cost')).toBeInTheDocument();
    expect(screen.getByText(REFLECTION)).toBeInTheDocument();
    unmount();
    show({ initial: [entry('a', 26), entry('b', 27), entry('c', 28)] });
    expect(screen.getByText('3 trade-offs this week: this is what keeping food on the table cost')).toBeInTheDocument();
    expect(screen.getAllByText(REFLECTION)).toHaveLength(1);
  });

  it('reflection is the same text with nine entries', () => {
    show({ initial: Array.from({ length: 9 }, (_, i) => entry(`e${i}`, 26 + (i % 3))) });
    expect(screen.getByText(REFLECTION)).toBeInTheDocument();
    expect(screen.getByText(/^9 trade-offs this week/)).toBeInTheDocument();
  });

  it('Remove then Undo restores in order; several removals undo latest first; no timers', () => {
    const onSave = vi.fn();
    show({ initial: [entry('a', 26), entry('b', 27, 'cut-back')], onSave });
    fireEvent.click(screen.getByRole('button', { name: /Remove .*Went without something nice.*/ }));
    expect(status()).toHaveTextContent('Removed.');
    fireEvent.click(screen.getByRole('button', { name: /Remove Cut back/ }));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(within(status()).getAllByRole('button', { name: 'Undo' }).length).toBeGreaterThan(0);
    fireEvent.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(screen.getByText(L['cut-back'])).toBeInTheDocument();
    expect(screen.queryByText(L['self-treat'])).toBeNull();
    fireEvent.click(within(status()).getByRole('button', { name: 'Undo' }));
    const items = within(screen.getByRole('list', { name: "This week's trade-offs" })).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([expect.stringContaining(L['cut-back']), expect.stringContaining(L['self-treat'])]);
  });

  it('Clear all my trade-offs calls onChange([]) and Undo restores; button hidden when empty', () => {
    const onSave = vi.fn();
    show({ initial: [entry('a', 26), entry('b', 20)], onSave });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all my trade-offs' }));
    expect(onSave).toHaveBeenLastCalledWith([]);
    expect(status()).toHaveTextContent('Cleared. Undo (this goes when you leave this page)');
    expect(screen.queryByRole('button', { name: 'Clear all my trade-offs' })).toBeNull();
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(onSave.mock.calls.at(-1)![0]).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Clear all my trade-offs' })).toBeInTheDocument();
  });

  it('Last week and Earlier are Disclosures listing entries with Remove and no counts in their headings', () => {
    show({ initial: [entry('a', 21, 'cut-back'), entry('b', 21, 'borrowed'), entry('c', 7, 'other', 'old')] });
    const last = screen.getByText('Last week').closest('details')!;
    expect(last).toBeInTheDocument();
    expect(within(last).getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
    const earlier = screen.getByText('Earlier').closest('details')!;
    expect(within(earlier).getByText('Week of Mon 5 Oct')).toBeInTheDocument();
    expect(within(earlier).getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
    expect(last.querySelector('summary')!.textContent).not.toMatch(/\d/);
    expect(earlier.querySelector('summary')!.textContent).not.toMatch(/\d/);
  });

  it('no alert role, no red or amber class, no big numeral', () => {
    const { container } = show({ initial: [entry('a', 26, 'meal-skipped')] });
    openAdd();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/\b(red|amber|rose|orange|yellow)\b|-(red|amber|rose|orange|yellow)-|text-(5|6|7|8|9)xl|text-\[(4|5|6|7)\dpx\]/);
    expect(container.querySelector('svg circle, [role="progressbar"], [role="meter"]')).toBeNull();
  });

  it('shared-device, retention, stays-with-profile and disclaimer sentences are present', () => {
    show();
    for (const t of [SHARED_DEVICE, RETENTION, STAYS_WITH_PROFILE, DISCLAIMER]) expect(screen.getByText(t)).toBeInTheDocument();
  });

  it('See my food budget appears only with an entry and calls onOpenBudget', () => {
    const onOpenBudget = vi.fn();
    show({ initial: [entry('a', 26)], onOpenBudget });
    fireEvent.click(screen.getByRole('button', { name: 'See my food budget' }));
    expect(onOpenBudget).toHaveBeenCalledTimes(1);
  });

  it('a stored entry with an unknown category never reaches the view', () => {
    const bad = { id: 'x', category: 'sacrificed', at: new Date(2026, 9, 27, 9).toISOString() } as unknown as TradeoffEntry;
    show({ initial: [bad, entry('a', 26)] });
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/undefined|sacrificed/);
  });
});
