import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@culinerity/core';
import { WHATIF_COPY } from './whatIfCopy';
import { WhatIfView } from './WhatIfView';

// If an assertion here fails, fix the code, not the test.

const NOW = new Date(2026, 9, 28, 12, 0, 0);
const BASE: Profile = { incomeWeekly: 900, housingWeekly: 450, otherFixedWeekly: 150, foodBudgetWeekly: 120 };

function Harness({ initial }: { initial: Profile }) {
  const [profile, setProfile] = useState(initial);
  return (
    <WhatIfView
      profile={profile} now={NOW} onChange={setProfile}
      onSeeSwaps={() => {}} onOpenBudget={() => {}} onOpenSupport={() => {}} onOpenNearby={() => {}}
    />
  );
}
const show = (initial: Profile = BASE) => render(<Harness initial={initial} />);
const pick = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const run = () => fireEvent.click(screen.getByRole('button', { name: 'Show what changes' }));
const rentTen = () => { pick('Rent changes'); pick('goes up'); type('Rent change (%)', '10'); run(); };

afterEach(() => vi.unstubAllGlobals());

describe('structure', () => {
  it('has exactly one h1 before, during and after a result, and with saved items', () => {
    show();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    rentTen();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.saveThis }));
    pick('Rent changes'); pick('goes up'); type('Rent change (%)', '20'); run();
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.saveThis }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(2);
  });

  it('every text input in every state has an accessible name', () => {
    show();
    rentTen();
    fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.saveThis }));
    fireEvent.click(screen.getByRole('button', { name: /^Rename/ }));
    for (const input of screen.getAllByRole('textbox')) expect(input, input.outerHTML).toHaveAccessibleName();
    for (const radio of screen.getAllByRole('radio')) expect(radio, radio.outerHTML).toHaveAccessibleName();
  });

  it('kind pills are a named radiogroup with arrow-key and roving tabindex', () => {
    show();
    const radios = within(screen.getByRole('radiogroup', { name: 'Pick a change' })).getAllByRole('radio');
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios.filter((r) => r.getAttribute('tabindex') === '0')).toHaveLength(1);
  });
});

describe('the results table keeps its semantics at narrow widths', () => {
  it('has a caption, explicit roles on every part, and scopes', () => {
    show();
    rentTen();
    const table = screen.getByRole('table');
    expect(table.tagName).toBe('TABLE');
    expect(table.querySelector('caption')).not.toBeNull();
    expect(table).toHaveAttribute('role', 'table');
    for (const g of Array.from(table.querySelectorAll('thead, tbody'))) expect(g).toHaveAttribute('role', 'rowgroup');
    for (const tr of Array.from(table.querySelectorAll('tr'))) expect(tr).toHaveAttribute('role', 'row');
    for (const th of Array.from(table.querySelectorAll('thead th'))) {
      expect(th).toHaveAttribute('scope', 'col');
      expect(th).toHaveAttribute('role', 'columnheader');
    }
    const heads = Array.from(table.querySelectorAll('tbody th'));
    expect(heads.length).toBeGreaterThan(0);
    for (const th of heads) {
      expect(th).toHaveAttribute('scope', 'row');
      expect(th).toHaveAttribute('role', 'rowheader');
    }
    for (const td of Array.from(table.querySelectorAll('tbody td'))) expect(td).toHaveAttribute('role', 'cell');
  });
});

describe('focus, errors and live regions', () => {
  it('moves focus to the results heading on each press', () => {
    show();
    rentTen();
    expect(screen.getByRole('heading', { level: 2, name: 'What changes' })).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    run();
    expect(screen.getByRole('heading', { level: 2, name: 'What changes' })).toHaveFocus();
  });

  it('a refused press sets aria-invalid, a described message and focus on the field', () => {
    show();
    pick('Rent changes'); pick('goes up'); type('Rent change (%)', 'abc'); run();
    const input = screen.getByLabelText('Rent change (%)');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    const msg = document.getElementById(input.getAttribute('aria-describedby')!.split(' ').pop()!);
    expect(msg?.textContent).toMatch(/\S/);
  });

  /** Counts how many role=status regions had their text change during `act`. */
  function changedStatuses(act_: () => void): string[] {
    const changed = new Set<Element>();
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        const host = (r.target instanceof Element ? r.target : r.target.parentElement)?.closest('[role="status"]');
        if (host) changed.add(host);
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    act_();
    obs.takeRecords().forEach((r) => {
      const host = (r.target instanceof Element ? r.target : r.target.parentElement)?.closest('[role="status"]');
      if (host) changed.add(host);
    });
    obs.disconnect();
    return [...changed].map((e) => e.textContent ?? '');
  }

  it('exactly one role=status update per press, with the undo region quiet', () => {
    show();
    pick('Rent changes'); pick('goes up'); type('Rent change (%)', '10');
    expect(changedStatuses(run)).toEqual([WHATIF_COPY.resultsReady]);
    expect(changedStatuses(() => fireEvent.click(screen.getByRole('button', { name: WHATIF_COPY.saveThis })))).toHaveLength(1);
    // Removing speaks only through the undo region, once.
    const removed = changedStatuses(() => fireEvent.click(screen.getByRole('button', { name: /^Remove/ })));
    expect(removed).toHaveLength(1);
    expect(removed[0]).toMatch(/^Removed/);
  });

  it('renders the final state under reduced motion: no animated elements', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }));
    const { container } = show();
    rentTen();
    expect(screen.getByText(/\$255 left instead of \$300/)).toBeInTheDocument();
    expect(container.querySelector('[class*="animate-"], [style*="animation"]')).toBeNull();
  });
});
