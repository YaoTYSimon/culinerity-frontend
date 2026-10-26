import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryThemeStore, type AuthService, type ThemeId } from '@culinerity/core';
import App from '../App';
import { AuthProvider } from '../auth/AuthProvider';
import { Gate } from '../auth/Gate';
import { LocalAuthService } from '../auth/LocalAuthService';
import { KEYS, profileKey } from '../auth/storageKeys';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { ThemeProvider } from '../theme/ThemeProvider';

const service = () => new LocalAuthService();
async function add(s: AuthService, name: string, passcode?: string, colour: ThemeId = 'sand') {
  const r = await s.create({ name, colour, passcode });
  if (!r.ok) throw new Error(r.message);
  return r.account;
}
const seedProfile = (id: string | undefined, data: object) => localStorage.setItem(profileKey(id), JSON.stringify(data));

function mount(s: AuthService) {
  return render(
    <ThemeProvider store={new InMemoryThemeStore()}>
      <AuthProvider service={s as LocalAuthService}>
        <Gate useBackend={false}>
          <App />
        </Gate>
      </AuthProvider>
    </ThemeProvider>,
  );
}

async function signedIn(name = 'Sam') {
  const s = service();
  const a = await add(s, name);
  await s.signIn(a.id);
  seedProfile(a.id, { welcomeSeen: true, suburb: 'Carlton' });
  return { s, a };
}
const profileButton = (name: string) => screen.getByRole('button', { name: `Profile menu, signed in as ${name}` });
const openPanel = (name = 'Sam') => fireEvent.click(profileButton(name));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => localStorage.clear());

