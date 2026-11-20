import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoreServices, shareText, weekSummary } from '@culinerity/core';
import App from './../App';
import { AuthProvider } from '../auth/AuthProvider';
import { Gate } from '../auth/Gate';
import { LocalAuthService } from '../auth/LocalAuthService';
import { KEYS, profileKey } from '../auth/storageKeys';
import { useAuth, type AuthState } from '../auth/useAuth';
import { ServicesProvider } from '../services/ServicesContext';
import { LocalProfileStore } from '../storage/localProfileStore';
import { LocalThemeStore } from '../storage/localThemeStore';
import { ThemeProvider } from '../theme/ThemeProvider';

// ---- shared helpers -------------------------------------------------------------------------

const NOW_ISO = '2026-10-28T02:00:00.000Z';
const clock = () => '2026-10-28T12:00:00';
const PROFILE_KEY = 'culinerity.profile.v1';

/** Made-up text nobody could type by accident: it must stay on the device. */
const MARKER = 'Zzquince pantry jam';
const SECRETS = [MARKER, 'zzquince'];
const WEEK = [{ itemId: 'a', name: 'Lentils', saving: 2.5, at: NOW_ISO }];
/** Pantry words the flow adds; none may appear in anything that leaves the screen. */
const PANTRY_WORDS = ['chickpeas', 'tomatoes', 'chickpea and tomato stew', 'shopping list'];

const leaks = (text: string, needles: string[]) => needles.some((n) => text.toLowerCase().includes(n.toLowerCase()));

// ---- static guard on the new files ----------------------------------------------------------

