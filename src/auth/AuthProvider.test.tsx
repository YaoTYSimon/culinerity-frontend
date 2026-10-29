import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountRecord, AuthService } from '@culinerity/core';
import App from '../App';
import { LocalThemeStore } from '../storage/localThemeStore';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { Gate } from './Gate';
import { LocalAuthService } from './LocalAuthService';
import { KEYS, profileKey } from './storageKeys';
import { useAuth, type AuthState } from './useAuth';

const WELCOME_H1 = 'How much is food on your mind?';
const at = () => new Date().toISOString();

function seed(id: string, name: string, swap: string, score: number): AccountRecord {
  const account: AccountRecord = { id, name, colour: 'sand', createdAt: '2026-10-01T00:00:00.000Z' };
  const all = JSON.parse(localStorage.getItem(KEYS.accounts) ?? '[]') as AccountRecord[];
  localStorage.setItem(KEYS.accounts, JSON.stringify([...all, account]));
  localStorage.setItem(
    profileKey(id),
    JSON.stringify({ welcomeSeen: true, score, scoreTakenAt: at(), weekSwaps: [{ itemId: id, name: swap, saving: 4, at: at() }] }),
  );
  return account;
}

let auth!: AuthState;
function Probe() {
  auth = useAuth();
  return null;
}

function mount(service: AuthService = new LocalAuthService()) {
  return render(
    <ThemeProvider store={new LocalThemeStore()}>
      <AuthProvider service={service}>
        <Probe />
        <Gate useBackend={false}>
          <App />
        </Gate>
      </AuthProvider>
    </ThemeProvider>,
  );
}

