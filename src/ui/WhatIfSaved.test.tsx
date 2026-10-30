import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasBannedWord, type Profile, type SavedWhatIf } from '@culinerity/core';
import { scannable, WHATIF_COPY } from './whatIfCopy';
import { buildScenario, scenarioToDraft } from './whatIfDraft';
import { WhatIfView } from './WhatIfView';

const NOW = new Date(2026, 9, 28, 12, 0, 0);
const BASE: Profile = { incomeWeekly: 900, housingWeekly: 450, otherFixedWeekly: 150, foodBudgetWeekly: 120 };

function Harness({ initial, spy }: { initial: Profile; spy?: (p: Profile) => void }) {
  const [profile, setProfile] = useState(initial);
  return (
    <WhatIfView
      profile={profile} now={NOW}
      onChange={(p) => { setProfile(p); spy?.(p); }}
      onSeeSwaps={() => {}} onOpenBudget={() => {}} onOpenSupport={() => {}} onOpenNearby={() => {}}
    />
  );
}
const show = (initial: Profile = BASE, spy?: (p: Profile) => void) => render(<Harness initial={initial} spy={spy} />);

const pick = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const run = () => fireEvent.click(screen.getByRole('button', { name: 'Show what changes' }));
const rentPercent = (pct: string, dir = 'goes up') => { pick('Rent changes'); pick(dir); type('Rent change (%)', pct); run(); };
const save = (name?: string) => {
  if (name !== undefined) type('Name', name);
  fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.saveThis }));
};
const items = () => screen.queryAllByRole('listitem').filter((li) => li.closest('[data-saved-list]'));
const names = () => items().map((li) => li.querySelector('[data-name]')?.textContent);

afterEach(() => vi.useRealTimers());

