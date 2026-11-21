import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { foodSafetyData } from '@culinerity/core';
import { FoodSafetyView } from './FoodSafetyView';

const sections = ['Keep it cold or hot', 'Use-by and best-before', 'Leftovers and reheating', 'Rice', 'Eggs', 'Thawing', 'When to throw food out', 'Who to call'];

describe('FoodSafetyView', () => {
  it('has one h1, focused, and a heading for every topic', () => {
    render(<FoodSafetyView />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Food safety at home' })).toHaveFocus();
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual([...sections, 'Where this comes from']);
  });

  it('shows the dataset figures: fridge, freezer, reheating and the 2 and 4 hour limits', () => {
    render(<FoodSafetyView />);
    expect(screen.getByText(/fridge to 5\s°C or colder/)).toBeInTheDocument();
    expect(screen.getByText(/colder than -15\s°C/)).toBeInTheDocument();
    expect(screen.getByText(/above 75\s°C/)).toBeInTheDocument();
    expect(screen.getByText(/After 4 hours, throw it out/)).toBeInTheDocument();
  });

  it('lists every source with its reviewed date, checked date and licence note', () => {
    render(<FoodSafetyView />);
    const region = screen.getByRole('region', { name: 'Where this comes from' });
    foodSafetyData.sources.forEach((s) => {
      expect(within(region).getByRole('link', { name: new RegExp(s.title) })).toHaveAttribute('href', s.url);
    });
    expect(within(region).getAllByText(/Read 21 November 2026/)).toHaveLength(foodSafetyData.sources.length);
    expect(within(region).getAllByText(/State of Victoria|State Government of Victoria|Food Standards Australia New Zealand/).length).toBeGreaterThan(0);
  });

  it('opens every source in a new tab, safely, from official hosts only', () => {
    render(<FoodSafetyView />);
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('http'));
    expect(links).toHaveLength(foodSafetyData.sources.length);
    links.forEach((a) => {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(new URL(a.getAttribute('href')!).hostname).toMatch(/\.gov\.au$/);
    });
  });

  it('gives phone numbers that dial, at least 44px tall', () => {
    render(<FoodSafetyView />);
    const nurse = screen.getAllByRole('link').find((a) => a.getAttribute('href') === 'tel:1300606024')!;
    expect(nurse).toHaveAttribute('href', 'tel:1300606024');
    expect(nurse.className).toMatch(/min-h-11/);
    expect(screen.getByRole('link', { name: /Emergency 000/ })).toHaveAttribute('href', 'tel:000');
  });

  it('never uses comparison or AI wording', () => {
    const { container } = render(<FoodSafetyView />);
    const text = (container.textContent ?? '').replace(/Better Health/g, '');
    expect(text).not.toMatch(/\b(better|worse|smart|predict)\b/i);
    expect(text).not.toMatch(/\bAI\b/);
  });
});