function openWeek() {
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'My week' }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('with no accounts', () => {
  it('shows the welcome page first, exactly as before, and status is guest', () => {
    mount();
    expect(screen.getByRole('heading', { level: 1, name: WELCOME_H1 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Welcome back.' })).not.toBeInTheDocument();
    expect(auth.status).toBe('guest');
    fireEvent.click(screen.getByRole('button', { name: 'Skip to cheaper swaps' }));
    expect(JSON.parse(localStorage.getItem('culinerity.profile.v1')!)).toMatchObject({ welcomeSeen: true });
  });
});

describe('with accounts and no session', () => {
  it('shows only the sign-in heading and none of any profile data', () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    mount();
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back.' })).toBeInTheDocument();
    expect(auth.status).toBe('locked');
    // Task 4: the chooser names the profile (first name only, by design); nothing else about it is reachable.
    expect(document.body.textContent).not.toMatch(/Secret Sam falafel|31/);
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('signIn renders that profile\'s data (week list visible)', async () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    mount();
    await act(async () => {
      expect((await auth.signIn('aaa')).ok).toBe(true);
    });
    expect(auth.status).toBe('signed-in');
    expect(screen.queryByRole('heading', { name: 'Welcome back.' })).not.toBeInTheDocument();
    openWeek();
    expect(screen.getByText(/Secret Sam falafel/)).toBeInTheDocument();
  });

  it('lock() remounts: the previous week list and in-memory state are gone', async () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    mount();
    await act(async () => void (await auth.signIn('aaa')));
    openWeek();
    expect(screen.getByText(/Secret Sam falafel/)).toBeInTheDocument();
    act(() => auth.lock());
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
    expect(screen.queryByText(/Secret Sam falafel/)).not.toBeInTheDocument();
    expect(auth.status).toBe('locked');
    // Signing in again starts a fresh mount on the home view, not the week view left behind.
    await act(async () => void (await auth.signIn('aaa')));
    expect(screen.queryByText(/Secret Sam falafel/)).not.toBeInTheDocument();
  });

  it('switching to another profile shows that profile\'s data, not the first one\'s', async () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    seed('bbb', 'Alex', 'Alex lentil bowl', 72);
    mount();
    await act(async () => void (await auth.signIn('aaa')));
    openWeek();
    expect(screen.getByText(/Secret Sam falafel/)).toBeInTheDocument();
    await act(async () => void (await auth.signIn('bbb')));
    expect(screen.queryByText(/Secret Sam falafel/)).not.toBeInTheDocument();
    openWeek();
    expect(screen.getByText(/Alex lentil bowl/)).toBeInTheDocument();
    // Edits go to the right key.
    expect(localStorage.getItem(profileKey('aaa'))).toContain('Secret Sam falafel');
    expect(localStorage.getItem(profileKey('bbb'))).not.toContain('Secret Sam falafel');
  });

  it('moves focus to the new page heading after signing in or switching', async () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    seed('bbb', 'Alex', 'Alex lentil bowl', 72);
    mount();
    await act(async () => void (await auth.signIn('aaa')));
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    await act(async () => void (await auth.signIn('bbb')));
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('continueAsGuest shows the guest app under the unsuffixed key and exposes no profile data', () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    localStorage.setItem('culinerity.profile.v1', JSON.stringify({ welcomeSeen: true }));
    mount();
    act(() => auth.continueAsGuest());
    expect(auth.status).toBe('guest');
    expect(screen.getByRole('search')).toBeInTheDocument();
    openWeek();
    expect(screen.getByRole('heading', { level: 1, name: /nothing in your week yet/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Secret Sam falafel/);
    expect(localStorage.getItem(profileKey('aaa'))).toContain('Secret Sam falafel');
  });

  it('guest is not persisted: a new provider with the same storage and no session is locked', () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    const first = mount();
    act(() => auth.continueAsGuest());
    expect(auth.status).toBe('guest');
    first.unmount();
    mount();
    expect(auth.status).toBe('locked');
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  });

  it('a reload keeps a signed-in session (sessionStorage) but never data from another profile', async () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    const first = mount();
    await act(async () => void (await auth.signIn('aaa')));
    first.unmount();
    mount();
    expect(auth.status).toBe('signed-in');
  });
});

describe('theme', () => {
  it('stays global across profiles', async () => {
    seed('aaa', 'Sam', 'x one', 31);
    seed('bbb', 'Alex', 'y two', 72);
    mount();
    await act(async () => void (await auth.signIn('aaa')));
    fireEvent.click(screen.getByRole('button', { name: /walnut/i }));
    expect(document.documentElement.dataset.theme).toBe('walnut');
    await act(async () => void (await auth.signIn('bbb')));
    expect(document.documentElement.dataset.theme).toBe('walnut');
    act(() => auth.lock());
    expect(document.documentElement.dataset.theme).toBe('walnut');
    expect(localStorage.getItem('culinerity.theme.v1')).toContain('walnut');
  });
});

describe('account list', () => {
  it('refreshes when a storage event fires', async () => {
    seed('aaa', 'Sam', 'x one', 31);
    mount();
    expect(auth.accounts.map((a) => a.id)).toEqual(['aaa']);
    seed('bbb', 'Alex', 'y two', 72);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEYS.accounts }));
    });
    await waitFor(() => expect(auth.accounts.map((a) => a.id)).toEqual(['aaa', 'bbb']));
    expect(auth.status).toBe('locked');
  });

  it('a guest tab with no accounts is not pulled out of the app when another tab creates a profile', async () => {
    mount();
    seed('aaa', 'Sam', 'x one', 31);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEYS.accounts }));
    });
    await waitFor(() => expect(auth.accounts).toHaveLength(1));
    expect(auth.status).toBe('guest');
    expect(screen.getByRole('heading', { name: WELCOME_H1 })).toBeInTheDocument();
    act(() => auth.lock());
    expect(auth.status).toBe('locked');
  });

  it('create refreshes the list and does not sign in', async () => {
    mount();
    await act(async () => {
      const r = await auth.create({ name: 'Mo', colour: 'cream' });
      expect(r.ok).toBe(true);
    });
    expect(auth.accounts.map((a) => a.name)).toEqual(['Mo']);
    expect(auth.status).toBe('guest');
  });

  it('remove of the signed-in profile signs out and drops its data from view', async () => {
    seed('aaa', 'Sam', 'Secret Sam falafel', 31);
    seed('bbb', 'Alex', 'Alex lentil bowl', 72);
    mount();
    await act(async () => void (await auth.signIn('aaa')));
    await act(async () => {
      expect((await auth.remove('aaa', 'Sam')).ok).toBe(true);
    });
    expect(auth.current).toBeNull();
    expect(auth.status).toBe('locked');
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  });
});

describe('a failing service', () => {
  it('never throws out of the provider', async () => {
    const boom = () => {
      throw new Error('storage');
    };
    const service: AuthService = {
      list: boom,
      current: boom,
      create: () => Promise.reject(new Error('x')),
      signIn: () => Promise.reject(new Error('x')),
      lock: boom,
      signOut: boom,
      remove: () => Promise.reject(new Error('x')),
    };
    mount(service);
    expect(screen.getByRole('heading', { name: WELCOME_H1 })).toBeInTheDocument();
    await act(async () => {
      expect(await auth.signIn('a')).toEqual({ ok: false, reason: 'storage-error' });
      expect((await auth.create({ name: 'Mo', colour: 'cream' })).ok).toBe(false);
      expect((await auth.remove('a', 'x')).ok).toBe(false);
    });
    expect(() => {
      act(() => {
        auth.lock();
        auth.signOut();
        auth.continueAsGuest();
        auth.refresh();
      });
    }).not.toThrow();
  });

  it('a real service on blocked storage renders the app', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    mount();
    expect(screen.getByRole('heading', { name: WELCOME_H1 })).toBeInTheDocument();
  });
});
