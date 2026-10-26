import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaticBenchmarkSource, verificationLabel, type Profile, type SpendEntry } from '@culinerity/core';
import { HEADLINE_IDS } from './BenchmarkRows';
import { BudgetView } from './BudgetView';

// Wednesday 28 October 2026, local time (Melbourne): the week began Monday 26th, 5 days left including today.
const NOW = new Date(2026, 9, 28, 12, 0, 0);
const entry = (id: string, amount: number, day: number, extra: Partial<SpendEntry> = {}): SpendEntry => ({
  id, amount, category: 'groceries', at: new Date(2026, 9, day, 10, 0, 0).toISOString(), ...extra,
});

function Harness({ initial, onSave, profileId }: { initial: Profile; onSave?: (p: Profile) => void; profileId?: string }) {
  const [profile, setProfile] = useState(initial);
  return (
    <BudgetView
      profileId={profileId}
      profile={profile}
      now={NOW}
      onChange={(p) => { setProfile(p); onSave?.(p); }}
      onSeeSwaps={() => {}}
      onOpenWeek={() => {}}
    />
  );
}
const show = (p: Profile = {}, onSave?: (p: Profile) => void) => render(<Harness initial={p} onSave={onSave} />);

function add(amount: string, note?: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: amount } });
  if (note !== undefined) fireEvent.change(screen.getByLabelText(/note/i), { target: { value: note } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());

describe('BudgetView', () => {
  it('has exactly one h1, "This week\'s food."', () => {
    show({ foodBudgetWeekly: 120 });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: "This week's food." })).toBeInTheDocument();
  });

  it('shows the amount left on the plate, with the caption and a pace sentence', () => {
    show({ foodBudgetWeekly: 120, spendEntries: [entry('a', 36, 27)] });
    expect(screen.getByRole('img', { name: '$84 left' })).toBeInTheDocument();
    expect(screen.getByText('of $120 · 5 days left')).toBeInTheDocument();
    expect(screen.getByText("You're on track.")).toBeInTheDocument();
    expect(screen.getByText(/About \$16\.80 a day for the rest of the week/)).toBeInTheDocument();
  });

  it('adds a spend: the row appears and the totals update, and it is saved', () => {
    const onSave = vi.fn();
    show({ foodBudgetWeekly: 120 }, onSave);
    expect(screen.getByText('Nothing logged yet this week.')).toBeInTheDocument();
    add('$30.50', 'Market');
    expect(screen.queryByText('Nothing logged yet this week.')).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: "This week's spending" })).getByText('$30.50')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '$89.50 left' })).toBeInTheDocument();
    expect(onSave.mock.lastCall?.[0].spendEntries).toHaveLength(1);
    expect(onSave.mock.lastCall?.[0].spendEntries[0]).toMatchObject({ amount: 30.5, category: 'groceries', note: 'Market' });
  });

  it.each(['', 'abc', '0', '-5', '10001', '1e3'])('calmly rejects the amount %j and adds nothing', (bad) => {
    const onSave = vi.fn();
    show({ foodBudgetWeekly: 120 }, onSave);
    add(bad);
    expect(screen.getByText(/Enter an amount in dollars/)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Nothing logged yet this week.')).toBeInTheDocument();
  });

  it('limits the note to the core maximum and lets the category be chosen', () => {
    show({ foodBudgetWeekly: 120 });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByLabelText(/note/i)).toHaveAttribute('maxlength', '40');
    fireEvent.click(screen.getByRole('button', { name: 'Takeaway' }));
    expect(screen.getByRole('button', { name: 'Takeaway' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Groceries' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('dates default to today and are limited to the current and previous week', () => {
    show({ foodBudgetWeekly: 120 });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const date = screen.getByLabelText(/date/i);
    expect(date).toHaveValue('2026-10-28');
    expect(date).toHaveAttribute('max', '2026-10-28');
    expect(date).toHaveAttribute('min', '2026-10-19');
  });

  it('removes a row and Undo restores it within the window, then the window closes', () => {
    show({ foodBudgetWeekly: 120, spendEntries: [entry('a', 20, 27, { note: 'Bread' })] });
    fireEvent.click(screen.getByRole('button', { name: /Remove Bread/ }));
    expect(screen.getByText('Nothing logged yet this week.')).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(within(status).getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '$100 left' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Remove Bread/ }));
    act(() => { vi.advanceTimersByTime(6001); });
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('over budget reads "$12 over" with a kind sentence and never says overspent', () => {
    const { container } = show({ foodBudgetWeekly: 100, spendEntries: [entry('a', 112, 27)] });
    expect(screen.getByRole('img', { name: '$12 over' })).toBeInTheDocument();
    expect(screen.getByText(/You've passed this week's budget\. That's okay/)).toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).not.toContain('overspent');
    expect(screen.queryByText(/a day for the rest of the week/)).not.toBeInTheDocument();
  });

  it('says a bit fast when spending runs ahead of the week', () => {
    show({ foodBudgetWeekly: 100, spendEntries: [entry('a', 80, 27)] });
    expect(screen.getByText("You're spending a bit faster than the week.")).toBeInTheDocument();
  });

  it('without a budget it asks for one (single field), and Skip shows spent only', () => {
    const onSave = vi.fn();
    show({ spendEntries: [entry('a', 63, 27)] }, onSave);
    fireEvent.change(screen.getByLabelText(/weekly food budget/i), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
    expect(screen.getByText(/Enter an amount in dollars/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByRole('img', { name: '$63 spent' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save budget' })).not.toBeInTheDocument();
  });

  it('saves a budget typed into the ask', () => {
    const onSave = vi.fn();
    show({}, onSave);
    fireEvent.change(screen.getByLabelText(/weekly food budget/i), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
    expect(onSave.mock.lastCall?.[0].foodBudgetWeekly).toBe(150);
    expect(screen.getByRole('img', { name: '$150 left' })).toBeInTheDocument();
  });

  it('shows the income sentence only with income, with no benchmark comparison', () => {
    const { unmount } = show({ foodBudgetWeekly: 120, spendEntries: [entry('a', 63, 27)] });
    expect(screen.queryByText(/of your weekly income/)).not.toBeInTheDocument();
    unmount();
    show({ foodBudgetWeekly: 120, incomeWeekly: 600, spendEntries: [entry('a', 63, 27)] });
    const s = screen.getByText("You've logged $63 of food spending, which is 10.5% of your weekly income of $600.");
    expect(s.textContent).not.toMatch(/average|typical|poverty|benchmark|compare/i);
  });

  it('shows "Saved with swaps" from this week and links to My week', () => {
    const onOpenWeek = vi.fn();
    render(
      <BudgetView
        profile={{ foodBudgetWeekly: 120, weekSwaps: [{ itemId: 'x', name: 'Soup', saving: 4.5, at: NOW.toISOString() }] }}
        now={NOW}
        onChange={() => {}}
        onOpenWeek={onOpenWeek}
      />,
    );
    expect(screen.getByText('Saved with swaps this week: $4.50')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'My week' }));
    expect(onOpenWeek).toHaveBeenCalled();
  });

  it('lists earlier weeks (totals only) under "Past weeks"', () => {
    show({ foodBudgetWeekly: 120, spendEntries: [entry('a', 45, 21)] });
    const past = screen.getByText('Past weeks').closest('details') as HTMLElement;
    expect(within(past).getByText('$45')).toBeInTheDocument();
    expect(within(past).getByText('Week of 19 Oct')).toBeInTheDocument();
  });

  it('puts the add form on keyboard: Add opens it with focus on the amount, Escape-free Cancel closes it', () => {
    show({ foodBudgetWeekly: 120 });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByLabelText(/amount/i)).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Add' })).toHaveFocus();
  });
});

describe('BudgetView review fixes', () => {
  it('forgets undo, the added note and the skip choice when the profile changes, and its timer is cleared', () => {
    const profile: Profile = { spendEntries: [entry('a', 20, 27, { note: 'Bread' })] };
    const view = (id: string) => (
      <BudgetView profileId={id} profile={profile} now={NOW} onChange={() => {}} />
    );
    const { rerender } = render(view('one'));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: /Remove Bread/ }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    rerender(view('two'));
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save budget' })).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('moves focus to the next row after Remove, else the previous row, else the list heading', () => {
    show({ foodBudgetWeekly: 120, spendEntries: [entry('a', 5, 27, { note: 'Apple' }), entry('b', 6, 27, { note: 'Bread' }), entry('c', 7, 28, { note: 'Cheese' })] });
    // Newest first: Cheese, Bread, Apple.
    fireEvent.click(screen.getByRole('button', { name: /Remove Cheese/ }));
    expect(screen.getByRole('button', { name: /Remove Bread/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Remove Apple/ }));
    expect(screen.getByRole('button', { name: /Remove Bread/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Remove Bread/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Logged this week' })).toHaveFocus();
  });

  it('shows a calm error for a typed date outside the allowed range and adds nothing', () => {
    const onSave = vi.fn();
    show({ foodBudgetWeekly: 120 }, onSave);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/Pick a day from .* to today/)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-10-29' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/Pick a day from .* to today/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/Choose a date/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('logs an earlier day in the allowed range on that day', () => {
    const onSave = vi.fn();
    show({ foodBudgetWeekly: 120 }, onSave);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-10-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(new Date(onSave.mock.lastCall?.[0].spendEntries[0].at).getDate()).toBe(20);
  });

  it('keeps the earlier undo when a second row is removed, and says so', () => {
    show({ foodBudgetWeekly: 120, spendEntries: [entry('a', 5, 27, { note: 'Apple' }), entry('b', 6, 28, { note: 'Bread' })] });
    fireEvent.click(screen.getByRole('button', { name: /Remove Bread/ }));
    fireEvent.click(screen.getByRole('button', { name: /Remove Apple/ }));
    const status = screen.getByRole('status');
    expect(status.textContent).toMatch(/Removed \$5 \(Apple\)/);
    expect(status.textContent).toMatch(/earlier removal can also be undone/i);
    fireEvent.click(within(status).getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toMatch(/Removed \$6 \(Bread\)/);
    fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('clears the "Added" note after a few seconds', () => {
    show({ foodBudgetWeekly: 120 });
    add('12');
    expect(screen.getByText('Added $12.')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('Added $12.')).not.toBeInTheDocument();
  });

  it('stamps a new entry with the time of saving (the clock), not the time the page last rendered', () => {
    const onSave = vi.fn();
    const later = new Date(2026, 9, 28, 12, 30, 0);
    render(<BudgetView profile={{ foodBudgetWeekly: 120 }} now={NOW} clock={() => later} onChange={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.lastCall?.[0].spendEntries[0].at).toBe(later.toISOString());
  });
});

describe('How this compares', () => {
  const source = new StaticBenchmarkSource();
  const rows = source.indicators('budget');
  const section = () => screen.getByRole('region', { name: 'How this compares' });
  const figureItems = () => within(section()).getAllByRole('listitem').filter((el) => el.querySelector('a'));

  it('renders every budget indicator with its dataset value, publisher link and verification', () => {
    show({ foodBudgetWeekly: 120 });
    const items = figureItems();
    expect(items).toHaveLength(rows.length);
    for (const i of rows) {
      const src = source.sources().find((s) => s.id === i.sourceId)!;
      const item = items.find((el) => el.textContent?.includes(i.label) && el.textContent.includes(i.period))!;
      expect(item, i.id).toBeDefined();
      expect(item.textContent).toContain(i.display ?? String(i.value));
      expect(item.textContent).toContain(i.scope);
      expect(item.textContent).toContain(verificationLabel(i.verification));
      const link = within(item).getByRole('link', { name: new RegExp(src.publisher.slice(0, 20)) });
      expect(link).toHaveAttribute('href', src.url);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('shows only the headline rows by default (chosen by id) and the rest under "More figures"', () => {
    show({ foodBudgetWeekly: 120 });
    const ids = HEADLINE_IDS.map((id) => rows.find((r) => r.id === id));
    expect(ids.every(Boolean)).toBe(true);
    const more = screen.getByText('More figures').closest('details') as HTMLElement;
    const inMore = within(more).getAllByRole('listitem').filter((el) => el.querySelector('a'));
    const headline = figureItems().filter((el) => !more.contains(el));
    expect(headline).toHaveLength(HEADLINE_IDS.length);
    expect(inMore).toHaveLength(rows.length - HEADLINE_IDS.length);
    HEADLINE_IDS.forEach((id, n) => expect(headline[n]?.textContent).toContain(rows.find((r) => r.id === id)!.label));
  });

  it('reads the percentage rows with their unit text', () => {
    show({ foodBudgetWeekly: 120 });
    const cpi = figureItems().find((el) => el.textContent?.includes('weighted average of eight capital cities'))!;
    expect(cpi.textContent).toContain('3%');
    expect(cpi.textContent).toContain('change over 12 months');
    const student = figureItems().find((el) => el.textContent?.includes('29% vs 24%'))!;
    expect(student.textContent).not.toMatch(/%[^%]*%[^%]*%/);
  });

  it('labels the 2014 basket "Older data" and not a current CPI row', () => {
    show({ foodBudgetWeekly: 120 });
    const basket = figureItems().find((el) => el.textContent?.includes('Summer 2014') && el.textContent.includes('Victorian Healthy Food Basket'))!;
    expect(basket.textContent).toContain('Older data');
    const cpi = figureItems().find((el) => el.textContent?.includes('weighted average of eight capital cities'))!;
    expect(cpi.textContent).not.toContain('Older data');
  });

  it('never shows research-process remarks', () => {
    show({ foodBudgetWeekly: 120 });
    expect(section().textContent).not.toMatch(/HTTP \d{3}|extraction|access date|could not be opened/i);
  });

  it('carries the poverty-line note, exactly the budget not-found gaps, and the disclaimer after the figures', () => {
    show({ foodBudgetWeekly: 120 });
    expect(screen.getByText('These are lines for total income, not food budgets.')).toBeInTheDocument();
    const gapsHeading = screen.getByText('Not found');
    const gaps = within(gapsHeading.parentElement as HTMLElement).getAllByRole('listitem');
    expect(gaps).toHaveLength(5);
    expect(gaps.map((g) => g.textContent)).toEqual(source.notFound('budget'));
    const more = screen.getByText('More figures').closest('details') as HTMLElement;
    const disclaimer = screen.getByText('General information, not financial advice.');
    expect(more.compareDocumentPosition(gapsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(gapsHeading.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('no figure literals in the budget components', () => {
  const dir = resolve(process.cwd(), 'src/ui');
  const files = readdirSync(dir).filter((f) => /^(Budget[A-Za-z]*|AddSpend|BenchmarkRows)\.tsx$/.test(f));
  it('finds the components', () => expect(files.length).toBeGreaterThanOrEqual(4));
  it.each(files)('%s has no money or percentage figures in its text', (f) => {
    const src = readFileSync(resolve(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const strings = [...src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1|>([^<>{}]+)</g)].map((m) => m[2] ?? m[3] ?? '');
    const figures = strings.filter((s) => /\$\s?\d|\d\s?%/.test(s));
    expect(figures).toEqual([]);
  });
});