describe('saved what-ifs', () => {
  it('shows the empty line first', () => {
    show();
    expect(screen.getByText(WHATIF_COPY.empty)).toBeInTheDocument();
  });

  it('saves with the default name, then renames to a 40 character name', () => {
    show();
    rentPercent('10');
    expect(screen.getByLabelText('Name')).toHaveValue('Rent up 10%');
    save();
    expect(names()).toEqual(['Rent up 10%']);
    fireEvent.click(screen.getByRole('button', { name: 'Rename Rent up 10%' }));
    const forty = 'a'.repeat(40);
    type(WHATIF_COPY.newName, forty);
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.saveName }));
    expect(names()).toEqual([forty]);
  });

  it('two rename forms open together have different input ids', () => {
    show();
    rentPercent('10');
    save();
    rentPercent('20');
    save();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Rent up 10%' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rename Rent up 20%' }));
    const inputs = screen.getAllByLabelText(WHATIF_COPY.newName);
    expect(inputs).toHaveLength(2);
    expect(inputs[0].id).not.toBe(inputs[1].id);
    expect(new Set(inputs.map((i) => i.id)).size).toBe(2);
  });

  it('refuses a 41 character name with a message and does not save', () => {
    show();
    rentPercent('10');
    save('b'.repeat(41));
    expect(screen.getByText(WHATIF_COPY.nameTooLong)).toBeInTheDocument();
    expect(names()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.saveThis }));
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('refuses a 41 character rename and keeps the old name', () => {
    show();
    rentPercent('10');
    save();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Rent up 10%' }));
    type(WHATIF_COPY.newName, 'c'.repeat(41));
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.saveName }));
    expect(screen.getByText(WHATIF_COPY.nameTooLong)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.cancel }));
    expect(names()).toEqual(['Rent up 10%']);
  });

  it('keeps ten, and an eleventh shows the full message and leaves the list unchanged', () => {
    show();
    rentPercent('1');
    for (let i = 1; i <= 10; i++) save(`Item ${i}`);
    expect(items()).toHaveLength(10);
    save('Item 11');
    expect(screen.getByText(WHATIF_COPY.listFull)).toBeInTheDocument();
    expect(WHATIF_COPY.listFull).toBe('You can keep up to 10 what-ifs. Remove one to save another.');
    expect(items()).toHaveLength(10);
    expect(names()).not.toContain('Item 11');
  });

  it('Remove offers Undo for 6 seconds and Undo puts it back in place', () => {
    vi.useFakeTimers();
    show();
    rentPercent('1');
    save('One'); save('Two'); save('Three');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Two' }));
    expect(names()).toEqual(['One', 'Three']);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(names()).toEqual(['One', 'Two', 'Three']);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove One' }));
    act(() => { vi.advanceTimersByTime(5900); });
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(names()).toEqual(['Two', 'Three']);
  });

  it('moves focus to a neighbour after Remove and to the restored item after Undo', () => {
    show();
    rentPercent('1');
    save('One'); save('Two');
    fireEvent.click(screen.getByRole('button', { name: 'Remove One' }));
    expect(screen.getByRole('button', { name: 'Remove Two' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: 'Open One' })).toHaveFocus();
  });

  it('Clear all then Undo restores everything', () => {
    show();
    rentPercent('1');
    save('One'); save('Two');
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.clearAll }));
    expect(names()).toEqual([]);
    expect(screen.getByText(WHATIF_COPY.empty)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(names()).toEqual(['One', 'Two']);
  });

  it('clears the undo timer on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = show();
    rentPercent('1');
    save('One');
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    fireEvent.click(screen.getByRole('button', { name: 'Remove One' }));
    clear.mockClear();
    unmount();
    expect(clear).toHaveBeenCalled();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => { vi.advanceTimersByTime(7000); });
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
    clear.mockRestore();
  });

  it('opening a saved item refills the form and works it out again with today\'s numbers', () => {
    show();
    rentPercent('10');
    save();
    expect(screen.getByText(/\$255 left instead of \$300/)).toBeInTheDocument();
    pick('Pay changes'); // change the form so opening has to refill it
    fireEvent.change(screen.getByLabelText('Income'), { target: { value: '800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Rent up 10%' }));
    expect(screen.getByRole('radio', { name: 'Rent changes' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Rent change (%)')).toHaveValue('10');
    expect(screen.getByText(/\$155 left instead of \$200/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'What changes' })).toHaveFocus();
  });

  it('skips corrupt stored items silently', () => {
    const good: SavedWhatIf = { id: 'g', name: 'Good one', scenario: { kind: 'pay-change', direction: 'down', bp: 500 }, savedAt: '2026-10-01T00:00:00.000Z' };
    const bad = { id: 'x', name: '', scenario: { kind: 'nope' }, savedAt: 1 } as unknown as SavedWhatIf;
    show({ ...BASE, whatIfScenarios: [bad, good, null as unknown as SavedWhatIf] });
    expect(names()).toEqual(['Good one']);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stores inputs only in the profile', () => {
    const spy = vi.fn();
    show(BASE, spy);
    rentPercent('10');
    save();
    const stored = spy.mock.calls.at(-1)![0] as Profile;
    expect(stored.whatIfScenarios).toHaveLength(1);
    expect(Object.keys(stored.whatIfScenarios![0]).sort()).toEqual(['id', 'name', 'savedAt', 'scenario']);
    const json = JSON.stringify(stored.whatIfScenarios);
    expect(json).not.toMatch(/leftAfter|incomeWeekly|housingWeekly|otherFixedWeekly|foodBudgetWeekly|baseline/);
  });
});

describe('scenarioToDraft', () => {
  it('round-trips every kind through the form builder', () => {
    const scenarios = [
      { kind: 'lose-work', unit: 'hours', count: 2.5, payPerUnit: 2550, everyWeeks: 2 },
      { kind: 'pay-change', direction: 'down', bp: 750 },
      { kind: 'payment-change', direction: 'up', amount: { cents: 12050, per: 'fortnight' } },
      { kind: 'one-off-bill', cents: 30000, week: 3 },
      { kind: 'rent-change', direction: 'up', by: { mode: 'dollars', amount: { cents: 2000, per: 'month' } } },
      { kind: 'rent-change', direction: 'down', by: { mode: 'percent', bp: 1000 } },
      { kind: 'food-price-change', direction: 'up', bp: 500 },
      { kind: 'combined', steps: [{ kind: 'pay-change', direction: 'down', bp: 500 }, { kind: 'one-off-bill', cents: 10000, week: 1 }] },
    ] as const;
    for (const s of scenarios) {
      const d = scenarioToDraft(s as never);
      const built = buildScenario(d.kind, d.picked, d.values);
      expect(built.ok, JSON.stringify(s)).toBe(true);
      if (built.ok) expect(built.scenario).toEqual(s);
    }
  });
});

