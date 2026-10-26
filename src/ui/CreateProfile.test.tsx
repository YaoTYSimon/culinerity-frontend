import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { LocalAuthService } from '../auth/LocalAuthService';
import { KEYS, profileKey } from '../auth/storageKeys';
import { useAuth, type AuthState } from '../auth/useAuth';
import { CreateProfile } from './CreateProfile';

let auth!: AuthState;
function Probe() {
  auth = useAuth();
  return null;
}

function mount(props: Partial<React.ComponentProps<typeof CreateProfile>> = {}, service = new LocalAuthService()) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <AuthProvider service={service}>
      <Probe />
      <CreateProfile onDone={onDone} onCancel={onCancel} {...props} />
    </AuthProvider>,
  );
  return { service, onDone, onCancel, ...view };
}

const name = () => screen.getByLabelText('Name') as HTMLInputElement;
const pass = () => screen.getByLabelText('Passcode') as HTMLInputElement;
const confirm = () => screen.getByLabelText('Confirm passcode') as HTMLInputElement;
const live = () => document.querySelector('[aria-live]') as HTMLElement;
const create = () => userEvent.click(screen.getByRole('button', { name: 'Create profile' }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('CreateProfile', () => {
  it('has one h1 that takes focus, the name helper text and the passcode helper text', () => {
    mount();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(screen.getByText('A first name or nickname is plenty. It stays on this device.')).toBeInTheDocument();
    expect(
      screen.getByText("Optional. If you forget it, we can't reset it, but you can start a new profile."),
    ).toBeInTheDocument();
  });

  it('passcode inputs are masked numeric, autocomplete off, with non-password-like names', () => {
    mount();
    for (const f of [pass(), confirm()]) {
      expect(f).toHaveAttribute('type', 'password');
      expect(f).toHaveAttribute('inputmode', 'numeric');
      expect(f).toHaveAttribute('pattern', '[0-9]*');
      expect(f).toHaveAttribute('autocomplete', 'off');
      expect(f).toHaveAttribute('maxlength', '8');
      expect(f.getAttribute('name')).not.toMatch(/pass|pwd/i);
    }
    expect(name()).toHaveAttribute('autocomplete', 'off');
  });

  it('shows the validateName message for an empty name and for 25 characters', async () => {
    mount();
    await create();
    expect(live()).toHaveTextContent('Please enter a name.');
    await userEvent.type(name(), 'a'.repeat(25));
    await create();
    expect(live()).toHaveTextContent('Keep it to 24 characters or fewer.');
  });

  it('shows the validatePasscode messages (format, weak) and the mismatch message', async () => {
    mount();
    await userEvent.type(name(), 'Sam');
    await userEvent.type(pass(), '12');
    await create();
    expect(live()).toHaveTextContent('Use 4 to 8 digits.');
    await userEvent.clear(pass());
    await userEvent.type(pass(), '1234');
    await userEvent.type(confirm(), '1234');
    await create();
    expect(live()).toHaveTextContent('That one is easy to guess. Try another.');
    await userEvent.clear(pass());
    await userEvent.clear(confirm());
    await userEvent.type(pass(), '4829');
    await userEvent.type(confirm(), '4820');
    await create();
    expect(live()).toHaveTextContent("Those didn't match.");
    expect(auth.accounts).toHaveLength(0);
  });

  it('creates a passcode-less profile and signs in, passing undefined (not "") as the passcode', async () => {
    const { service, onDone } = mount();
    const create_ = vi.spyOn(service, 'create');
    const signIn = vi.spyOn(service, 'signIn');
    await userEvent.type(name(), '  Sam ');
    await create();
    await waitFor(() => expect(auth.status).toBe('signed-in'));
    expect(create_.mock.calls[0][0].passcode).toBeUndefined();
    expect(signIn.mock.calls[0][1]).toBeUndefined();
    expect(auth.current?.name).toBe('Sam');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('creates a profile with a passcode and signs in with it; the passcode is not left in the DOM', async () => {
    const { service } = mount();
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m));
    await userEvent.type(name(), 'Sam');
    await userEvent.type(pass(), '4829');
    await userEvent.type(confirm(), '4829');
    await create();
    await waitFor(() => expect(auth.current?.name).toBe('Sam'));
    expect(service.list()[0].verifier).toBeDefined();
    expect(document.body.innerHTML).not.toContain('4829');
    for (const s of spies) expect(JSON.stringify(s.mock.calls)).not.toContain('4829');
  });

  it('shows the typed failure message from create() in the live region and stays put', async () => {
    const { service, onDone } = mount();
    vi.spyOn(service, 'create').mockResolvedValue({ ok: false, reason: 'storage', message: 'Nope, storage said no.' });
    await userEvent.type(name(), 'Sam');
    await create();
    await waitFor(() => expect(live()).toHaveTextContent('Nope, storage said no.'));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Create profile' })).toBeEnabled();
  });

  it('double-click calls create once', async () => {
    const { service } = mount();
    const spy = vi.spyOn(service, 'create');
    await userEvent.type(name(), 'Sam');
    const btn = screen.getByRole('button', { name: 'Create profile' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(auth.status).toBe('signed-in'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Enter in the name field submits', async () => {
    mount();
    await userEvent.type(name(), 'Sam{Enter}');
    await waitFor(() => expect(auth.current?.name).toBe('Sam'));
  });

  it('colour choice: four round buttons with names and aria-pressed; the choice is saved', async () => {
    mount();
    const group = screen.getByRole('group', { name: 'Avatar colour' });
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(4);
    const sand = screen.getByRole('button', { name: 'Sand' });
    expect(screen.getByRole('button', { name: 'Tobacco' })).toHaveAttribute('aria-pressed', 'true');
    expect(sand).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(sand);
    expect(sand).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tobacco' })).toHaveAttribute('aria-pressed', 'false');
    for (const b of buttons) expect(b.querySelector('span')!.className).toMatch(/rounded-full/);
    await userEvent.type(name(), 'Sam');
    await create();
    await waitFor(() => expect(auth.current?.colour).toBe('sand'));
  });

  it('hides the migration choice when the guest profile is empty (also with only welcomeSeen)', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Start from my current data' })).not.toBeInTheDocument();
    localStorage.setItem(KEYS.guestProfile, JSON.stringify({ welcomeSeen: true }));
    mount();
    expect(screen.queryByRole('button', { name: 'Start from my current data' })).not.toBeInTheDocument();
  });

  it('shows the migration choice when the guest has data; "current data" moves it, "fresh" leaves it', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify({ welcomeSeen: true, score: 42 }));
    const first = mount();
    const cur = screen.getByRole('button', { name: 'Start from my current data' });
    const fresh = screen.getByRole('button', { name: 'Start fresh' });
    expect(fresh).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(cur);
    expect(cur).toHaveAttribute('aria-pressed', 'true');
    expect(fresh).toHaveAttribute('aria-pressed', 'false');
    await userEvent.type(name(), 'Sam');
    await create();
    await waitFor(() => expect(auth.current?.name).toBe('Sam'));
    expect(localStorage.getItem(KEYS.guestProfile)).toBeNull();
    expect(localStorage.getItem(profileKey(auth.current!.id))).toContain('42');
    first.unmount();

    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(KEYS.guestProfile, JSON.stringify({ welcomeSeen: true, score: 42 }));
    mount();
    await userEvent.type(name(), 'Alex');
    await create();
    await waitFor(() => expect(auth.current?.name).toBe('Alex'));
    expect(localStorage.getItem(KEYS.guestProfile)).toContain('42');
    expect(localStorage.getItem(profileKey(auth.current!.id))).not.toContain('42');
  });

  it('hides the passcode inputs with a notice when the browser cannot protect passcodes', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => crypto.randomUUID.call(globalThis.crypto) });
    mount();
    expect(screen.queryByLabelText('Passcode')).not.toBeInTheDocument();
    expect(screen.getByText(/This browser can't protect profiles with a passcode/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('Escape and Cancel call onCancel', async () => {
    const { onCancel } = mount();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('omits Cancel when no onCancel is given', () => {
    render(
      <AuthProvider service={new LocalAuthService()}>
        <CreateProfile onDone={() => {}} />
      </AuthProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
