import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaticBenchmarkSource, verificationLabel, type Profile, type SpendEntry } from '@culinerity/core';
import { BudgetView } from './BudgetView';

// Wednesday 28 October 2026, local time (Melbourne): the week began Monday 26th, 5 days left including today.
const NOW = new Date(2026, 9, 28, 12, 0, 0);
const entry = (id: string, amount: number, day: number, extra: Partial<SpendEntry> = {}): SpendEntry => ({
  id, amount, category: 'groceries', at: new Date(2026, 9, day, 10, 0, 0).toISOString(), ...extra,
});

function Harness({ initial, onSave }: { initial: Profile; onSave?: (p: Profile) => void }) {
  const [profile, setProfile] = useState(initial);
  return (
    <BudgetView
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

describe('How this compares', () => {
  const source = new StaticBenchmarkSource();
  const rows = source.indicators('budget');

  it('renders every budget indicator with its dataset value, publisher link, verification and notes', () => {
    show({ foodBudgetWeekly: 120 });
    const section = screen.getByRole('region', { name: 'How this compares' });
    const items = within(within(section).getAllByRole('list')[0]).getAllByRole('listitem');
    expect(items).toHaveLength(rows.length);
    for (const i of rows) {
      const src = source.sources().find((s) => s.id === i.sourceId)!;
      const item = items.find((el) => el.textContent?.includes(i.label) && el.textContent.includes(i.period))!;
      expect(item, i.id).toBeDefined();
      expect(item.textContent).toContain(i.display ?? String(i.value));
      expect(item.textContent).toContain(i.scope);
      expect(item.textContent).toContain(i.period);
      expect(item.textContent).toContain(verificationLabel(i.verification));
      const link = within(item).getByRole('link', { name: new RegExp(src.publisher.slice(0, 20)) });
      expect(link).toHaveAttribute('href', src.url);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('labels the 2014 basket "Older data" and not a current CPI row', () => {
    show({ foodBudgetWeekly: 120 });
    const items = within(within(screen.getByRole('region', { name: 'How this compares' })).getAllByRole('list')[0]).getAllByRole('listitem');
    const basket = items.find((el) => el.textContent?.includes('Summer 2014'))!;
    expect(basket.textContent).toContain('Older data');
    const cpi = items.find((el) => el.textContent?.includes('weighted average of eight capital cities'))!;
    expect(cpi.textContent).not.toContain('Older data');
  });

  it('carries the poverty-line note, the not-found gaps and the advice disclaimer', () => {
    show({ foodBudgetWeekly: 120 });
    expect(screen.getByText('These are lines for total income, not food budgets.')).toBeInTheDocument();
    expect(screen.getByText('Not found')).toBeInTheDocument();
    expect(screen.getByText(/Current healthy food basket cost/)).toBeInTheDocument();
    expect(screen.queryByText(/Foodbank Hunger Report 2025 in a source/)).not.toBeInTheDocument();
    expect(screen.getByText('General information, not financial advice.')).toBeInTheDocument();
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