describe('compare', () => {
  const twoSaved = () => {
    show();
    rentPercent('10'); save();
    pick('Rent changes'); pick('goes up'); type('Rent change (%)', '20'); run(); save();
  };
  const compareTable = () => screen.getByRole('table', { name: new RegExp(WHATIF_COPY.compareCaption) });
  const choose = (group: string, name: string) => fireEvent.click(within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name }));

  it('offers a picker only when there are two things to compare', () => {
    show();
    expect(screen.queryByRole('radiogroup', { name: WHATIF_COPY.compareFirst })).not.toBeInTheDocument();
    rentPercent('10');
    expect(screen.queryByRole('radiogroup', { name: WHATIF_COPY.compareFirst })).not.toBeInTheDocument();
    save();
    expect(screen.getByRole('radiogroup', { name: WHATIF_COPY.compareFirst })).toBeInTheDocument();
  });

  it('renders a captioned table with the sentence, and never says better or worse', () => {
    twoSaved();
    choose('First', 'Rent up 10%');
    choose('Second', 'Rent up 20%');
    const table = compareTable();
    expect(within(table).getAllByRole('columnheader').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Second leaves $45 a week less than first.')).toBeInTheDocument();
    const text = scannable(table.closest('section')!.textContent ?? '');
    expect(text).not.toMatch(/\b(better|worse)\b/i);
    expect(hasBannedWord(text), text).toBe(false);
  });

  it('keeps table semantics explicit so a grid layout cannot drop them', () => {
    twoSaved();
    choose('First', 'Rent up 10%');
    choose('Second', 'Rent up 20%');
    const table = compareTable();
    expect(table.tagName).toBe('TABLE');
    expect(table.querySelector('caption')).not.toBeNull();
    expect(table).toHaveAttribute('role', 'table');
    for (const tr of Array.from(table.querySelectorAll('tr'))) expect(tr).toHaveAttribute('role', 'row');
    for (const th of Array.from(table.querySelectorAll('thead th'))) {
      expect(th).toHaveAttribute('scope', 'col');
      expect(th).toHaveAttribute('role', 'columnheader');
    }
    const rowHeads = Array.from(table.querySelectorAll('tbody th'));
    expect(rowHeads.length).toBeGreaterThan(0);
    for (const th of rowHeads) {
      expect(th).toHaveAttribute('scope', 'row');
      expect(th).toHaveAttribute('role', 'rowheader');
    }
    for (const td of Array.from(table.querySelectorAll('tbody td'))) expect(td).toHaveAttribute('role', 'cell');
    expect(within(table).getAllByRole('rowheader').length).toBe(rowHeads.length);
  });

  it('can compare the result just tried with a saved one', () => {
    show();
    rentPercent('10'); save();
    pick('Pay changes'); pick('goes down'); type('Pay change (%)', '10'); run();
    choose('First', 'Rent up 10%');
    choose('Second', WHATIF_COPY.compareDraft);
    expect(compareTable()).toBeInTheDocument();
  });

  it('says which number a compared item needs', () => {
    const saved: SavedWhatIf = { id: 'r', name: 'Rent up 10%', scenario: { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 1000 } }, savedAt: '2026-10-01T00:00:00.000Z' };
    const pay: SavedWhatIf = { id: 'p', name: 'Pay down 5%', scenario: { kind: 'pay-change', direction: 'down', bp: 500 }, savedAt: '2026-10-01T00:00:00.000Z' };
    show({ incomeWeekly: 900, whatIfScenarios: [saved, pay] });
    choose('First', 'Rent up 10%');
    choose('Second', 'Pay down 5%');
    expect(screen.queryByRole('table', { name: new RegExp(WHATIF_COPY.compareCaption) })).not.toBeInTheDocument();
    expect(screen.getByText(/Rent up 10%: To work this out we need your weekly rent/)).toBeInTheDocument();
  });

  it('Start again clears the choices', () => {
    twoSaved();
    choose('First', 'Rent up 10%');
    choose('Second', 'Rent up 20%');
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.startAgain }));
    expect(screen.queryByRole('table', { name: new RegExp(WHATIF_COPY.compareCaption) })).not.toBeInTheDocument();
  });
});
