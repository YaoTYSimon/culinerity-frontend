import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryProfileStore, type Profile } from '@culinerity/core';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { NumberScreen } from './NumberScreen';

const at = (i: number) => new Date(2026, 0, 1 + i).toISOString();
const hist = (...scores: number[]) => scores.map((score, i) => ({ score, at: at(i) }));

function setup(profile: Profile, handlers: Partial<Record<'onSeeSwaps' | 'onCheckIn' | 'onOpenSupport' | 'onChange', () => void>> = {}) {
  const props = { onSeeSwaps: vi.fn(), onCheckIn: vi.fn(), onOpenSupport: vi.fn(), onChange: vi.fn(), ...handlers };
  render(<NumberScreen profile={profile} {...props} />);
  return props;
}

describe('NumberScreen', () => {
  it('shows the band headline, plate and scale line', () => {
    setup({ score: 42 });
    expect(screen.getByRole('heading', { level: 1, name: 'Food is on your mind a lot.' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Food security score 42 out of 100, Strained; 100 is secure, 0 is critical' })).toBeInTheDocument();
    expect(screen.getByText(/Strained/)).toBeInTheDocument();
    expect(screen.getByText(/100 is secure, 0 is critical\./)).toBeInTheDocument();
  });

  it('shows no trend with one history entry', () => {
    setup({ score: 42, scoreHistory: hist(42) });
    expect(screen.queryByText(/since your first check-in/)).not.toBeInTheDocument();
  });

  it('shows Up N with every score', () => {
    setup({ score: 42, scoreHistory: hist(33, 35, 36, 40, 42) });
    expect(screen.getByText('Up 9 since your first check-in: 33, 35, 36, 40, 42')).toBeInTheDocument();
  });

  it('shows Down N for a decreasing history', () => {
    setup({ score: 80, scoreHistory: hist(90, 85, 80) });
    expect(screen.getByText('Down 10 since your first check-in: 90, 85, 80')).toBeInTheDocument();
  });

  it('says Steady, never Up 0, when nothing changed', () => {
    setup({ score: 50, scoreHistory: hist(50, 48, 50) });
    expect(screen.getByText('Steady since your first check-in: 50, 48, 50')).toBeInTheDocument();
    expect(screen.queryByText(/Up 0/)).not.toBeInTheDocument();
  });

  it('shows the support link only below 40', () => {
    const { onOpenSupport } = setup({ score: 39 });
    fireEvent.click(screen.getByRole('button', { name: /free food near you/i }));
    expect(onOpenSupport).toHaveBeenCalled();
  });

  it.each([40, 80])('hides the support link at %i', (score) => {
    setup({ score });
    expect(screen.queryByRole('button', { name: /free food near you/i })).not.toBeInTheDocument();
  });

  it.each([
    [39, 'Cheapest swaps first', 'See cheaper swaps'],
    [40, 'A balance of cheap and healthy', 'See cheaper swaps'],
    [59, 'A balance of cheap and healthy', 'See cheaper swaps'],
    [60, 'Healthiest swaps first', 'See healthier swaps'],
  ])('nudge at %i is %s with button %s', (score, text, button) => {
    const { onSeeSwaps } = setup({ score });
    expect(screen.getByText(text)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(onSeeSwaps).toHaveBeenCalled();
  });

  it('Check in again opens the check-in', () => {
    const { onCheckIn } = setup({ score: 55 });
    fireEvent.click(screen.getByRole('button', { name: 'Check in again' }));
    expect(onCheckIn).toHaveBeenCalled();
  });

  it('budget disclosure opens and saves through the profiles store', () => {
    const store = new InMemoryProfileStore({ score: 55 });
    function Host() {
      const [p, setP] = useState<Profile>({ score: 55 });
      return <NumberScreen profile={p} onSeeSwaps={vi.fn()} onCheckIn={vi.fn()} onOpenSupport={vi.fn()} onChange={(n) => { setP(n); store.save(n); }} />;
    }
    render(<ServicesProvider services={{ ...createServices(), profiles: store }}><Host /></ServicesProvider>);
    fireEvent.click(screen.getByText('Your budget'));
    fireEvent.change(screen.getByLabelText(/weekly food budget/i), { target: { value: '70' } });
    expect(store.saved[store.saved.length - 1]).toMatchObject({ score: 55, foodBudgetWeekly: 70 });
  });
});
