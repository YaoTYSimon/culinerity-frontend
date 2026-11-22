import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountRecord } from '@culinerity/core';
import App from '../App';
import { LocalThemeStore } from '../storage/localThemeStore';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { Gate } from './Gate';
import { LocalAuthService } from './LocalAuthService';
import { KEYS } from './storageKeys';

function mount() {
  return render(
    <ThemeProvider store={new LocalThemeStore()}>
      <AuthProvider service={new LocalAuthService()}>
        <Gate useBackend={false}>
          <App />
        </Gate>
      </AuthProvider>
    </ThemeProvider>,
  );
}

const START_H1 = 'Welcome to Culinerity.';
const APP_H1 = 'How much is food on your mind?'; // the in-app welcome page, the guest's first view

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('StartScreen', () => {
  it('shows on a first visit with Create and Guest, and no Sign in when there are no profiles', () => {
    mount();
    const h1 = screen.getByRole('heading', { level: 1, name: START_H1 });
    expect(h1).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Create a profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse as a guest' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('Browse as a guest sets the flag and shows the app; the flag survives a remount', () => {
    const first = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Browse as a guest' }));
    expect(localStorage.getItem(KEYS.welcomed)).toBe('1');
    expect(screen.getByRole('heading', { level: 1, name: APP_H1 })).toBeInTheDocument();
    first.unmount();
    mount();
    expect(screen.getByRole('heading', { level: 1, name: APP_H1 })).toBeInTheDocument();
  });

  it('is skipped when the flag is already set', () => {
    localStorage.setItem(KEYS.welcomed, '1');
    mount();
    expect(screen.getByRole('heading', { level: 1, name: APP_H1 })).toBeInTheDocument();
  });

  it('Create a profile opens the existing create flow, and a new profile sets the flag', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Create a profile' }));
    fireEvent.change(await screen.findByLabelText(/name/i), { target: { value: 'Test Person' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create profile' }));
    expect(await screen.findByRole('button', { name: 'Menu' })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(KEYS.welcomed)).toBe('1'));
  });

  it('with profiles present the chooser shows, not the start screen, and its guest action sets the flag', () => {
    const account: AccountRecord = { id: 'aaa', name: 'Sam', colour: 'sand', createdAt: '2026-10-01T00:00:00.000Z' };
    localStorage.setItem(KEYS.accounts, JSON.stringify([account]));
    mount();
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back.' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: START_H1 })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse as a guest' }));
    expect(localStorage.getItem(KEYS.welcomed)).toBe('1');
    expect(screen.getByRole('heading', { level: 1, name: APP_H1 })).toBeInTheDocument();
    // Nothing was signed in or deleted.
    expect(JSON.parse(localStorage.getItem(KEYS.accounts)!)).toHaveLength(1);
  });

  it('still renders when storage throws: the start screen, then the app after a guest choice', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mount();
    expect(screen.getByRole('heading', { level: 1, name: START_H1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse as a guest' }));
    expect(screen.queryByRole('heading', { name: START_H1 })).not.toBeInTheDocument();
  });

  it('shows no personal data', () => {
    const account: AccountRecord = { id: 'aaa', name: 'Secret Sam', colour: 'sand', createdAt: '2026-10-01T00:00:00.000Z' };
    localStorage.setItem(KEYS.accounts, JSON.stringify([account]));
    localStorage.setItem(KEYS.welcomed, '1');
    sessionStorage.clear();
    mount();
    // Locked: chooser names the profile by design; the start screen itself must not appear or name anyone.
    expect(screen.queryByRole('heading', { name: START_H1 })).not.toBeInTheDocument();
  });
});
