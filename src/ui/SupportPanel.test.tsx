import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SupportPlace } from '@culinerity/core';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { SupportPanel } from './SupportPanel';

const place = (id: string, name: string): SupportPlace => ({
  id, name, kind: 'pantry', suburb: 'Carlton', notes: 'Open weekdays', isSample: true,
});

function withSupport(findSupport: (s?: string) => Promise<SupportPlace[]>, suburb?: string) {
  const services = { ...createServices(), support: { findSupport } };
  const ui = (s?: string) => (
    <ServicesProvider services={services}><SupportPanel suburb={s} /></ServicesProvider>
  );
  return { ...render(ui(suburb)), ui };
}

describe('SupportPanel', () => {
  it('drops the old list while a new suburb loads, and after a failure', async () => {
    let reject!: (e: Error) => void;
    const findSupport = (s?: string) =>
      s === 'Carlton' ? Promise.resolve([place('a', 'Carlton Pantry')])
        : new Promise<SupportPlace[]>((_, r) => { reject = r; });
    const { rerender, ui } = withSupport(findSupport, 'Carlton');
    expect(await screen.findByText('Carlton Pantry')).toBeInTheDocument();

    rerender(ui('Elsewhere'));
    expect(screen.queryByText('Carlton Pantry')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading places');

    reject(new Error('boom'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Carlton Pantry')).not.toBeInTheDocument();
  });

  it('has one h1, a decorative photo, and the kind sentence without claims about proof', async () => {
    const { container } = withSupport(async () => [place('a', 'Carlton Pantry')]);
    await screen.findByText('Carlton Pantry');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Free food near you.' })).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.getByText('Call ahead to check times.')).toBeInTheDocument();
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/proof|prove/i);
  });

  it('gives every place a plain row with suburb, notes and an external Directions link', async () => {
    const places = [place('a', 'Carlton Pantry'), { ...place('b', 'Fridge & Co'), suburb: 'St Kilda' }];
    withSupport(async () => places);
    await screen.findByText('Carlton Pantry');
    const link = screen.getByRole('link', { name: 'Directions to Carlton Pantry' });
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Carlton Pantry Carlton'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Directions to Fridge & Co' })).toHaveAttribute(
      'href', 'https://www.google.com/maps/search/?api=1&query=Fridge%20%26%20Co%20St%20Kilda');
    expect(screen.getAllByText('Open weekdays')).toHaveLength(2);
    expect(screen.getByText('St Kilda')).toBeInTheDocument();
  });

  it('shows a friendly failure with Try again that retries', async () => {
    let calls = 0;
    withSupport(async () => {
      if (++calls === 1) throw new Error('boom');
      return [place('a', 'Carlton Pantry')];
    });
    expect(await screen.findByRole('alert')).toHaveTextContent("We can't load the list just now. Please try again.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Carlton Pantry')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
