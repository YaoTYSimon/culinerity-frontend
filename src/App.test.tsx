import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { PHOTO_CREDITS } from './assets/photos';
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

  it('Nearby opens from the menu with its h1 focused', () => {
    renderApp(new InMemoryProfileStore(SEEN));
    openMenu('Nearby');
    const h1 = screen.getByRole('heading', { level: 1, name: 'Close to you.' });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveFocus();
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
    expect(footer).toHaveTextContent('Swap ideas are drawn; photos are credited below.');
    expect(within(footer).getByText(`Photo credits (${PHOTO_CREDITS.length})`)).toBeInTheDocument();
    const details = footer.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
  });

  it('opens the data and policy page from the footer link and from the Menu', () => {
    renderApp();
    fireEvent.click(within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Data and policy' }));
    expect(screen.getByRole('heading', { level: 1, name: 'What we know about food insecurity.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Swaps' }));
    expect(screen.queryByRole('heading', { name: 'What we know about food insecurity.' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Menu' })).getByRole('button', { name: 'Data and policy' }));
    expect(screen.getByRole('heading', { level: 1, name: 'What we know about food insecurity.' })).toBeInTheDocument();
  });

  it('gives every photo, nutrition and Hebcal credit link an accessible name', () => {
    renderApp();
    const links = within(screen.getByRole('contentinfo')).getAllByRole('link', { hidden: true });
    expect(links).toHaveLength(PHOTO_CREDITS.length * 2 + 4);
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
    expect(text).toBe('Falafel wrap ×2: $9.80\nSaved in the last 7 days: $9.80\nMade with Culinerity');
    expect(text).not.toMatch(/Footscray|score/i);
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('moves focus to the new view heading when the view changes, not on first render', () => {
    renderApp(new InMemoryProfileStore());
    expect(document.body).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Find my number' }));
    expect(screen.getByRole('heading', { level: 1, name: FIES_QUESTIONS[0] })).toHaveFocus();
  });

  it('focuses the heading after navigating via the Menu', () => {
    renderApp(new InMemoryProfileStore(SEEN));
    openMenu('Food support');
    expect(screen.getByRole('heading', { level: 1, name: SUPPORT.name })).toHaveFocus();
    openMenu('Swaps');
    expect(screen.getByRole('heading', { level: 1, name: /Cheaper, healthier swaps/ })).toHaveFocus();
  });

  it('"Skip to cheaper swaps" focuses the swaps heading', () => {
    renderApp(new InMemoryProfileStore());
    fireEvent.click(screen.getByRole('button', { name: 'Skip to cheaper swaps' }));
    expect(screen.getByRole('heading', { level: 1, name: /Cheaper, healthier swaps/ })).toHaveFocus();
  });

  it('does not steal focus on re-renders within a view', () => {
    renderApp(new InMemoryProfileStore(SEEN));
    const search = screen.getByRole('searchbox');
    search.focus();
    fireEvent.change(search, { target: { value: 'pi' } });
    expect(search).toHaveFocus();
  });

  it('the Budget view opens from the menu, takes focus, and saves a spend through the profile store', () => {
    const store = new InMemoryProfileStore({ ...SEEN, foodBudgetWeekly: 120 });
    renderApp(store, () => '2026-10-28T12:00:00');
    openMenu('Budget');
    expect(screen.getByRole('heading', { level: 1, name: "This week's food." })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('img', { name: '$95 left' })).toBeInTheDocument();
    expect(store.saved[store.saved.length - 1].spendEntries).toHaveLength(1);
  });

  it('the Budget view follows the swaps total to My week', () => {
    renderApp(new InMemoryProfileStore({ ...SEEN, foodBudgetWeekly: 120, weekSwaps: [{ itemId: 'x', name: 'Soup', saving: 4, at: '2026-10-27T09:00:00' }] }), () => '2026-10-28T12:00:00');
    openMenu('Budget');
    fireEvent.click(screen.getByRole('button', { name: 'My week' }));
    expect(screen.getByRole('heading', { level: 1, name: /saved/i })).toBeInTheDocument();
  });

  describe('My food', () => {
    const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const stored = () => JSON.parse(localStorage.getItem('culinerity.profile.v1') ?? '{}');

    it('Welcome "Tell us about your food" marks the welcome seen, opens the wizard, and Skip lands on swaps with nothing stored', () => {
      renderApp(new LocalProfileStore());
      fireEvent.click(screen.getByRole('button', { name: 'Tell us about your food (optional)' }));
      expect(screen.getByRole('heading', { level: 1, name: 'Which food traditions fit you?' })).toBeInTheDocument();
      expect(stored().welcomeSeen).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(stored()).not.toHaveProperty('foodProfile');
    });

    it('saves Greek, Halal and Peanuts into the profile and changes nothing else', () => {
      localStorage.setItem('culinerity.profile.v1', JSON.stringify({ ...SEEN, score: 40 }));
      renderApp(new LocalProfileStore());
      openMenu('My food');
      fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
      next();
      fireEvent.click(screen.getByRole('button', { name: /^Halal/ }));
      next();
      const field = screen.getByLabelText(/avoid/i);
      fireEvent.change(field, { target: { value: 'Peanuts' } });
      fireEvent.keyDown(field, { key: 'Enter' });
      next();
      next();
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(stored()).toMatchObject({ welcomeSeen: true, score: 40, foodProfile: { traditions: ['greek'], rules: ['halal'], allergies: ['Peanuts'] } });
      expect(Object.keys(stored()).sort()).toEqual(['foodProfile', 'score', 'welcomeSeen']);
    });

    it('clears food settings from the stored JSON, Undo restores, and Clear my meals does the same for meals', () => {
      const food = { traditions: ['greek'], rules: [], allergies: [], occasions: [], dismissed: [] };
      const meals = [{ id: 'm1', at: '2026-10-27T01:00:00.000Z', tradition: 'greek' }];
      localStorage.setItem('culinerity.profile.v1', JSON.stringify({ ...SEEN, foodProfile: food, culturalMeals: meals }));
      renderApp(new LocalProfileStore(), () => '2026-10-28T12:00:00');
      openMenu('My food');
      fireEvent.click(screen.getByRole('button', { name: 'Clear my food settings' }));
      expect(stored()).not.toHaveProperty('foodProfile');
      fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
      expect(stored().foodProfile.traditions).toEqual(['greek']);
      fireEvent.click(screen.getByRole('button', { name: 'Clear my meals' }));
      expect(stored()).not.toHaveProperty('culturalMeals');
      fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
      expect(stored().culturalMeals).toHaveLength(1);
    });

    describe('What if', () => {
      it('Menu opens What if, shows the notice, saves Your numbers to the profile and nothing else', () => {
        const KEY = 'culinerity.profile.v1';
        localStorage.setItem(KEY, JSON.stringify({ ...SEEN, score: 40 }));
        renderApp(new LocalProfileStore(), () => '2026-10-28T12:00:00');
        openMenu('What if');
        expect(screen.getByRole('heading', { level: 1, name: 'What if' })).toBeInTheDocument();
        expect(screen.getByText(/^General information, not advice\./)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Rent or housing'), { target: { value: '450' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
        expect(stored().housingWeekly).toBe(450);
        expect(Object.keys(localStorage)).toEqual([KEY]);
      });

      it('its help buttons go to Swaps, Budget, Food support and Nearby', () => {
        localStorage.setItem('culinerity.profile.v1', JSON.stringify({ ...SEEN, incomeWeekly: 900, housingWeekly: 450, otherFixedWeekly: 150, foodBudgetWeekly: 120 }));
        renderApp(new LocalProfileStore(), () => '2026-10-28T12:00:00');
        const run = () => {
          openMenu('What if');
          fireEvent.click(screen.getByRole('radio', { name: 'Rent changes' }));
          fireEvent.change(screen.getByLabelText('Rent change (%)'), { target: { value: '10' } });
          fireEvent.click(screen.getByRole('button', { name: 'Show what changes' }));
        };
        run();
        fireEvent.click(screen.getByRole('button', { name: 'Budget' }));
        expect(screen.getByRole('heading', { level: 1, name: "This week's food." })).toBeInTheDocument();
        run();
        fireEvent.click(screen.getByRole('button', { name: 'Food support' }));
        expect(screen.getByRole('region', SUPPORT)).toBeInTheDocument();
      });

      it('the Budget view links to What if', () => {
        localStorage.setItem('culinerity.profile.v1', JSON.stringify({ ...SEEN, foodBudgetWeekly: 120 }));
        renderApp(new LocalProfileStore(), () => '2026-10-28T12:00:00');
        openMenu('Budget');
        fireEvent.click(screen.getByRole('button', { name: 'Try a what if' }));
        expect(screen.getByRole('heading', { level: 1, name: 'What if' })).toBeInTheDocument();
      });
    });

    describe('Trade-offs', () => {
      it('Menu opens Trade-offs and saving writes only the profile key', () => {
        const KEY = 'culinerity.profile.v1';
        localStorage.setItem(KEY, JSON.stringify({ ...SEEN, score: 40 }));
        renderApp(new LocalProfileStore(), () => '2026-10-28T12:00:00');
        const before = stored();
        openMenu('Trade-offs');
        expect(screen.getByRole('heading', { level: 1, name: 'What we went without' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Add a trade-off' }));
        fireEvent.click(screen.getByRole('button', { name: 'Went without something nice for myself' }));
        const after = stored();
        expect(Object.keys(after).sort()).toEqual([...Object.keys(before), 'tradeoffs'].sort());
        expect(after.tradeoffs).toHaveLength(1);
        expect(after.tradeoffs[0]).toMatchObject({ category: 'self-treat' });
        expect(Object.keys(localStorage)).toEqual([KEY]);
        fireEvent.click(screen.getByRole('button', { name: 'Clear all my trade-offs' }));
        expect(stored()).not.toHaveProperty('tradeoffs');
      });

      it('drops trade-offs older than eight weeks when the profile loads', () => {
        const old = { id: 'old', at: '2026-07-01T10:00:00.000Z', category: 'self-treat' };
        const fresh = { id: 'new', at: '2026-10-27T01:00:00.000Z', category: 'self-treat' };
        localStorage.setItem('culinerity.profile.v1', JSON.stringify({ ...SEEN, tradeoffs: [old, fresh] }));
        renderApp(new LocalProfileStore(), () => '2026-10-28T12:00:00');
        expect(stored().tradeoffs.map((t: { id: string }) => t.id)).toEqual(['new']);
      });
    });

    describe('Meals that felt like home', () => {
      const PROFILE_KEY = 'culinerity.profile.v1';
      const TODAY = () => '2026-10-28T12:00:00';

      it('adding a meal changes only the culturalMeals key of the stored JSON', () => {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...SEEN, score: 40, foodProfile: { traditions: ['greek'], rules: [], allergies: [], occasions: [], dismissed: [] } }));
        renderApp(new LocalProfileStore(), TODAY);
        const before = stored();
        openMenu('Meals that felt like home');
        fireEvent.click(screen.getByRole('button', { name: 'Add a meal' }));
        fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
        const after = stored();
        expect(Object.keys(after).sort()).toEqual([...Object.keys(before), 'culturalMeals'].sort());
        expect({ ...after, culturalMeals: undefined }).toEqual({ ...before, culturalMeals: undefined });
        expect(after.culturalMeals).toHaveLength(1);
        expect(after.culturalMeals[0]).toMatchObject({ tradition: 'greek' });
        expect(Object.keys(localStorage)).toEqual([PROFILE_KEY]);
      });

      it('drops meals older than eight weeks when the profile loads', () => {
        const old = { id: 'old', at: '2026-07-01T10:00:00.000Z', tradition: 'greek' };
        const fresh = { id: 'new', at: '2026-10-27T01:00:00.000Z', tradition: 'greek' };
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...SEEN, culturalMeals: [old, fresh] }));
        renderApp(new LocalProfileStore(), TODAY);
        expect(stored().culturalMeals.map((m: { id: string }) => m.id)).toEqual(['new']);
      });

      it('leaves storage untouched on load when nothing is old', () => {
        const raw = JSON.stringify({ ...SEEN, culturalMeals: [{ id: 'new', at: '2026-10-27T01:00:00.000Z', tradition: 'greek' }] });
        localStorage.setItem(PROFILE_KEY, raw);
        renderApp(new LocalProfileStore(), TODAY);
        expect(localStorage.getItem(PROFILE_KEY)).toBe(raw);
      });

      it('with no food settings the tracker offers Other and a Set up My food button that opens the setup', () => {
        renderApp(new InMemoryProfileStore(SEEN), TODAY);
        openMenu('Meals that felt like home');
        fireEvent.click(screen.getByRole('button', { name: 'Add a meal' }));
        expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Set up My food' }));
        expect(screen.getByRole('heading', { level: 1, name: 'Which food traditions fit you?' })).toBeInTheDocument();
      });

      it('My week and My food both link to the tracker', () => {
        renderApp(new InMemoryProfileStore({ ...SEEN, foodProfile: { traditions: ['greek'], rules: [], allergies: [], occasions: [], dismissed: [] } }), TODAY);
        openMenu('My week');
        fireEvent.click(screen.getByRole('button', { name: 'Meals that felt like home' }));
        expect(screen.getByRole('heading', { level: 1, name: 'Meals that felt like home' })).toBeInTheDocument();
        openMenu('My food');
        fireEvent.click(screen.getByRole('button', { name: 'Meals that felt like home' }));
        expect(screen.getByRole('heading', { level: 1, name: 'Meals that felt like home' })).toBeInTheDocument();
      });

      it('shows the person\'s own traditions as pills', () => {
        renderApp(new InMemoryProfileStore({ ...SEEN, foodProfile: { traditions: ['greek', "My nan's cooking"], rules: [], allergies: [], occasions: [], dismissed: [] } }), TODAY);
        openMenu('Meals that felt like home');
        fireEvent.click(screen.getByRole('button', { name: 'Add a meal' }));
        expect(screen.getByRole('button', { name: "My nan's cooking" })).toBeInTheDocument();
      });
    });

    describe('My pantry', () => {
      const PROFILE_KEY = 'culinerity.profile.v1';
      const TODAY = () => '2026-10-29T12:00:00';

      it('adding an item changes only the pantry key of the stored JSON and touches nothing else in storage', () => {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...SEEN, score: 40 }));
        renderApp(new LocalProfileStore(), TODAY);
        const before = stored();
        openMenu('My pantry');
        expect(screen.getByRole('heading', { level: 1, name: 'My pantry' })).toHaveFocus();
        fireEvent.click(screen.getByRole('button', { name: 'Onion' }));
        const after = stored();
        expect(Object.keys(after).sort()).toEqual([...Object.keys(before), 'pantry'].sort());
        expect(after.pantry.items).toMatchObject([{ ingredientId: 'onion' }]);
        expect(Object.keys(localStorage)).toEqual([PROFILE_KEY]);
      });

      it('"Cook with what you have" opens its own screen', () => {
        renderApp(new InMemoryProfileStore(SEEN), TODAY);
        openMenu('Cook with what you have');
        expect(screen.getByRole('heading', { level: 1, name: 'Cook with what you have' })).toBeInTheDocument();
      });
    });

    it('the Menu opens Meals that felt like home', () => {
      renderApp(new InMemoryProfileStore(SEEN));
      openMenu('Meals that felt like home');
      expect(screen.getByRole('heading', { level: 1, name: 'Meals that felt like home' })).toBeInTheDocument();
    });
  });
});
