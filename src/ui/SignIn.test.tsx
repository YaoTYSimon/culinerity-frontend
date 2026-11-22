import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountRecord, ThemeId } from '@culinerity/core';
import { AuthProvider } from '../auth/AuthProvider';
import { LocalAuthService } from '../auth/LocalAuthService';
import { KEYS, profileKey } from '../auth/storageKeys';
import { useAuth, type AuthState } from '../auth/useAuth';
import { createVerifier } from '../auth/verifier';
import { SignIn } from './SignIn';

let t = 1_000_000;
const now = () => t;
let auth!: AuthState;
function Probe() {
  auth = useAuth();
  return null;
}
let tickers: Array<() => void> = [];
const ticker = (cb: () => void) => {
  tickers.push(cb);
  return () => {
    tickers = tickers.filter((x) => x !== cb);
  };
};
const tick = (seconds: number) => {
  t += seconds * 1000;
  act(() => tickers.slice().forEach((cb) => cb()));
};

const HONESTY =
  'A password locks this profile on this device. It is not encryption.';

function mount(service = new LocalAuthService({ now })) {
  const view = render(
    <AuthProvider service={service}>
      <Probe />
      <SignIn now={now} ticker={ticker} />
    </AuthProvider>,
  );
  return { service, ...view };
}

async function add(service: LocalAuthService, name: string, passcode?: string, colour: ThemeId = 'sand') {
  const r = await service.create({ name, colour, passcode });
  if (!r.ok) throw new Error(r.message);
  return r.account;
}

const field = () => screen.getByLabelText('Password') as HTMLInputElement;
const type = (v: string) => fireEvent.change(field(), { target: { value: v } });
const live = () => document.querySelector('[aria-live]') as HTMLElement;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  t = 1_000_000;
  tickers = [];
});
afterEach(() => vi.restoreAllMocks());

