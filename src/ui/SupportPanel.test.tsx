import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SupportPlace } from '../domain/types';
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
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

    reject(new Error('boom'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Carlton Pantry')).not.toBeInTheDocument();
  });
});
