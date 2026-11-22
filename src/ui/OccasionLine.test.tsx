import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calendar, InMemoryProfileStore, occasionsOn, type OccasionId, type Profile } from '@culinerity/core';
import App from '../App';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { OccasionLine } from './OccasionLine';

const at = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const first = (id: OccasionId, day: string) => occasionsOn(calendar(), [id], [], at(day))[0];

function line(id: OccasionId, day: string) {
  const fns = { onSeeSwaps: vi.fn(), onBudget: vi.fn(), onDismiss: vi.fn() };
  render(<OccasionLine active={first(id, day)} {...fns} />);
  return fns;
}

describe('OccasionLine copy', () => {
  it('Ramadan is "about" with the sighting caveat', () => {
    line('ramadan', '2027-02-03');
    expect(screen.getByText(/Ramadan starts about Mon 8 Feb\./)).toBeInTheDocument();
    expect(screen.getByText(/Dates depend on the moon sighting\./)).toBeInTheDocument();
  });
  it('Easter has no "about" and no caveat', () => {
    line('easter', '2027-03-22');
    expect(screen.getByText('Easter starts Fri 26 Mar.')).toBeInTheDocument();
    expect(screen.queryByText(/about|moon/)).not.toBeInTheDocument();
  });
  it('says "is on now" once it has started', () => {
    line('lent', '2027-02-20');
    expect(screen.getByText('Lent is on now.')).toBeInTheDocument();
  });
  it('adds the evening before only for Passover and Rosh Hashanah', () => {
    line('passover', '2027-04-18');
    expect(screen.getByText('Passover starts Thu 22 Apr (from the evening before).')).toBeInTheDocument();
    cleanup();
    line('hanukkah', '2026-12-01');
    expect(screen.queryByText(/evening/)).not.toBeInTheDocument();
  });
  it('renders nothing without an active occasion', () => {
    const { container } = render(<OccasionLine active={undefined} onSeeSwaps={vi.fn()} onBudget={vi.fn()} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OccasionLine actions', () => {
  it('has a budget link for Eid and Lunar New Year but not Ramadan or Lent', () => {
    line('eid-al-fitr', '2027-03-05');
    expect(screen.getByText('Gatherings can cost more. Here is your budget.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Look at your budget' })).toBeInTheDocument();
    cleanup();
    line('lunar-new-year', '2027-02-01');
    expect(screen.getByRole('button', { name: 'Look at your budget' })).toBeInTheDocument();
    cleanup();
    line('ramadan', '2027-02-03');
    expect(screen.queryByRole('button', { name: 'Look at your budget' })).not.toBeInTheDocument();
    cleanup();
    line('lent', '2027-02-08');
    expect(screen.queryByRole('button', { name: 'Look at your budget' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Gatherings/)).not.toBeInTheDocument();
  });
  it('calls back for each button with the key', () => {
    const f = line('eid-al-fitr', '2027-03-05');
    fireEvent.click(screen.getByRole('button', { name: 'See swaps that fit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Look at your budget' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(f.onSeeSwaps).toHaveBeenCalledOnce();
    expect(f.onBudget).toHaveBeenCalledOnce();
    expect(f.onDismiss).toHaveBeenCalledWith('eid-al-fitr-2027');
  });
});

const FOOD = (occasions: OccasionId[], dismissed: string[] = []) => ({ traditions: [], rules: [], allergies: [], occasions, dismissed });
function renderApp(profile: Profile, day: string, store = new InMemoryProfileStore(profile)) {
  const services = { ...createServices(), profiles: store };
  const utils = render(<ServicesProvider services={services}><App now={() => `${day}T12:00:00`} /></ServicesProvider>);
  return { store, ...utils };
}
const openMenu = (item: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Menu' })).getByRole('button', { name: item }));
};
const RAMADAN_LINE = /Ramadan starts about Mon 8 Feb/;

describe('OccasionLine in the app', () => {
  afterEach(() => localStorage.clear());

  it('shows on Swaps and nowhere else', () => {
    const p: Profile = { welcomeSeen: true, score: 40, foodProfile: FOOD(['ramadan']) };
    renderApp(p, '2027-02-03');
    expect(screen.queryByText(RAMADAN_LINE)).not.toBeInTheDocument(); // number screen
    for (const item of ['Check-in', 'Budget', 'My week']) {
      openMenu(item);
      expect(screen.queryByText(RAMADAN_LINE)).not.toBeInTheDocument();
    }
    openMenu('Swaps');
    expect(screen.getByText(RAMADAN_LINE)).toBeInTheDocument();
  });

  it('shows nothing when no occasion is chosen', () => {
    renderApp({ welcomeSeen: true, foodProfile: FOOD([]) }, '2027-02-03');
    expect(screen.queryByText(/starts/)).not.toBeInTheDocument();
    cleanup();
    renderApp({ welcomeSeen: true }, '2027-02-03');
    expect(screen.queryByText(/starts/)).not.toBeInTheDocument();
  });

  it('shows only one line when two occasions are active', () => {
    renderApp({ welcomeSeen: true, foodProfile: FOOD(['ramadan', 'lunar-new-year']) }, '2027-02-03');
    expect(screen.getAllByRole('button', { name: 'Not now' })).toHaveLength(1);
    expect(screen.getByText(/Lunar New Year starts Sat 6 Feb/)).toBeInTheDocument();
    expect(screen.queryByText(RAMADAN_LINE)).not.toBeInTheDocument();
  });

  it('"Not now" hides it, stores ramadan-2027, and it stays hidden after a reload of the profile', () => {
    const store = new InMemoryProfileStore({ welcomeSeen: true, foodProfile: FOOD(['ramadan']) });
    const { unmount } = renderApp({}, '2027-02-03', store);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText(RAMADAN_LINE)).not.toBeInTheDocument();
    expect(store.load().foodProfile?.dismissed).toEqual(['ramadan-2027']);
    unmount();
    renderApp({}, '2027-02-04', store);
    expect(screen.queryByText(RAMADAN_LINE)).not.toBeInTheDocument();
  });

  it('prunes dismissed keys older than a year on the next save', () => {
    const store = new InMemoryProfileStore({ welcomeSeen: true, foodProfile: FOOD(['ramadan'], ['lent-2024', 'easter-2026']) });
    renderApp({}, '2027-02-03', store);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(store.load().foodProfile?.dismissed).toEqual(['easter-2026', 'ramadan-2027']);
  });

  it('"Look at your budget" opens the budget; "See swaps that fit" focuses the search', async () => {
    renderApp({ welcomeSeen: true, foodProfile: FOOD(['eid-al-fitr']) }, '2027-03-05');
    fireEvent.click(screen.getByRole('button', { name: 'See swaps that fit' }));
    expect(screen.getByLabelText(/what are you craving/i)).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Look at your budget' }));
    expect(await screen.findByRole('heading', { level: 1, name: /This week's food/ })).toBeInTheDocument();
  });

  it('never changes which swaps are shown', async () => {
    const swapNames = async (occasions: OccasionId[]) => {
      renderApp({ welcomeSeen: true, foodProfile: FOOD(occasions) }, '2027-02-03');
      fireEvent.change(screen.getByLabelText(/what are you craving/i), { target: { value: 'burger' } });
      fireEvent.submit(screen.getByRole('search'));
      await screen.findAllByText('Sample data');
      const names = screen.getAllByRole('listitem').map((li) => li.textContent);
      cleanup();
      return names;
    };
    const without = await swapNames([]);
    expect(without.length).toBeGreaterThan(0);
    expect(await swapNames(['ramadan'])).toEqual(without);
  });
});

describe('quiet by construction', () => {
  it('uses no Notification, serviceWorker, or push in the app source', () => {
    const dir = resolve(__dirname, '..');
    const files = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(resolve(d, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [resolve(d, e.name)] : []));
    for (const f of files(dir)) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(src, f).not.toMatch(/\bNotification\b|serviceWorker|PushManager|requestPermission/);
    }
  });
});
