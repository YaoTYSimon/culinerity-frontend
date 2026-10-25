import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RankedSwap } from '../domain/swaps/rank';
import { createServices } from '../services/container';
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
