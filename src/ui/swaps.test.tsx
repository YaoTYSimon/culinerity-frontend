import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type PriceSource, type RankedSwap } from '@culinerity/core';
import { createServices, type Services } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { CravingSearch } from './CravingSearch';
import { SwapResults } from './SwapResults';

function renderSearch(profile = {}) {
  return render(
    <ServicesProvider services={createServices()}>
      <CravingSearch profile={profile} />
    </ServicesProvider>,
  );
}
const search = (text: string) => {
  fireEvent.change(screen.getByLabelText(/what are you craving/i), { target: { value: text } });
  fireEvent.submit(screen.getByRole('search'));
};

describe('CravingSearch', () => {
  it('shows swaps with a Sample data badge for "burger"', async () => {
    renderSearch({ foodBudgetWeekly: 70 });
    search('burger');
    expect((await screen.findAllByText('Sample data')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.queryByText(/\$0(\.00)?\b/)).not.toBeInTheDocument();
  });

  it('shows only the picklist for whitespace input', () => {
    renderSearch();
    search('   ');
    expect(screen.getByRole('button', { name: /burger/i })).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
    expect(screen.queryByText(/no exact match/i)).not.toBeInTheDocument();
  });

  it('searches when a picklist item is chosen', async () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /takeaway burger/i }));
    expect((await screen.findAllByText('Sample data')).length).toBeGreaterThan(0);
  });

  it('shows a no-match message with category suggestions', async () => {
    renderSearch();
    search('zzzz');
    expect(await screen.findByText(/no exact match/i)).toBeInTheDocument();
    expect(screen.getByText(/fast food/i)).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
  });
});

