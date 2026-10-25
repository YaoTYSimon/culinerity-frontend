import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { DOMAINS, InMemoryProfileStore, type ProfileStore } from '@culinerity/core';
import { createServices } from './services/container';
import { ServicesProvider } from './services/ServicesContext';
import { LocalProfileStore } from './storage/localProfileStore';

const SUPPORT = { name: 'Free food support near you' };
const sectionCount = 1 + Object.keys(DOMAINS).length;

function renderApp(store: ProfileStore = new InMemoryProfileStore()) {
  const services = { ...createServices(), profiles: store };
  return render(<ServicesProvider services={services}><App /></ServicesProvider>);
}

function answerSection(label: string) {
  screen.getAllByRole('radio', { name: label }).forEach((r) => fireEvent.click(r));
}

function takeWorstQuestionnaire() {
  fireEvent.click(screen.getByRole('button', { name: /take the check-in/i }));
  answerSection('Yes');
  for (let i = 1; i < sectionCount; i++) {
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    answerSection('Almost always');
  }
  fireEvent.click(screen.getByRole('button', { name: /see my score/i }));
}

afterEach(() => localStorage.clear());

describe('App', () => {
  it('first launch shows the swap search and an optional, non-blocking prompt', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /optional check-in/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', SUPPORT)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(screen.queryByRole('region', { name: /optional check-in/i })).not.toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('worst answers save score 0 and show the support panel and disclaimer', async () => {
    const store = new InMemoryProfileStore();
    renderApp(store);
    takeWorstQuestionnaire();
    expect(await screen.findAllByText('Sample data')).not.toHaveLength(0);
    expect(within(screen.getByRole('region', SUPPORT)).getByText('Culinerity is not medical advice.')).toBeInTheDocument();
    const last = store.saved[store.saved.length - 1];
    expect(last.score).toBe(0);
    expect(typeof last.scoreTakenAt).toBe('string');
    expect(screen.getByText(/100 = secure, 0 = critical/)).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('hides the panel from home for a score of 80 but keeps it in the menu', async () => {
    renderApp(new InMemoryProfileStore({ score: 80 }));
    expect(screen.getByText('Secure')).toBeInTheDocument();
    expect(screen.queryByRole('region', SUPPORT)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /food support/i }));
    expect(await screen.findAllByText('Sample data')).not.toHaveLength(0);
    expect(within(screen.getByRole('region', SUPPORT)).getByText('Culinerity is not medical advice.')).toBeInTheDocument();
  });

  it('persists finance changes and restores score and budget on reload', () => {
    const store = new InMemoryProfileStore({ score: 55 });
    const first = renderApp(store);
    fireEvent.change(screen.getByLabelText(/food budget/i), { target: { value: '90' } });
    expect(store.saved[store.saved.length - 1]).toMatchObject({ score: 55, foodBudgetWeekly: 90 });
    first.unmount();
    renderApp(store);
    expect(screen.getByLabelText(/food budget/i)).toHaveValue('90');
    expect(screen.getByText('Strained')).toBeInTheDocument();
  });

  it('corrupt stored JSON still renders the first-launch state', () => {
    localStorage.setItem('culinerity.profile.v1', '{not json');
    renderApp(new LocalProfileStore());
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /optional check-in/i })).toBeInTheDocument();
    expect(within(document.body).queryByText(/100 = secure/)).not.toBeInTheDocument();
  });

  it('keeps the footer notes and a photo credits disclosure', () => {
    renderApp();
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(/not medical advice/i);
    expect(footer).toHaveTextContent(/sample data/i);
    expect(footer).toHaveTextContent('Swap ideas and the page illustration are drawn; craving photos are credited below.');
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