describe('headline and chooser', () => {
  it('one profile: h1 "Welcome back."; two: "Who\'s eating today?"', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam');
    const one = mount(s);
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back.' })).toBeInTheDocument();
    one.unmount();
    await add(s, 'Alex');
    mount(s);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: "Who's eating today?" })).toBeInTheDocument();
  });

  it('chooser has one decorative round photo with its size set', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam');
    const { container } = mount(s);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '112');
    expect(img.getAttribute('src')).toMatch(/signin-cups/);
  });

  it('shows a named avatar button per profile, decorative circles with the name in text', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam');
    await add(s, 'Alex', 'fake-pass-82');
    mount(s);
    const sam = screen.getByRole('button', { name: 'Sign in as Sam' });
    expect(within(sam).getByText('Sam')).toBeInTheDocument();
    expect(sam.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in as Alex' })).toBeInTheDocument();
  });

  it('shows the honesty copy and the Create / Skip text buttons', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam');
    mount(s);
    expect(screen.getByText(HONESTY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse as a guest' })).toBeInTheDocument();
  });

  it('7 profiles show 6 avatars plus More; More lists the rest and picking one works', async () => {
    const s = new LocalAuthService({ now });
    for (const n of ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7']) await add(s, n);
    mount(s);
    expect(screen.getAllByRole('button', { name: /^Sign in as / })).toHaveLength(6);
    expect(screen.queryByRole('button', { name: 'Sign in as G7' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as G7' }));
    await waitFor(() => expect(auth.current?.name).toBe('G7'));
  });

  it('6 profiles show no More button', async () => {
    const s = new LocalAuthService({ now });
    for (const n of ['A1', 'B2', 'C3', 'D4', 'E5', 'F6']) await add(s, n);
    mount(s);
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });
});

describe('no passcode', () => {
  it('signs in with one tap', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam');
    mount(s);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as Sam' }));
    await waitFor(() => expect(auth.status).toBe('signed-in'));
    expect(auth.current?.name).toBe('Sam');
  });

  it('"Browse as a guest" continues as a guest', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam');
    mount(s);
    await userEvent.click(screen.getByRole('button', { name: 'Browse as a guest' }));
    expect(auth.status).toBe('guest');
  });
});

describe('profile made under the old 4 to 8 digit rule', () => {
  it('still signs in with the digits', async () => {
    const s = new LocalAuthService({ now });
    const id = '22222222-2222-4222-8222-222222222222';
    localStorage.setItem(
      KEYS.accounts,
      JSON.stringify([{ id, name: 'Old', colour: 'sand', createdAt: '2026-01-01T00:00:00.000Z', verifier: await createVerifier('4829') }]),
    );
    mount(s);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as Old' }));
    await userEvent.type(field(), '4829{Enter}');
    await waitFor(() => expect(auth.current?.name).toBe('Old'));
  });
});

describe('passcode profile', () => {
  async function withPasscode() {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam', 'fake-pass-82');
    await add(s, 'Alex');
    const view = mount(s);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as Sam' }));
    return { s, ...view };
  }

  it('selecting shows a labelled masked text field with safe attributes and a Sign in button', async () => {
    await withPasscode();
    const f = field();
    expect(f).toHaveAttribute('type', 'password');
    expect(f).not.toHaveAttribute('inputmode');
    expect(f).not.toHaveAttribute('pattern');
    expect(f).toHaveAttribute('autocomplete', 'current-password');
    expect(f).toHaveAttribute('maxlength', '64');
    expect(f.getAttribute('name')).toBe('culinerity-lock');
    expect(f.getAttribute('name')).not.toMatch(/pass|pwd|pin/i);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('the box is cleared after a sign-in attempt, wrong or right, and takes 64 characters', async () => {
    const { s } = await withPasscode();
    expect(field()).toHaveAttribute('maxlength', '64');
    await userEvent.type(field(), 'wrong-pass-05{Enter}');
    await waitFor(() => expect(live()).toHaveTextContent("That password didn't match."));
    expect(field().value).toBe('');
    await userEvent.type(field(), 'fake-pass-82{Enter}');
    await waitFor(() => expect(auth.status).toBe('signed-in'));
    expect(s.current()?.name).toBe('Sam');
  });

  it('Show toggles type password <-> text with aria-pressed', async () => {
    await withPasscode();
    const show = screen.getByRole('button', { name: 'Show' });
    expect(show).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(show);
    expect(field()).toHaveAttribute('type', 'text');
    expect(show).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(show);
    expect(field()).toHaveAttribute('type', 'password');
    expect(show).toHaveAttribute('aria-pressed', 'false');
  });

  it('the correct password signs in (Enter submits)', async () => {
    await withPasscode();
    await userEvent.type(field(), 'fake-pass-82{Enter}');
    await waitFor(() => expect(auth.current?.name).toBe('Sam'));
  });

  it('a wrong password shows the exact calm message with tries left, clears the field, and does not log it', async () => {
    await withPasscode();
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m));
    await userEvent.type(field(), 'wrong-pass-05');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(live()).toHaveTextContent("That password didn't match. 4 tries left."));
    expect(field().value).toBe('');
    expect(document.body.textContent).not.toContain('wrong-pass-05');
    expect(document.body.innerHTML).not.toContain('wrong-pass-05');
    for (const s of spies) expect(JSON.stringify(s.mock.calls)).not.toMatch(/wrong-pass-05|fake-pass-82/);
    expect(auth.status).toBe('locked');
  });

  it('says "1 try left." in the singular', async () => {
    await withPasscode();
    for (let i = 0; i < 4; i++) {
      type('wrong-pass-05');
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(live()).toHaveTextContent(/tr(y|ies) left/));
    }
    expect(live()).toHaveTextContent("That password didn't match. 1 try left.");
  });

  it('the 5th failure shows the pause with a live countdown, disables Sign in, then re-enables at zero', async () => {
    await withPasscode();
    for (let i = 0; i < 5; i++) {
      type('wrong-pass-05');
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(live().textContent).not.toBe(''));
      await act(async () => {});
    }
    await waitFor(() => expect(live()).toHaveTextContent('Too many tries. You can try again in 30 seconds.'));
    // Announced once, assertively; the per-second countdown after that is not read out again.
    expect(live()).toHaveAttribute('aria-live', 'assertive');
    const btn = screen.getByRole('button', { name: 'Try again in 30 s' });
    // Readable, not the faded native disabled state, but it does nothing.
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).not.toBeDisabled();
    const calls = vi.spyOn(auth, 'signIn');
    await userEvent.click(btn);
    expect(calls).not.toHaveBeenCalled();
    tick(6);
    expect(btn).toHaveTextContent('Try again in 24 s');
    expect(live()).toHaveAttribute('aria-live', 'off');
    expect(live()).toHaveTextContent('Too many tries. You can try again in 24 seconds.');
    tick(23);
    expect(live()).toHaveTextContent('Too many tries. You can try again in 1 second.');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    tick(1);
    expect(btn).not.toHaveAttribute('aria-disabled');
    expect(btn).toHaveTextContent('Sign in');
    expect(live()).toHaveAttribute('aria-live', 'assertive');
    expect(live()).toHaveTextContent('You can try again now.');
    // a correct passcode now works
    type('fake-pass-82');
    await userEvent.click(btn);
    await waitFor(() => expect(auth.current?.name).toBe('Sam'));
  });

  it('double-clicking while busy calls signIn once and shows "Checking…"', async () => {
    const { s } = await withPasscode();
    let release!: (v: Awaited<ReturnType<typeof s.signIn>>) => void;
    const spy = vi.spyOn(s, 'signIn').mockImplementation(() => new Promise((r) => (release = r)));
    type('fake-pass-82');
    const btn = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.submit(btn.closest('form')!);
    expect(spy).toHaveBeenCalledTimes(1);
    const busy = screen.getByRole('button', { name: 'Checking…' });
    expect(busy).toBeDisabled();
    await act(async () => release({ ok: false, reason: 'wrong-passcode', triesLeft: 3 }));
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('never renders the typed password, even while typing, shown, or after success', async () => {
    await withPasscode();
    await userEvent.type(field(), 'fake-pass-82');
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(document.body.textContent).not.toContain('fake-pass-82');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(auth.status).toBe('signed-in'));
    expect(document.body.textContent).not.toContain('fake-pass-82');
  });

  it('an empty submit asks calmly without calling signIn', async () => {
    const { s } = await withPasscode();
    const spy = vi.spyOn(s, 'signIn');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(spy).not.toHaveBeenCalled();
    expect(live()).toHaveTextContent('Please enter your password.');
  });

  it('"Use a different profile" and Escape return to the chooser', async () => {
    await withPasscode();
    await userEvent.click(screen.getByRole('button', { name: 'Use a different profile' }));
    expect(screen.getByRole('button', { name: 'Sign in as Alex' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as Sam' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in as Alex' })).toBeInTheDocument();
  });
});