describe('SwapResults', () => {
  const alt = { id: 'a', name: 'Home toastie', category: 'home', keywords: [] };
  const craving = { id: 'c', name: 'Burger', category: 'fast food', keywords: [] };
  const base: RankedSwap = {
    candidate: { craving, alternative: alt, note: 'n' },
    price: null, cost: null, health: 70, withinBudget: null,
  };

  it('says Price unavailable, never $0, when cost is null', () => {
    render(<SwapResults swaps={[base]} cravingHealth={40} />);
    expect(screen.getByText(/price unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
    expect(screen.getByText('Healthier')).toBeInTheDocument();
    expect(screen.queryByText(/within budget/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^70/)).not.toBeInTheDocument();
  });

  it('shows price, store, date, badge and budget marker', () => {
    const s: RankedSwap = {
      ...base, cost: 3.2, withinBudget: true,
      price: { itemId: 'a', store: 'Aldi', pricePerServe: 3.2, unitLabel: '1 toastie', observedAt: '2026-03-12', isSample: true },
    };
    render(<SwapResults swaps={[s]} cravingHealth={null} />);
    expect(screen.getByText(/\$3\.20/)).toBeInTheDocument();
    expect(screen.getByText(/Aldi/)).toBeInTheDocument();
    expect(screen.getByText(/12 Mar 2026/)).toBeInTheDocument();
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.getByText(/within budget/i)).toBeInTheDocument();
  });

  it('marks over budget', () => {
    render(<SwapResults swaps={[{ ...base, cost: 9, withinBudget: false }]} cravingHealth={null} />);
    expect(screen.getByText(/over budget/i)).toBeInTheDocument();
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

function gatedServices(gates: Record<string, Promise<void>>): Services {
  const base = createServices();
  const prices: PriceSource = {
    async getPrices(id) {
      await gates[id];
      return base.prices.getPrices(id);
    },
  };
  return { ...base, prices };
}

const renderWith = (services: Services) =>
  render(
    <ServicesProvider services={services}>
      <CravingSearch profile={{}} />
    </ServicesProvider>,
  );

describe('CravingSearch failure and races', () => {
  it('shows an alert and clears loading when getSwaps rejects', async () => {
    const base = createServices();
    const catalogue = { ...base.catalogue, swapsFor: () => { throw new Error('boom'); },
      findCravings: base.catalogue.findCravings.bind(base.catalogue), popularCravings: base.catalogue.popularCravings.bind(base.catalogue) };
    renderWith({ ...base, catalogue });
    search('burger');
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong finding swaps/i);
    expect(screen.queryByText(/finding swaps…/i)).not.toBeInTheDocument();
  });

  it('shows an alert when findCravings throws', () => {
    const base = createServices();
    const catalogue = { ...base.catalogue, findCravings: () => { throw new Error('boom'); },
      swapsFor: base.catalogue.swapsFor.bind(base.catalogue), popularCravings: base.catalogue.popularCravings.bind(base.catalogue) };
    renderWith({ ...base, catalogue });
    search('burger');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ignores a slower, older search that resolves after a newer one', async () => {
    const slow = deferred();
    renderWith(gatedServices({ burger: slow.promise }));
    search('burger');
    search('pizza');
    expect(await screen.findByText(/swaps? for Delivery pizza/i)).toBeInTheDocument();
    await act(async () => { slow.resolve(); await slow.promise; });
    expect(screen.getByText(/swaps? for Delivery pizza/i)).toBeInTheDocument();
    expect(screen.queryByText(/for Takeaway burger/i)).not.toBeInTheDocument();
  });

  it('does not warn or throw when unmounted mid-search', async () => {
    const gate = deferred();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderWith(gatedServices({ burger: gate.promise }));
    search('burger');
    unmount();
    await act(async () => { gate.resolve(); await gate.promise; });
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

describe('SwapResults date', () => {
  it('says date unknown for an unparseable observedAt', () => {
    const f = { id: 'c', name: 'B', category: 'x', keywords: [] };
    const s: RankedSwap = {
      candidate: { craving: f, alternative: { ...f, id: 'a', name: 'A' }, note: 'n' },
      cost: 2, health: 50, withinBudget: null,
      price: { itemId: 'a', store: 'Aldi', pricePerServe: 2, unitLabel: 'x', observedAt: 'nonsense', isSample: false },
    };
    render(<SwapResults swaps={[s]} />);
    expect(screen.getByText(/date unknown/i)).toBeInTheDocument();
  });
});

describe('SwapResults saving chip', () => {
  const f = { id: 'c', name: 'B', category: 'x', keywords: [] };
  const swap = (cost: number): RankedSwap => ({
    candidate: { craving: f, alternative: { ...f, id: 'a', name: 'A' }, note: 'n' },
    cost, health: 50, withinBudget: null,
    price: { itemId: 'a', store: 'Aldi', pricePerServe: cost, unitLabel: 'x', observedAt: '2026-03-12', isSample: true },
  });

  it('shows the saving against the craving price', () => {
    render(<SwapResults swaps={[swap(3.2)]} cravingCost={9.5} />);
    expect(screen.getByText('Saves $6.30 vs your craving')).toBeInTheDocument();
  });

  it('never shows a zero or negative saving', () => {
    render(<SwapResults swaps={[swap(9.5), swap(12)]} cravingCost={9.5} />);
    expect(screen.queryByText(/saves/i)).not.toBeInTheDocument();
  });

  it('says Sample data once per list, not per card', () => {
    render(<SwapResults swaps={[swap(3), swap(4)]} cravingCost={9.5} />);
    expect(screen.getAllByText('Sample data')).toHaveLength(1);
  });
});

describe('keyboard', () => {
  it('"/" focuses the craving search unless already typing', () => {
    renderSearch();
    const input = screen.getByLabelText(/what are you craving/i);
    fireEvent.keyDown(document.body, { key: '/' });
    expect(input).toHaveFocus();
    (input as HTMLInputElement).blur();
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    fireEvent.keyDown(other, { key: '/' });
    expect(other).toHaveFocus();
    other.remove();
  });

  it('"/" is ignored while composing or when already handled', () => {
    renderSearch();
    const input = screen.getByLabelText(/what are you craving/i);
    fireEvent.keyDown(document.body, { key: '/', isComposing: true });
    expect(input).not.toHaveFocus();
    const stop = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', stop, true);
    fireEvent.keyDown(document.body, { key: '/' });
    window.removeEventListener('keydown', stop, true);
    expect(input).not.toHaveFocus();
  });
});