describe('ProfileMenu: signed in', () => {
  it('shows a named avatar button and, when opened, the profile items', async () => {
    const { s } = await signedIn();
    mount(s);
    const btn = profileButton('Sam');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Signed in as Sam')).not.toBeInTheDocument();
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Signed in as Sam')).toBeInTheDocument();
    for (const name of ['Switch profile', 'Lock', 'Delete this profile and its data', 'Sign out']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('Escape closes the panel and returns focus to the avatar button', async () => {
    const { s } = await signedIn();
    mount(s);
    const btn = profileButton('Sam');
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: 'Switch profile' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Lock' }), { key: 'Escape' });
    expect(screen.queryByText('Signed in as Sam')).not.toBeInTheDocument();
    expect(btn).toHaveFocus();
  });

  it('opening the profile panel closes the Menu, and the other way round', async () => {
    const { s } = await signedIn();
    mount(s);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('button', { name: 'My week' })).toBeInTheDocument();
    openPanel();
    expect(screen.queryByRole('button', { name: 'My week' })).not.toBeInTheDocument();
    expect(screen.getByText('Signed in as Sam')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.queryByText('Signed in as Sam')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My week' })).toBeInTheDocument();
  });

  it('Lock returns to sign-in and the profile data leaves the DOM', async () => {
    const { s } = await signedIn();
    mount(s);
    expect(screen.getByText(/Cheaper, healthier swaps/)).toBeInTheDocument();
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back.' })).toBeInTheDocument();
    expect(screen.queryByText(/Cheaper, healthier swaps/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Profile menu/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Carlton')).not.toBeInTheDocument();
  });

  it('Switch profile shows the chooser', async () => {
    const { s } = await signedIn();
    await add(s, 'Alex');
    mount(s);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Switch profile' }));
    expect(await screen.findByRole('heading', { level: 1, name: "Who's eating today?" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in as Alex' })).toBeInTheDocument();
  });

  it('Sign out returns to sign-in', async () => {
    const { s } = await signedIn();
    mount(s);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back.' })).toBeInTheDocument();
  });

  it('never puts a passcode or hash in the DOM', async () => {
    const s = service();
    const a = await add(s, 'Sam', '2468');
    await s.signIn(a.id, '2468');
    seedProfile(a.id, { welcomeSeen: true });
    mount(s);
    openPanel();
    const hash = JSON.parse(localStorage.getItem(KEYS.accounts)!)[0].verifier.hash as string;
    expect(document.body.innerHTML).not.toContain(hash);
    expect(document.body.innerHTML).not.toContain('2468');
    expect(document.body.innerHTML).not.toMatch(/verifier|salt/i);
  });
});

describe('ProfileMenu: delete', () => {
  async function openDelete() {
    const { s, a } = await signedIn();
    const other = await add(s, 'Alex');
    seedProfile(other.id, { welcomeSeen: true, suburb: 'Fitzroy' });
    seedProfile(undefined, { welcomeSeen: true, suburb: 'Guestville' });
    return { s, a, other };
  }

  it('needs the exact name; a wrong name keeps the button disabled', async () => {
    const { s } = await openDelete();
    mount(s);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this profile and its data' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this profile?' });
    const input = within(dialog).getByLabelText('Type Sam to confirm');
    expect(input).toHaveFocus();
    const del = within(dialog).getByRole('button', { name: 'Delete profile' });
    expect(del).toBeDisabled();
    fireEvent.change(input, { target: { value: 'sam' } });
    expect(del).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Sa' } });
    expect(del).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Sam' } });
    expect(del).toBeEnabled();
  });

  it('Cancel and Escape close the dialog and return focus to the avatar button', async () => {
    const { s } = await openDelete();
    mount(s);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this profile and its data' }));
    fireEvent.keyDown(screen.getByLabelText('Type Sam to confirm'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(profileButton('Sam')).toHaveFocus();
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this profile and its data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(profileButton('Sam')).toHaveFocus();
  });

  it('removes only that profile, signs out, and leaves the other profile and the guest key', async () => {
    const { s, a, other } = await openDelete();
    mount(s);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this profile and its data' }));
    fireEvent.change(screen.getByLabelText('Type Sam to confirm'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back.' })).toBeInTheDocument();
    expect(localStorage.getItem(profileKey(a.id))).toBeNull();
    expect(localStorage.getItem(profileKey(other.id))).not.toBeNull();
    expect(localStorage.getItem(profileKey())).not.toBeNull();
    expect(service().list().map((x) => x.name)).toEqual(['Alex']);
    expect(screen.queryByRole('button', { name: 'Sign in as Sam' })).not.toBeInTheDocument();
  });

  it('deleting the last profile lands in the guest app', async () => {
    const { s } = await signedIn();
    mount(s);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this profile and its data' }));
    fireEvent.change(screen.getByLabelText('Type Sam to confirm'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Profile menu, guest' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /signed in as/ })).not.toBeInTheDocument();
  });

  it('keeps the dialog open and lists what could not be removed', async () => {
    const real = service();
    const a = await add(real, 'Sam');
    await real.signIn(a.id);
    seedProfile(a.id, { welcomeSeen: true });
    const failing = Object.create(real) as LocalAuthService;
    failing.remove = async () => ({ ok: false, reason: 'storage-error', remaining: ['data', 'account'] });
    mount(failing);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this profile and its data' }));
    fireEvent.change(screen.getByLabelText('Type Sam to confirm'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText(/could not be removed/i)).toBeInTheDocument());
    expect(within(dialog).getByText(/saved answers/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/profile entry/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

describe('ProfileMenu: delete that signs out but leaves data behind', () => {
  it('tells the person on the sign-in screen what could not be removed', async () => {
    const real = service();
    const a = await add(real, 'Sam');
    await add(real, 'Alex');
    await real.signIn(a.id);
    seedProfile(a.id, { welcomeSeen: true });
    const failing = Object.create(real) as LocalAuthService;
    failing.remove = async () => {
      real.signOut();
      return { ok: false, reason: 'storage-error', remaining: ['data'] };
    };
    mount(failing);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this profile and its data' }));
    fireEvent.change(screen.getByLabelText('Type Sam to confirm'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    expect(await screen.findByRole('heading', { level: 1, name: "Who's eating today?" })).toBeInTheDocument();
    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent(/could not be removed/i);
    expect(note).toHaveTextContent(/saved answers/i);
    fireEvent.click(within(note).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('ProfileMenu: guest', () => {
  it('names the button "guest" and offers Create a profile, which signs the new profile in', async () => {
    const s = service();
    mount(s);
    const btn = screen.getByRole('button', { name: 'Profile menu, guest' });
    fireEvent.click(btn);
    expect(screen.getByText("You're using Culinerity as a guest")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create a profile' }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Robin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create profile' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Profile menu, signed in as Robin' })).toBeInTheDocument());
  });

  it('offers the data choice when the guest has saved data', async () => {
    seedProfile(undefined, { welcomeSeen: true, score: 62, scoreTakenAt: '2026-10-01T00:00:00.000Z' });
    mount(service());
    fireEvent.click(screen.getByRole('button', { name: 'Profile menu, guest' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create a profile' }));
    expect(screen.getByRole('radio', { name: 'Start from my current data' })).toBeInTheDocument();
  });

  it('Cancel returns to the page', async () => {
    mount(service());
    fireEvent.click(screen.getByRole('button', { name: 'Profile menu, guest' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create a profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('Create a profile');
  });

  it('a guest with accounts present sees Sign in, which goes to the chooser', async () => {
    const s = service();
    await add(s, 'Sam');
    mount(s);
    fireEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Profile menu, guest' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back.' })).toBeInTheDocument();
  });
});

describe('Header outside an AuthProvider', () => {
  it('shows no profile button (existing App tests render without one)', () => {
    render(
      <ThemeProvider store={new InMemoryThemeStore()}>
        <ServicesProvider services={createServices()}>
          <App />
        </ServicesProvider>
      </ThemeProvider>,
    );
    expect(screen.queryByRole('button', { name: /Profile menu/ })).not.toBeInTheDocument();
  });
});