const ROOT = resolve(__dirname, '../..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const isSource = (p: string) => /\.tsx?$/.test(p) && !/\.(test|testutil)\.tsx?$/.test(p) && !p.includes('/generated/');
const FORBIDDEN =
  /\bconsole\s*\.|\bNotification\b|serviceWorker|sendBeacon|navigator\s*\.\s*(share|clipboard)\b|\bfetch\b|XMLHttpRequest|WebSocket|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\s*\.\s*(cookie|title)|\blocation\s*\.|\bnavigator\s*\[|\b(window|globalThis|self)\s*\[|\beval\s*\(|\bnew\s+Function\b/;
const UI = ['PantryView', 'PantryAdd', 'PantryList', 'ShoppingList', 'CookView', 'RecipeRow', 'RecipePage', 'ServesStepper', 'UndoStatus', 'FoodFitNotes'].map((n) => join(ROOT, 'src/ui', `${n}.tsx`));
const NEW_FILES = [
  ...UI,
  ...['cookNotes', 'pantryCopy', 'pantryProfile'].map((n) => join(ROOT, 'src/ui', `${n}.ts`)),
  ...walk(join(ROOT, 'packages/core/src/pantry')),
  ...walk(join(ROOT, 'packages/core/src/recipes')),
].filter(isSource);

describe('detectors are live (not circular)', () => {
  it('the scanner flags the forbidden APIs', () => {
    for (const bad of [
      'console.log(x)', 'new Notification("a")', 'navigator.sendBeacon(u, d)', 'navigator.share({ text })', 'navigator.clipboard.writeText(t)',
      'await fetch(u)', 'new XMLHttpRequest()', 'localStorage.setItem(a, b)', 'document.title = x', 'location.href = u', "window['fetch'](u)",
    ]) expect(FORBIDDEN.test(bad), bad).toBe(true);
    expect(FORBIDDEN.test('const quiet = 1; navigator.geolocation')).toBe(false);
  });
  it('the leak check finds the marker', () => {
    expect(leaks(`GET /api/x?q=${MARKER}`, SECRETS)).toBe(true);
    expect(leaks('GET /api/prices/smash-burger', SECRETS)).toBe(false);
  });
});

describe('static guard on the pantry and recipe files', () => {
  it('scans the real files', () => {
    const rel = NEW_FILES.map((f) => f.slice(ROOT.length + 1));
    expect(rel).toEqual(expect.arrayContaining(['src/ui/CookView.tsx', 'src/ui/RecipePage.tsx', 'src/ui/ShoppingList.tsx', 'src/ui/PantryView.tsx', 'packages/core/src/pantry/match.ts']));
  });
  it.each(NEW_FILES.map((f) => [f.slice(ROOT.length + 1), f]))('%s has no console, network, storage, share, title or location code', (_n, f) => {
    expect(readFileSync(f, 'utf8').match(FORBIDDEN)?.[0]).toBeUndefined();
  });
});

// ---- a full flow with every channel spied before it starts -----------------------------------

describe('full flow: add, cook, add to list, share the week', () => {
  /** Everything any spied channel was handed, as text. */
  let sent: string[] = [];
  const record = (channel: string, ...args: unknown[]) => {
    sent.push(`${channel} ${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`);
  };
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrOpen: ReturnType<typeof vi.spyOn>;
  let setItem: ReturnType<typeof vi.spyOn>;
  let consoles: ReturnType<typeof vi.spyOn>[];
  let share: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;
  let beacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sent = [];
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (...a: unknown[]) => { record('fetch', ...a); return new Response('{}'); });
    xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation((...a: unknown[]) => void record('xhr', ...a));
    beacon = vi.fn((...a: unknown[]) => { record('beacon', ...a); return true; });
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    share = vi.fn(async (...a: unknown[]) => void record('share', ...a));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    writeText = vi.fn(async (...a: unknown[]) => void record('clipboard', ...a));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    setItem = vi.spyOn(Storage.prototype, 'setItem');
    consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void record(`console.${m}`, ...a)));
  });
  afterEach(() => {
    cleanup();
    fetchSpy.mockRestore();
    xhrOpen.mockRestore();
    setItem.mockRestore();
    consoles.forEach((c) => c.mockRestore());
    for (const k of ['sendBeacon', 'share', 'clipboard']) Object.defineProperty(navigator, k, { value: undefined, configurable: true });
    localStorage.clear();
    document.title = '';
    history.replaceState(null, '', '/');
  });

  const surfaces = () => {
    const dataAttrs = [...document.querySelectorAll('*')].flatMap((el) => [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${a.value}`));
    return { title: document.title, href: decodeURIComponent(location.href), dataAttrs: dataAttrs.join('\n') };
  };
  const checkSurfaces = (step: string) => {
    const s = surfaces();
    expect(leaks(s.title, [...SECRETS, ...PANTRY_WORDS]), `${step}: document.title`).toBe(false);
    expect(leaks(s.href, [...SECRETS, ...PANTRY_WORDS]), `${step}: location`).toBe(false);
    expect(leaks(s.dataAttrs, SECRETS), `${step}: data- attributes`).toBe(false);
    expect(sessionStorage.length, `${step}: sessionStorage`).toBe(0);
    expect(document.cookie, `${step}: cookie`).toBe('');
  };
  // Views load lazily: wait for the new view's h1 (the old view is hidden while the fallback shows).
  const openMenu = async (item: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: item }));
    await screen.findByRole('heading', { level: 1 });
  };
  const addByName = (text: string) => {
    const field = screen.getByRole('combobox', { name: 'Add something you have' });
    fireEvent.change(field, { target: { value: text } });
    fireEvent.keyDown(field, { key: 'Enter' });
  };

  async function runFlow() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ welcomeSeen: true, weekSwaps: WEEK }));
    setItem.mockClear();
    render(<ServicesProvider services={createCoreServices(new LocalProfileStore())}><App now={clock} /></ServicesProvider>);

    // add items, one of them free text with the marker
    await openMenu('My pantry');
    addByName('chickpeas');
    addByName('onion');
    addByName('garlic');
    addByName('cumin');
    addByName('canola oil');
    fireEvent.change(screen.getByRole('combobox', { name: 'Add something you have' }), { target: { value: MARKER } });
    fireEvent.click(screen.getByRole('button', { name: `Add "${MARKER}" anyway` }));
    expect(screen.getByText(MARKER, { selector: 'span.block' })).toBeInTheDocument();
    checkSurfaces('after add');

    // open a recipe and add what is missing to the list
    await openMenu('Cook with what you have');
    fireEvent.click(screen.getByRole('button', { name: 'Chickpea and tomato stew' }));
    checkSurfaces('recipe page');
    fireEvent.click(screen.getByRole('button', { name: 'Add missing to my shopping list' }));
    checkSurfaces('after add to list');
    fireEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

    // share the week
    await openMenu('My week');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share' })); });
    checkSurfaces('after share');
  }

  it('the spies are live (a deliberate call shows up on each)', async () => {
    await fetch(`/x?q=${MARKER}`);
    new XMLHttpRequest().open('GET', `/x?q=${MARKER}`);
    navigator.sendBeacon('/x', MARKER);
    await navigator.share({ text: MARKER });
    await navigator.clipboard.writeText(MARKER);
    console.log(MARKER);
    console.error(MARKER);
    localStorage.setItem('other-key', MARKER);
    for (const spy of [fetchSpy, xhrOpen, beacon, share, writeText, consoles[0], consoles[3], setItem]) expect(spy).toHaveBeenCalled();
    // Each channel's record carries the marker, so a real leak would be seen.
    for (const channel of ['fetch', 'xhr', 'beacon', 'share', 'clipboard', 'console.log', 'console.error']) {
      expect(leaks(sent.filter((s) => s.startsWith(channel)).join('\n'), SECRETS), channel).toBe(true);
    }
    document.title = MARKER;
    history.replaceState(null, '', `/?q=${encodeURIComponent(MARKER)}`);
    const el = document.createElement('div');
    el.setAttribute('data-x', MARKER);
    document.body.append(el);
    const s = surfaces();
    expect(leaks(s.title, SECRETS)).toBe(true);
    expect(leaks(s.href, SECRETS)).toBe(true);
    expect(leaks(s.dataAttrs, SECRETS)).toBe(true);
    el.remove();
  });

  it('sends nothing anywhere: no request, beacon, share, clipboard write or console output with pantry text', async () => {
    await runFlow();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(consoles.every((c) => c.mock.calls.length === 0)).toBe(true);
    expect(leaks(sent.join('\n'), [...SECRETS, ...PANTRY_WORDS])).toBe(false);
  });

  it('writes only the profile key, and the pantry text lives in it (and nowhere else)', async () => {
    await runFlow();
    const keys = new Set(setItem.mock.calls.map((c: unknown[]) => c[0] as string));
    expect([...keys]).toEqual([PROFILE_KEY]);
    expect(Object.keys(localStorage)).toEqual([PROFILE_KEY]);
    // Proof of life: the marker really is in the stored profile, and the list too.
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}');
    expect(JSON.stringify(stored.pantry)).toContain(MARKER);
    expect(stored.shoppingList).toHaveLength(1);
    expect(sessionStorage.length).toBe(0);
  });

  it('the week share text holds exactly the swaps and none of the pantry', async () => {
    await runFlow();
    expect(share).toHaveBeenCalledTimes(1);
    const text = share.mock.calls[0][0].text as string;
    expect(text).toBe(shareText(weekSummary(WEEK, NOW_ISO)));
    expect(leaks(JSON.stringify(share.mock.calls[0][0]), [...SECRETS, ...PANTRY_WORDS, 'garlic', 'onion'])).toBe(false);
  });

  it('Clear my pantry and Clear list remove the pantry text from storage', async () => {
    await runFlow();
    await openMenu('My pantry');
    fireEvent.click(screen.getByRole('button', { name: 'Clear list' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear my pantry' }));
    expect(leaks(localStorage.getItem(PROFILE_KEY) ?? '', SECRETS)).toBe(false);
    const after = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}');
    expect(after).not.toHaveProperty('shoppingList');
    expect(after).not.toHaveProperty('pantry');
  });
});

// ---- switching profiles ----------------------------------------------------------------------

describe('switching profiles never shows the other pantry', () => {
  let auth!: AuthState;
  function Probe() {
    auth = useAuth();
    return null;
  }
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => localStorage.clear());

  const seed = (id: string, name: string, pantryName?: string) => {
    const all = JSON.parse(localStorage.getItem(KEYS.accounts) ?? '[]');
    localStorage.setItem(KEYS.accounts, JSON.stringify([...all, { id, name, colour: 'sand', createdAt: '2026-10-01T00:00:00.000Z' }]));
    const pantry = pantryName ? { items: [{ id: 'x1', name: pantryName, addedAt: NOW_ISO }], staples: [], serves: 2 } : undefined;
    localStorage.setItem(profileKey(id), JSON.stringify({ welcomeSeen: true, ...(pantry ? { pantry } : {}) }));
  };

  it('shows each profile its own pantry and nothing from the previous one, in the page or the storage it reads', async () => {
    seed('aaa', 'Sam', MARKER);
    seed('bbb', 'Alex');
    render(
      <ThemeProvider store={new LocalThemeStore()}>
        <AuthProvider service={new LocalAuthService()}>
          <Probe />
          <Gate useBackend={false}><App /></Gate>
        </AuthProvider>
      </ThemeProvider>,
    );
    await act(async () => void (await auth.signIn('aaa')));
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'My pantry' }));
    expect(await screen.findByText(MARKER, { selector: 'span.block' })).toBeInTheDocument();

    act(() => auth.lock());
    expect(document.body.textContent).not.toContain(MARKER);
    await act(async () => void (await auth.signIn('bbb')));
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'My pantry' }));
    expect(screen.getByRole('heading', { level: 1, name: 'My pantry' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(MARKER);
    expect(within(screen.getByRole('main')).queryByText(/Zzquince/i)).not.toBeInTheDocument();
    // The other profile's key is untouched and still holds the pantry; this one holds none.
    expect(localStorage.getItem(profileKey('aaa'))).toContain(MARKER);
    expect(localStorage.getItem(profileKey('bbb')) ?? '').not.toContain(MARKER);
  });
});
