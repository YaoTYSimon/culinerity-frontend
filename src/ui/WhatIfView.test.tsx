import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { hasBannedWord, type Profile } from '@culinerity/core';
import { WHATIF_COPY, scannable } from './whatIfCopy';
import { WhatIfView } from './WhatIfView';

// Wednesday 28 October 2026, local time (Melbourne).
const NOW = new Date(2026, 9, 28, 12, 0, 0);
const BASE: Profile = { incomeWeekly: 900, housingWeekly: 450, otherFixedWeekly: 150, foodBudgetWeekly: 120 };

interface Spies { onChange?: (p: Profile) => void; onSeeSwaps?: () => void; onOpenBudget?: () => void; onOpenSupport?: () => void; onOpenNearby?: () => void }

function Harness({ initial, profileId, spies }: { initial: Profile; profileId?: string; spies: Spies }) {
  const [profile, setProfile] = useState(initial);
  return (
    <WhatIfView
      profile={profile}
      profileId={profileId}
      now={NOW}
      onChange={(p) => { setProfile(p); spies.onChange?.(p); }}
      onSeeSwaps={spies.onSeeSwaps ?? (() => {})}
      onOpenBudget={spies.onOpenBudget ?? (() => {})}
      onOpenSupport={spies.onOpenSupport ?? (() => {})}
      onOpenNearby={spies.onOpenNearby ?? (() => {})}
    />
  );
}
const show = (initial: Profile = BASE, spies: Spies = {}, profileId?: string) => render(<Harness initial={initial} profileId={profileId} spies={spies} />);

const pick = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const run = () => fireEvent.click(screen.getByRole('button', { name: 'Show what changes' }));
const rentTenPercent = () => { pick('Rent changes'); pick('goes up'); type('Rent change (%)', '10'); run(); };
const results = () => screen.getByRole('heading', { level: 2, name: 'What changes' }).closest('section') as HTMLElement;

