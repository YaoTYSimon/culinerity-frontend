import { fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TRADEOFF_CATEGORIES, TRADEOFF_LABELS, TRADEOFF_TIER, type TradeoffCategory } from '@culinerity/core';
import { SupportCard } from './SupportCard';
import { TradeoffsView } from './TradeoffsView';
import { SUPPORT_BODY } from './tradeoffCopy';

const NOW = new Date(2026, 9, 28, 12, 0, 0);
const L = TRADEOFF_LABELS;

function View({ onOpenSupport = () => {} }: { onOpenSupport?: () => void }) {
  const [entries, setEntries] = useState<import('@culinerity/core').TradeoffEntry[] | undefined>();
  let n = 0;
  return <TradeoffsView entries={entries} now={NOW} newId={() => `n-${++n}`} onChange={setEntries} onOpenBudget={() => {}} onOpenSupport={onOpenSupport} />;
}
const log = (c: TradeoffCategory) => {
  fireEvent.click(screen.getByRole('button', { name: 'Add a trade-off' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Add a trade-off' })).getByRole('button', { name: L[c] }));
};
const card = () => screen.queryByRole('heading', { level: 2, name: 'If it would help' });
/** Queries scoped to the card, since the closed disclosure holds the same links. */
const inCard = () => within(card()!.closest('section')!);

afterEach(() => vi.restoreAllMocks());

describe('support card on the view', () => {
  it('appears under the status line for meal-skipped, child-meal, bill-delayed, borrowed, health-skipped and not for the other five', () => {
    for (const c of TRADEOFF_CATEGORIES) {
      const { unmount } = render(<View />);
      expect(card()).toBeNull();
      log(c);
      if (c === 'other') fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      const shows = TRADEOFF_TIER[c] !== 'none';
      expect(card() !== null, c).toBe(shows);
      if (shows) {
        const status = screen.getByRole('status');
        expect(status.compareDocumentPosition(card()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
      unmount();
    }
  });

  it('food tiers show the Find Food link (https, rel noopener) and a button that calls onOpenSupport', () => {
    const open = vi.fn();
    render(<View onOpenSupport={open} />);
    log('meal-skipped');
    const link = inCard().getByRole('link', { name: /Find free food near you/ });
    expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    expect(link.getAttribute('rel')).toContain('noopener');
    fireEvent.click(inCard().getByRole('button', { name: 'See food support places' }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('money and health show the debt line then Lifeline, with tel links, and no food links', () => {
    render(<View />);
    log('bill-delayed');
    expect(inCard().getByRole('link', { name: '1800 007 007' })).toHaveAttribute('href', 'tel:1800007007');
    expect(inCard().getByText(/National Debt Helpline, free financial counselling:/)).toHaveTextContent('(weekdays)');
    expect(inCard().getByRole('link', { name: '13 11 14' })).toHaveAttribute('href', 'tel:131114');
    expect(inCard().getByRole('link', { name: '000' })).toHaveAttribute('href', 'tel:000');
    expect(inCard().queryByRole('link', { name: /Find free food/ })).toBeNull();
    expect(inCard().queryByRole('button', { name: 'See food support places' })).toBeNull();
  });

  it('Kids Helpline line only for child-meal', () => {
    const { unmount } = render(<View />);
    log('meal-skipped');
    expect(inCard().queryByRole('link', { name: '1800 55 1800' })).toBeNull();
    unmount();
    render(<View />);
    log('child-meal');
    expect(inCard().getByText(/If your child wants someone to talk to: Kids Helpline/)).toHaveTextContent('1800 55 1800.');
    expect(inCard().getByRole('link', { name: '1800 55 1800' })).toHaveAttribute('href', 'tel:1800551800');
  });

  it('card is not role=alert or dialog, has an h2 "If it would help", Close removes it and focus returns to the status line', () => {
    render(<View />);
    log('meal-skipped');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(card()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(card()).toBeNull();
    expect(screen.getByRole('status')).toHaveFocus();
  });

  it('exact body sentence', () => {
    render(<View />);
    log('borrowed');
    expect(screen.getByText('Plenty of people go without to get by, and help exists. None of this is reported to anyone.')).toBeInTheDocument();
    expect(SUPPORT_BODY).toBe('Plenty of people go without to get by, and help exists. None of this is reported to anyone.');
  });

  it('showing and closing the card writes nothing to storage and makes no fetch', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const set = vi.spyOn(Storage.prototype, 'setItem');
    render(<View />);
    log('child-meal');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(set).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('Need a hand? disclosure is on the view with an empty week and has Find Food, Food support, National Debt Helpline, Lifeline', () => {
    const open = vi.fn();
    render(<View onOpenSupport={open} />);
    const summary = screen.getByText('Need a hand?');
    const details = summary.closest('details')!;
    expect(details.open).toBe(false);
    const inside = within(details);
    expect(inside.getByRole('link', { name: /Find free food near you/ })).toBeInTheDocument();
    fireEvent.click(inside.getByRole('button', { name: 'See food support places' }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(inside.getByRole('link', { name: '1800 007 007' })).toBeInTheDocument();
    expect(inside.getByRole('link', { name: '13 11 14' })).toBeInTheDocument();
    expect(details).toHaveTextContent('Kids Helpline, for children and young people:');
    expect(inside.getByRole('link', { name: '1800 55 1800' })).toBeInTheDocument();
  });

  it('SupportCard renders nothing for a category with no support', () => {
    const { container } = render(<SupportCard category="self-treat" onOpenSupport={() => {}} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('banned words grep passes for the card copy', () => {
    const banned = /\b(fail|failed|only|deprived|neglect|report|reported|score|goal|target|streak|badge|good|bad|better|worse|should|must|welfare|protection|authorities)\b/i;
    const strip = (t: string) => t.replace(SUPPORT_BODY, '');
    const copy = readFileSync('src/ui/tradeoffCopy.ts', 'utf8');
    for (const text of [readFileSync('src/ui/SupportCard.tsx', 'utf8'), copy.slice(copy.indexOf('// Support card'))]) {
      expect(strip(text).match(banned)).toBeNull();
    }
  });
});