describe('errors from the service', () => {
  it('storage-error shows the calm message and offers guest', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam');
    mount(s);
    vi.spyOn(s, 'signIn').mockResolvedValue({ ok: false, reason: 'storage-error' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as Sam' }));
    await waitFor(() =>
      expect(live()).toHaveTextContent("This browser can't keep you signed in. Try again, or continue as a guest."),
    );
    expect(screen.getByRole('button', { name: 'Browse as a guest' })).toBeInTheDocument();
  });

  it('unknown-profile says so and returns to the chooser', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam', 'fake-pass-82');
    await add(s, 'Alex');
    mount(s);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as Sam' }));
    vi.spyOn(s, 'signIn').mockResolvedValue({ ok: false, reason: 'unknown-profile' });
    type('fake-pass-82');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(live()).toHaveTextContent("That profile isn't here any more."));
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });
});

describe('forgot passcode: delete this profile', () => {
  async function toDelete() {
    const s = new LocalAuthService({ now });
    const sam = await add(s, 'Sam', 'fake-pass-82');
    const alex = await add(s, 'Alex');
    localStorage.setItem(profileKey(sam.id), JSON.stringify({ score: 40 }));
    localStorage.setItem(profileKey(alex.id), JSON.stringify({ score: 70 }));
    localStorage.setItem(KEYS.guestProfile, JSON.stringify({ score: 10 }));
    mount(s);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as Sam' }));
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password? Delete this profile' }));
    return { s, sam, alex };
  }

  it('needs the exact typed name; a wrong name deletes nothing', async () => {
    const { s, sam } = await toDelete();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    const input = screen.getByLabelText(/Type Sam to confirm/);
    await userEvent.type(input, 'sam');
    await userEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    await waitFor(() => expect(live().textContent).not.toBe(''));
    expect(s.list().some((a) => a.id === sam.id)).toBe(true);
    expect(localStorage.getItem(profileKey(sam.id))).not.toBeNull();
  });

  it('the exact name deletes only that profile, never the guest or other keys', async () => {
    const { s, sam, alex } = await toDelete();
    await userEvent.type(screen.getByLabelText(/Type Sam to confirm/), 'Sam');
    await userEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    await waitFor(() => expect(s.list().some((a) => a.id === sam.id)).toBe(false));
    expect(localStorage.getItem(profileKey(sam.id))).toBeNull();
    expect(localStorage.getItem(profileKey(alex.id))).not.toBeNull();
    expect(localStorage.getItem(KEYS.guestProfile)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in as Alex' })).toBeInTheDocument();
  });

  it('says some data could not be removed when remove() reports leftovers', async () => {
    const { s } = await toDelete();
    vi.spyOn(s, 'remove').mockResolvedValue({ ok: false, reason: 'storage-error', remaining: ['data'] });
    await userEvent.type(screen.getByLabelText(/Type Sam to confirm/), 'Sam');
    await userEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    await waitFor(() => expect(live()).toHaveTextContent(/some data could not be removed/i));
  });

  it('Cancel goes back to the passcode screen', async () => {
    await toDelete();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});

describe('create from sign-in', () => {
  it('"Create a profile" opens the create screen; Cancel returns', async () => {
    const s = new LocalAuthService({ now });
    await add(s, 'Sam');
    mount(s);
    await userEvent.click(screen.getByRole('button', { name: 'Create a profile' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Create a profile.' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Sign in as Sam' })).toBeInTheDocument();
  });
});

export type { AccountRecord };
