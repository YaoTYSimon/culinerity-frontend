import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DOMAINS, FIES_QUESTIONS, SUPPORT_BELOW, InMemoryProfileStore, type ProfileStore } from '@culinerity/core';
import { createServices } from './services/container';
import { ServicesProvider } from './services/ServicesContext';
import { LocalProfileStore } from './storage/localProfileStore';

const SUPPORT = { name: 'Free food near you.' };
const SEEN = { welcomeSeen: true };
const WELCOME_H1 = 'How much is food on your mind?';

function openMenu(item: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.click(screen.getByRole('button', { name: item }));
}

function renderApp(store: ProfileStore = new InMemoryProfileStore(), now?: () => string) {
  const services = { ...createServices(), profiles: store };
  return render(<ServicesProvider services={services}><App now={now} /></ServicesProvider>);
}

function takeWorstQuestionnaire() {
  const total = FIES_QUESTIONS.length + Object.values(DOMAINS).flat().length;
  for (let i = 0; i < total; i++) {
    fireEvent.click(screen.getByRole('button', { name: i < FIES_QUESTIONS.length ? 'Yes' : 'Almost always' }));
  }
}

afterEach(() => localStorage.clear());

describe('App', () => {
  it('first launch shows the welcome page, not a gate: skipping reaches the swap search and remembers it', () => {
    const store = new InMemoryProfileStore();
    renderApp(store);
    expect(screen.getByRole('heading', { level: 1, name: WELCOME_H1 })).toBeInTheDocument();
    expect(screen.getByText(/100 is secure, 0 is critical/)).toBeInTheDocument();
    expect(screen.queryByRole('region', SUPPORT)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to cheaper swaps' }));
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(store.saved[store.saved.length - 1]).toMatchObject({ welcomeSeen: true });
  });

  it('"Find my number" opens the check-in and remembers the welcome', () => {
    const store = new InMemoryProfileStore();
    renderApp(store);
    fireEvent.click(screen.getByRole('button', { name: 'Find my number' }));
    expect(screen.getByRole('heading', { level: 1, name: FIES_QUESTIONS[0] })).toBeInTheDocument();
    expect(store.saved[store.saved.length - 1]).toMatchObject({ welcomeSeen: true });
  });

  it('does not save a score before the last check-in answer', () => {
    const store = new InMemoryProfileStore(SEEN);
    renderApp(store);
    openMenu('Check-in');
    const total = FIES_QUESTIONS.length + Object.values(DOMAINS).flat().length;
    for (let i = 0; i < total - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: i < FIES_QUESTIONS.length ? 'Yes' : 'Almost always' }));
    }
    expect(store.saved.every((p) => p.score === undefined || p.score === null)).toBe(true);
  });

  it('second launch skips the welcome and lands on the swap search', () => {
    renderApp(new InMemoryProfileStore(SEEN));
    expect(screen.queryByRole('heading', { name: WELCOME_H1 })).not.toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('the swap search is always one tap from first launch and the menu reopens Welcome without resetting it', () => {
    const store = new InMemoryProfileStore(SEEN);
    renderApp(store);
    openMenu('Welcome');
    expect(screen.getByRole('heading', { level: 1, name: WELCOME_H1 })).toBeInTheDocument();
    openMenu('Swaps');
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(store.saved.every((p) => p.welcomeSeen !== false)).toBe(true);
  });

  it('opening Welcome from the menu as a first-time visitor does not mark it seen', () => {
    const store = new InMemoryProfileStore();
    renderApp(store);
    openMenu('Swaps');
    openMenu('Welcome');
    expect(screen.getByRole('heading', { level: 1, name: WELCOME_H1 })).toBeInTheDocument();
    expect(store.saved.some((p) => p.welcomeSeen === true)).toBe(false);
  });

  it('menu items navigate to each view', () => {
    renderApp(new InMemoryProfileStore(SEEN));
    openMenu('Check-in');
    expect(screen.getByRole('heading', { level: 1, name: FIES_QUESTIONS[0] })).toBeInTheDocument();
    openMenu('My week');
    expect(screen.getByRole('heading', { level: 1, name: /nothing in your week yet/i })).toBeInTheDocument();
    openMenu('Food support');
    expect(screen.getByRole('heading', { level: 1, name: /free food/i })).toBeInTheDocument();
    openMenu('Home');
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('Home is the number view once a score exists', () => {
    renderApp(new InMemoryProfileStore({ ...SEEN, score: 55 }));
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /score 55 out of 100, Strained; 100 is secure, 0 is critical/i })).toBeInTheDocument();
    openMenu('Swaps');
    expect(screen.getByRole('search')).toBeInTheDocument();
    openMenu('Home');
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('worst answers save score 0 and offer the way to free food support', async () => {
    const store = new InMemoryProfileStore(SEEN);
    renderApp(store);
    openMenu('Check-in');
    takeWorstQuestionnaire();
    const last = store.saved[store.saved.length - 1];
    expect(last.score).toBe(0);
    expect(typeof last.scoreTakenAt).toBe('string');
    expect(last.scoreHistory).toHaveLength(1);
    expect(screen.getByRole('img', { name: /score 0 out of 100, Critical; 100 is secure, 0 is critical/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /free food near you/i }));
    expect(await screen.findAllByText('Sample data')).not.toHaveLength(0);
    expect(screen.getByRole('region', SUPPORT)).toBeInTheDocument();
    expect(screen.getAllByText(/not medical advice/i)).toHaveLength(1);
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/not medical advice/i);
  });

  it(`shows support on the number view only below ${SUPPORT_BELOW}, but keeps it in the menu`, async () => {
    const low = renderApp(new InMemoryProfileStore({ ...SEEN, score: SUPPORT_BELOW - 1 }));
    expect(screen.getByRole('button', { name: /free food near you/i })).toBeInTheDocument();
    low.unmount();
    renderApp(new InMemoryProfileStore({ ...SEEN, score: 80 }));
    expect(screen.getByRole('img', { name: /score 80 out of 100, Secure/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /free food near you/i })).not.toBeInTheDocument();
    openMenu('Food support');
    expect(await screen.findAllByText('Sample data')).not.toHaveLength(0);
    expect(screen.getByRole('region', SUPPORT)).toBeInTheDocument();
    expect(screen.getAllByText(/not medical advice/i)).toHaveLength(1);
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/not medical advice/i);
  });

  it('persists finance changes and restores score and budget on reload', () => {
    const store = new InMemoryProfileStore({ ...SEEN, score: 55 });
    const first = renderApp(store);
    fireEvent.change(screen.getByLabelText(/food budget/i), { target: { value: '90' } });
    expect(store.saved[store.saved.length - 1]).toMatchObject({ score: 55, foodBudgetWeekly: 90 });
    first.unmount();
    renderApp(store);
    expect(screen.getByLabelText(/food budget/i)).toHaveValue('90');
    expect(screen.getByRole('img', { name: /score 55 out of 100, Strained/i })).toBeInTheDocument();
  });

  it('corrupt stored JSON still renders the first-launch welcome, with the swap search one tap away', () => {
    localStorage.setItem('culinerity.profile.v1', '{not json');
    renderApp(new LocalProfileStore());
    expect(screen.getByRole('heading', { level: 1, name: WELCOME_H1 })).toBeInTheDocument();
    expect(within(document.body).queryByText(/score 5\d/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to cheaper swaps' }));
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('keeps the footer notes and a photo credits disclosure', () => {
    renderApp();
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(/not medical advice/i);
    expect(footer).toHaveTextContent(/sample data/i);
    expect(footer).toHaveTextContent('Swap ideas are drawn; craving photos are credited below.');
    expect(within(footer).getByText('Photo credits (13)')).toBeInTheDocument();
    const details = footer.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
  });

  it('gives every photo credit link an accessible name', () => {
    renderApp();
    const links = within(screen.getByRole('contentinfo')).getAllByRole('link', { hidden: true });
    expect(links).toHaveLength(26);
    links.forEach((a) => expect(a.getAttribute('aria-label')).toMatch(/\S/));
  });
});

describe('add to my week', () => {
  it('persists the added swap once, with the injected time', async () => {
    const store = new InMemoryProfileStore(SEEN);
    renderApp(store, () => '2026-10-26T01:00:00.000Z');
    fireEvent.click(screen.getByRole('button', { name: /takeaway burger/i }));
    const [btn] = await screen.findAllByRole('button', { name: /^Add .* to my week$/ });
    fireEvent.click(btn);
    const last = store.saved[store.saved.length - 1];
    expect(last.weekSwaps).toHaveLength(1);
    expect(last.weekSwaps![0]).toMatchObject({ at: '2026-10-26T01:00:00.000Z' });
    expect(last.weekSwaps![0].saving).toBeGreaterThan(0);
    expect(btn.getAttribute('aria-label')).toContain(last.weekSwaps![0].name);
  });
});

describe('my week', () => {
  const NOW = '2026-10-26T12:00:00.000Z';
  const full = {
    ...SEEN,
    score: 12,
    suburb: 'Footscray',
    foodBudgetWeekly: 80,
    weekSwaps: [
      { itemId: 'a', name: 'Falafel wrap', saving: 4.9, at: NOW },
      { itemId: 'a', name: 'Falafel wrap', saving: 4.9, at: NOW },
    ],
  };

  it('removal and clearing persist through the profile store', () => {
    const store = new InMemoryProfileStore(full);
    renderApp(store, () => NOW);
    openMenu('My week');
    expect(screen.getByText('Falafel wrap ×2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Falafel wrap' }));
    expect(store.saved[store.saved.length - 1].weekSwaps).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear week' }));
    expect(store.saved[store.saved.length - 1].weekSwaps).toEqual([]);
    expect(screen.getByRole('heading', { level: 1, name: /nothing in your week yet/i })).toBeInTheDocument();
  });

  it('the shared text never carries score, finances or suburb', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderApp(new InMemoryProfileStore(full), () => NOW);
    openMenu('My week');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share' })));
    const text: string = share.mock.calls[0][0].text;
    expect(text).toContain('Falafel wrap ×2');
    expect(text).toBe('Falafel wrap ×2: $9.80\nSaved this week: $9.80\nMade with Culinerity');
    expect(text).not.toMatch(/Footscray|score/i);
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
});