describe('WhatIfView: first screen', () => {
  it('has one h1 "What if" that takes focus, the notice word for word and the privacy line', () => {
    show();
    const h1 = screen.getByRole('heading', { level: 1, name: 'What if' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(h1).toHaveFocus();
    expect(screen.getByText(WHATIF_COPY.notice)).toBeInTheDocument();
    expect(screen.getByText(WHATIF_COPY.privacy)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'What changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows no sharing, copy or print button', () => {
    show();
    expect(screen.queryByRole('button', { name: /share|copy|print|export/i })).not.toBeInTheDocument();
  });

  it('kind pills are a radiogroup operated by arrow keys', () => {
    show();
    const group = screen.getByRole('radiogroup', { name: 'Pick a change' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual([
      'Lose shifts or hours', 'Pay changes', 'Payment changes', 'A one-off bill', 'Rent changes', 'Food prices change', 'A few things at once',
    ]);
    expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute('tabindex', '0');
    expect(radios[0]).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(radios[1], { key: 'ArrowLeft' });
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });
    expect(radios[6]).toHaveAttribute('aria-checked', 'true');
  });

  it('every input has a label and the shared input class', () => {
    show();
    pick('Lose shifts or hours');
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(6);
    for (const input of inputs) {
      expect(input, input.outerHTML).toHaveAccessibleName();
      expect(input.className).toContain('border-2');
      expect(input.className).toContain('rounded-full');
      expect(input).toHaveAttribute('inputmode', 'decimal');
    }
  });
});

describe('WhatIfView: Your numbers', () => {
  it('saves a weekly rent as housingWeekly: 450', () => {
    const onChange = vi.fn();
    show({}, { onChange });
    type('Rent or housing', '450');
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    expect(onChange).toHaveBeenLastCalledWith({ housingWeekly: 450 });
  });

  it('converts a monthly amount to a weekly one once', () => {
    const onChange = vi.fn();
    show({}, { onChange });
    type('Rent or housing', '1950');
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Rent or housing: enter as' })).getByRole('radio', { name: 'per month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    expect(onChange).toHaveBeenLastCalledWith({ housingWeekly: 450 });
    expect(screen.getByLabelText('Rent or housing')).toHaveValue('450');
    expect(within(screen.getByRole('radiogroup', { name: 'Rent or housing: enter as' })).getByRole('radio', { name: 'per week' })).toHaveAttribute('aria-checked', 'true');
  });

  it('clears a figure when its field is emptied, and refuses bad text without saving', () => {
    const onChange = vi.fn();
    show(BASE, { onChange });
    type('Other regular costs', '');
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    expect(onChange).toHaveBeenLastCalledWith({ incomeWeekly: 900, housingWeekly: 450, foodBudgetWeekly: 120 });
    onChange.mockClear();
    type('Income', '-5');
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Income')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(WHATIF_COPY.invalidMoney)).toBeInTheDocument();
    type('Income', '20001');
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    expect(screen.getByText("That's more than we can work with here (up to $20,000 a week). Check the number?")).toBeInTheDocument();
  });

  it('an untouched out-of-range prefilled figure does not block saving another', () => {
    const onChange = vi.fn();
    show({ incomeWeekly: 50000, foodBudgetWeekly: 120 }, { onChange });
    type('Food budget', '150');
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    expect(onChange).toHaveBeenLastCalledWith({ incomeWeekly: 50000, foodBudgetWeekly: 150 });
    expect(screen.queryByText(/more than we can work with/)).not.toBeInTheDocument();
  });

  it('an out-of-range figure the person types is still refused', () => {
    const onChange = vi.fn();
    show({ incomeWeekly: 50000 }, { onChange });
    type('Income', '50001');
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('can save zero income', () => {
    const onChange = vi.fn();
    show({}, { onChange });
    type('Income', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    expect(onChange).toHaveBeenLastCalledWith({ incomeWeekly: 0 });
  });
});

describe('WhatIfView: rent goes up 10%', () => {
  it('shows nothing until the button is pressed, then focuses "What changes" and says "Results ready" once', () => {
    show();
    pick('Rent changes');
    pick('goes up');
    type('Rent change (%)', '10');
    expect(screen.queryByRole('heading', { name: 'What changes' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('status')[0]).toBeEmptyDOMElement();
    run();
    expect(screen.getByRole('heading', { level: 2, name: 'What changes' })).toHaveFocus();
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Results ready');
    expect(screen.getAllByRole('status').filter((n) => n.textContent)).toHaveLength(1);
  });

  it('reads the headline, a captioned before/after table and the worked lines', () => {
    show();
    rentTenPercent();
    const r = within(results());
    expect(r.getByText("With this change you'd have $45 less each week after the costs you told us about: $255 left instead of $300.")).toBeInTheDocument();
    const table = r.getByRole('table');
    expect(within(table).getByText(/^Before and after/, { selector: 'caption' })).toBeInTheDocument();
    const cols = within(table).getAllByRole('columnheader');
    expect(cols.map((c) => c.textContent)).toEqual(['', 'Before', 'After', 'Change']);
    cols.forEach((c) => expect(c).toHaveAttribute('scope', 'col'));
    const rentRow = within(table).getByRole('row', { name: /^Rent or housing/ });
    expect(within(rentRow).getByRole('rowheader')).toHaveAttribute('scope', 'row');
    expect(rentRow).toHaveTextContent('$450');
    expect(rentRow).toHaveTextContent('$495');
    expect(rentRow).toHaveTextContent('$45 more');
    const left = within(table).getByRole('row', { name: /^Left after costs/ });
    expect(left).toHaveTextContent('$300');
    expect(left).toHaveTextContent('$255');
    expect(left).toHaveTextContent('$45 less');
    expect(r.getByRole('heading', { name: 'How we worked this out' })).toBeInTheDocument();
    expect(r.getByText('You told us rent is $450 a week. 10% of $450 is $45, so rent would be $495.')).toBeInTheDocument();
    expect(r.getByText("What we don't know")).toBeInTheDocument();
    expect(r.queryByText(WHATIF_COPY.shortfall)).not.toBeInTheDocument();
  });

  it('shows the rent context rows with period and how they were read, and no food-insecurity figure', () => {
    show();
    rentTenPercent();
    const text = screen.getByRole('heading', { level: 2, name: 'What changes' }).closest('section')!.textContent ?? '';
    expect(text).toContain('$595');
    expect(text).toContain('4.8%');
    expect(text).toContain('June quarter 2026');
    expect(text).toContain('Read from the source itself');
    expect(text).not.toMatch(/insecur|hunger|go without/i);
  });

  it('the try row fills the percentage', () => {
    show();
    pick('Rent changes');
    fireEvent.click(within(screen.getByRole('group', { name: 'Try a number' })).getByRole('button', { name: '15%' }));
    expect(screen.getByLabelText('Rent change (%)')).toHaveValue('15');
  });

  it('keeps the results when the draft changes, until the button is pressed again', () => {
    show();
    rentTenPercent();
    type('Rent change (%)', '20');
    expect(screen.getByText(/\$255 left instead of \$300/)).toBeInTheDocument();
    run();
    expect(screen.getByText(/\$210 left instead of \$300/)).toBeInTheDocument();
  });

  it('the visible text has no banned word and no "AI"', () => {
    const { container } = show();
    rentTenPercent();
    // Context rows are the sources' own words, so only our own sections are scanned.
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-context]').forEach((n) => n.remove());
    const text = scannable(clone.textContent ?? '');
    expect(hasBannedWord(text), text).toBe(false);
    expect(text).not.toMatch(/NaN|undefined|Infinity/);
  });
});

describe('WhatIfView: bad text', () => {
  const FIELDS: { kind: string; setup?: () => void; label: string }[] = [
    { kind: 'Lose shifts or hours', label: 'Number of shifts' },
    { kind: 'Lose shifts or hours', label: 'Take-home pay per shift ($)' },
    { kind: 'Pay changes', label: 'Pay change (%)' },
    { kind: 'Payment changes', label: 'Payment change ($)' },
    { kind: 'A one-off bill', label: 'Bill amount ($)' },
    { kind: 'Rent changes', label: 'Rent change (%)' },
    { kind: 'Rent changes', setup: () => pick('in dollars'), label: 'Rent change ($)' },
    { kind: 'Food prices change', label: 'Food price change (%)' },
  ];
  const VALID: Record<string, string> = { 'Number of shifts': '1', 'Take-home pay per shift ($)': '120', 'Pay change (%)': '10', 'Payment change ($)': '50', 'Bill amount ($)': '300', 'Rent change (%)': '10', 'Rent change ($)': '50', 'Food price change (%)': '10' };

  it.each(FIELDS)('refuses bad text in $label ($kind)', ({ kind, setup, label }) => {
    for (const bad of ['-5', 'abc', '1e9', 'NaN', '']) {
      const { unmount } = show();
      pick(kind);
      setup?.();
      // Fill every other field with a valid value so only this one can be at fault.
      for (const f of FIELDS.filter((x) => x.kind === kind && x.label !== label && (x.setup === undefined) === (setup === undefined))) type(f.label, VALID[f.label]);
      type(label, bad);
      run();
      const input = screen.getByLabelText(label);
      expect(input, `${label} <- "${bad}"`).toHaveAttribute('aria-invalid', 'true');
      expect(input.getAttribute('aria-describedby')).toBeTruthy();
      expect(screen.queryByRole('heading', { name: 'What changes' }), bad).not.toBeInTheDocument();
      expect(document.getElementById(input.getAttribute('aria-describedby')!.split(' ').pop()!)?.textContent).toMatch(/\S/);
      unmount();
    }
  });

  it('leaves earlier results unchanged when a new press is refused', () => {
    show();
    rentTenPercent();
    const before = results().textContent;
    type('Rent change (%)', 'abc');
    run();
    expect(results().textContent).toBe(before);
    expect(screen.getByLabelText('Rent change (%)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('puts focus on the first field that needs fixing', () => {
    show();
    pick('Lose shifts or hours');
    type('Number of shifts', '1');
    run();
    expect(screen.getByLabelText('Take-home pay per shift ($)')).toHaveFocus();
  });

  it('says how big is too big', () => {
    show();
    pick('A one-off bill');
    type('Bill amount ($)', '100001');
    run();
    expect(screen.getByText("That's more than we can work with here (up to $100,000). Check the number?")).toBeInTheDocument();
  });
});

describe('WhatIfView: missing and unusual numbers', () => {
  it('asks for the missing rent and shows no table', () => {
    show({ incomeWeekly: 900 });
    rentTenPercent();
    expect(screen.getByText(WHATIF_COPY.needsRent)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'What changes' })).toHaveFocus();
  });

  it('asks for income when a pay change needs it', () => {
    show({});
    pick('Pay changes');
    pick('goes down');
    type('Pay change (%)', '10');
    run();
    expect(screen.getByText(/we need your weekly income/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('with no income shows only the change rows and a prompt for income', () => {
    show({ housingWeekly: 450 });
    rentTenPercent();
    const r = within(results());
    expect(r.getByText("Rent would go up $45 a week, $180 over four weeks.")).toBeInTheDocument();
    expect(r.getByText("Add your weekly income to see what's left")).toBeInTheDocument();
    expect(r.queryByRole('row', { name: /^Left after/ })).not.toBeInTheDocument();
    expect(r.queryByRole('row', { name: /^Income/ })).not.toBeInTheDocument();
    expect(results().textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('a dollar rent change without a rent entered shows the stated change', () => {
    show({});
    pick('Rent changes');
    pick('goes up');
    pick('in dollars');
    type('Rent change ($)', '23');
    run();
    const row = within(results()).getByRole('row', { name: /^Rent or housing/ });
    expect(row).toHaveTextContent('$23 more');
    expect(results().textContent).not.toMatch(/NaN|undefined|null/);
  });

  it('zero income gives "short by" wording and no NaN', () => {
    show({ ...BASE, incomeWeekly: 0 });
    rentTenPercent();
    const left = within(results()).getByRole('row', { name: /^Left after costs/ });
    expect(left).toHaveTextContent('short by $600');
    expect(left).toHaveTextContent('short by $645');
    expect(results().textContent).not.toMatch(/NaN|undefined|Infinity/);
    expect(screen.getByText(WHATIF_COPY.shortfall)).toBeInTheDocument();
  });
});

describe('WhatIfView: lose shifts and the help list', () => {
  const loseTwoShifts = () => {
    pick('Lose shifts or hours');
    type('Number of shifts', '2');
    type('Take-home pay per shift ($)', '120');
    run();
  };

  it('puts the shortfall copy and the help list above the table, with the two verified contacts', () => {
    const spies = { onSeeSwaps: vi.fn(), onOpenBudget: vi.fn(), onOpenSupport: vi.fn(), onOpenNearby: vi.fn() };
    show(BASE, spies);
    loseTwoShifts();
    const r = results();
    const short = within(r).getByText(WHATIF_COPY.shortfall);
    const table = within(r).getByRole('table');
    expect(short.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const help = within(r).getByRole('list', { name: 'What could help' });
    expect(help.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(help).getByRole('link', { name: '1800 007 007' })).toHaveAttribute('href', 'tel:1800007007');
    expect(help).toHaveTextContent('weekdays 9:30am to 4:30pm');
    expect(within(help).getByRole('link', { name: /ndh\.org\.au/ })).toHaveAttribute('href', 'https://ndh.org.au/');
    expect(within(help).getByRole('link', { name: /Foodbank Find Food/ })).toHaveAttribute('href', 'https://findfood.foodbank.org.au/');
    fireEvent.click(within(help).getByRole('button', { name: 'Cheaper swaps' }));
    fireEvent.click(within(help).getByRole('button', { name: 'Budget' }));
    fireEvent.click(within(help).getByRole('button', { name: 'Food support' }));
    fireEvent.click(within(help).getByRole('button', { name: 'Nearby' }));
    expect(spies.onSeeSwaps).toHaveBeenCalledTimes(1);
    expect(spies.onOpenBudget).toHaveBeenCalledTimes(1);
    expect(spies.onOpenSupport).toHaveBeenCalledTimes(1);
    expect(spies.onOpenNearby).toHaveBeenCalledTimes(1);
  });

  it('puts the help list after the result when nothing is short', () => {
    show();
    rentTenPercent();
    const r = results();
    const table = within(r).getByRole('table');
    const help = within(r).getByRole('list', { name: 'What could help' });
    expect(table.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(r).queryByText(WHATIF_COPY.shortfall)).not.toBeInTheDocument();
  });

  it('names the swaps cover: $18 of the $60 gap', () => {
    show({ ...BASE, weekSwaps: [{ itemId: 'a', name: 'Lentil bake', saving: 18, at: NOW.toISOString() }] });
    loseTwoShifts();
    expect(screen.getByText('Swaps you added in the last 7 days saved $18. If that happened each week it would cover $18 of the $60 gap.')).toBeInTheDocument();
  });

  it('says nothing about swaps when there are none or nothing is short', () => {
    show(BASE);
    loseTwoShifts();
    expect(screen.queryByText(/Swaps you added/)).not.toBeInTheDocument();
  });
});

describe('WhatIfView: a few things at once', () => {
  it('combines two changes and runs them together', () => {
    show();
    pick('A few things at once');
    const group = screen.getByRole('group', { name: 'Which changes?' });
    fireEvent.click(within(group).getByRole('button', { name: 'Rent changes' }));
    expect(within(group).getByRole('button', { name: 'Rent changes' })).toHaveAttribute('aria-pressed', 'true');
    run();
    expect(screen.getByText(WHATIF_COPY.pickTwo)).toBeInTheDocument();
    fireEvent.click(within(group).getByRole('button', { name: 'Pay changes' }));
    fireEvent.click(screen.getAllByRole('radio', { name: 'goes up' })[0]);
    type('Rent change (%)', '10');
    type('Pay change (%)', '10');
    run();
    expect(screen.getByText(/\$345 left instead of \$300/)).toBeInTheDocument();
  });
});

describe('WhatIfView: Start again and profile switch', () => {
  it('empties the draft and results, keeps Your numbers and focuses the first control', () => {
    show();
    rentTenPercent();
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }));
    expect(screen.queryByRole('heading', { name: 'What changes' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Rent change (%)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Income')).toHaveValue('900');
    expect(screen.getAllByRole('status')[0]).toBeEmptyDOMElement();
    const first = within(screen.getByRole('radiogroup', { name: 'Pick a change' })).getAllByRole('radio')[0];
    expect(first).toHaveFocus();
    pick('Rent changes');
    expect(screen.getByLabelText('Rent change (%)')).toHaveValue('');
  });

  it('resets the draft when the profile changes', () => {
    const { rerender } = render(<WhatIfView profile={BASE} profileId="a" now={NOW} onChange={() => {}} onSeeSwaps={() => {}} onOpenBudget={() => {}} onOpenSupport={() => {}} onOpenNearby={() => {}} />);
    rentTenPercent();
    expect(screen.getByRole('table')).toBeInTheDocument();
    rerender(<WhatIfView profile={BASE} profileId="b" now={NOW} onChange={() => {}} onSeeSwaps={() => {}} onOpenBudget={() => {}} onOpenSupport={() => {}} onOpenNearby={() => {}} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Rent change (%)')).not.toBeInTheDocument();
  });

});
