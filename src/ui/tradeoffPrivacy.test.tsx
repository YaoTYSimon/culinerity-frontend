import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bandHeadline, budgetSummary, createCoreServices, createHttpServices, InMemoryProfileStore, rankNudge, scoreBand, shareText,
  TRADEOFF_LABELS, weekSummary, type FetchLike, type Profile, type SpendEntry, type TradeoffEntry,
} from '@culinerity/core';
import App from './../App';
import { LocalAuthService } from '../auth/LocalAuthService';
import { KEYS, profileKey } from '../auth/storageKeys';
import { ServicesProvider } from '../services/ServicesContext';
import { LocalProfileStore } from '../storage/localProfileStore';
import { SupportCard } from './SupportCard';

// Same method as foodPrivacy.test.tsx: spies installed before the flow, detectors proven live.
// If an assertion here fails, fix the code, not the test.

const NOW_ISO = '2026-10-28T02:00:00.000Z';
const clock = () => '2026-10-28T12:00:00';
const PROFILE_KEY = 'culinerity.profile.v1';

/** Made-up text nobody could type by accident: it must stay on the device. */
const NOTE_A = 'Zzquince first note';
const NOTE_B = 'Zzquince second note';
const SECRETS = [NOTE_A, NOTE_B, 'zzquince'];
/** The categories the flow picks: ids and the words the person sees. */
const CHOSEN_IDS = ['meal-skipped', 'cheaper-food'];
const CHOSEN_LABELS = [TRADEOFF_LABELS['meal-skipped'], TRADEOFF_LABELS['cheaper-food']];
const ALL_TRADEOFF_TEXT = [...SECRETS, ...CHOSEN_IDS, ...CHOSEN_LABELS];

const leaks = (text: string, needles: string[]) => needles.some((n) => text.toLowerCase().includes(n.toLowerCase()));
const dump = (s: Storage) => JSON.stringify(Object.fromEntries(Object.entries(s)));

/** Oldest first, the order the store keeps them in. */
const TRADEOFFS: TradeoffEntry[] = [
  { id: 't2', at: '2026-10-26T01:00:00.000Z', category: 'cheaper-food', note: NOTE_B },
  { id: 't1', at: '2026-10-27T01:00:00.000Z', category: 'meal-skipped', note: NOTE_A },
];
const WEEK = [{ itemId: 'a', name: 'Lentils', saving: 2.5, at: NOW_ISO }];
const SPEND: SpendEntry[] = [{ id: 's1', amount: 12.5, category: 'groceries', at: NOW_ISO }];
const BASE: Profile = { welcomeSeen: true, score: 40, weekSwaps: WEEK, spendEntries: SPEND, foodBudgetWeekly: 100, suburb: 'Carlton' };
const FULL_PROFILE: Profile = { ...BASE, tradeoffs: TRADEOFFS };

// ---- static guard ----------------------------------------------------------------------------

const ROOT = resolve(__dirname, '../..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const isSource = (p: string) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p);
const FORBIDDEN =
  /\bconsole\s*\.|\bNotification\b|serviceWorker|sendBeacon|navigator\s*\.\s*(share|clipboard)\b|\bfetch\b|XMLHttpRequest|WebSocket|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\s*\.\s*cookie|\bhistory\s*\.\s*(push|replace)State\b|\bnavigator\s*\[|\b(window|globalThis|self)\s*\[|\beval\s*\(|\bnew\s+Function\b/;
const FILES = [
  ...['TradeoffsView', 'AddTradeoff', 'SupportCard'].map((n) => join(ROOT, 'src/ui', `${n}.tsx`)),
  join(ROOT, 'src/ui/tradeoffCopy.ts'),
  ...walk(join(ROOT, 'packages/core/src/tradeoffs')),
].filter(isSource);

describe('detectors are live (not circular)', () => {
  it('the scanner flags the forbidden APIs', () => {
    for (const bad of [
      'console.log(x)', 'new Notification("a")', 'navigator.serviceWorker.register(u)', 'navigator.sendBeacon(u, d)',
      'navigator.share({ text })', 'navigator.clipboard.writeText(t)', 'await fetch(u)', 'new XMLHttpRequest()',
      'localStorage.setItem(a, b)', 'sessionStorage.getItem(a)', 'indexedDB.open(a)', 'document.cookie = x',
      'history.pushState(null, "", u)', "window['fetch'](u)", 'eval("x")',
    ]) expect(FORBIDDEN.test(bad), bad).toBe(true);
    expect(FORBIDDEN.test('const quiet = 1; navigator.geolocation')).toBe(false);
  });
  it('the leak check finds a note, a category id and a label', () => {
    expect(leaks(`GET /api/swaps/x?q=${NOTE_A}`, ALL_TRADEOFF_TEXT)).toBe(true);
    expect(leaks('{"category":"meal-skipped"}', ALL_TRADEOFF_TEXT)).toBe(true);
    expect(leaks(`Added: ${CHOSEN_LABELS[0]}`, ALL_TRADEOFF_TEXT)).toBe(true);
    expect(leaks('GET /api/prices/smash-burger', ALL_TRADEOFF_TEXT)).toBe(false);
  });
  it('the storage dump finds a stored note', () => {
    localStorage.setItem('oops', NOTE_A);
    expect(leaks(dump(localStorage), SECRETS)).toBe(true);
    localStorage.clear();
    expect(leaks(dump(localStorage), SECRETS)).toBe(false);
  });
});

describe('(d) static guard: no console, network, storage, notification, share or history code', () => {
  it('scans the real files', () => {
    const rel = FILES.map((f) => f.slice(ROOT.length + 1));
    expect(rel).toEqual(expect.arrayContaining([
      'src/ui/TradeoffsView.tsx', 'src/ui/AddTradeoff.tsx', 'src/ui/SupportCard.tsx', 'src/ui/tradeoffCopy.ts',
      'packages/core/src/tradeoffs/entries.ts', 'packages/core/src/tradeoffs/support.ts',
    ]));
  });
  it.each(FILES.map((f) => [f.slice(ROOT.length + 1), f]))('%s has none of those', (_n, f) => {
    expect(readFileSync(f, 'utf8').match(FORBIDDEN)?.[0]).toBeUndefined();
  });
});

// ---- (a) share text, score, band and budget ---------------------------------------------------

describe('(a) share text, score, band and budget', () => {
  it('shareText and week share hold no trade-off string for a full profile', () => {
    const text = shareText(weekSummary(FULL_PROFILE.weekSwaps ?? [], NOW_ISO));
    expect(text).toBe('Lentils: $2.50\nSaved in the last 7 days: $2.50\nMade with Culinerity');
    expect(leaks(text, ALL_TRADEOFF_TEXT)).toBe(false);
  });

  it('the builders leak when the data does (self-check)', () => {
    const summary = weekSummary([{ itemId: 'x', name: NOTE_A, saving: 1, at: NOW_ISO }], NOW_ISO);
    expect(leaks(shareText(summary), SECRETS)).toBe(true);
  });

  it('score, band and budget output identical with and without tradeoffs', async () => {
    const now = new Date(NOW_ISO);
    for (const p of [BASE, FULL_PROFILE]) {
      expect(scoreBand(p.score ?? 0)).toBe(scoreBand(40));
      expect(bandHeadline(p.score ?? 0)).toBe(bandHeadline(40));
      expect(rankNudge(p.score ?? 0)).toBe(rankNudge(40));
      expect(budgetSummary(p.spendEntries, p.foodBudgetWeekly, now)).toEqual(budgetSummary(SPEND, 100, now));
    }
    const run = async (profile: Profile, item: string) => {
      render(<ServicesProvider services={createCoreServices(new InMemoryProfileStore(profile))}><App now={clock} /></ServicesProvider>);
      const home = document.body.textContent;
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      fireEvent.click(screen.getByRole('button', { name: item }));
      await screen.findByRole('heading', { level: 1 }); // lazy views: wait for the real view, not the fallback
      const view = document.body.textContent;
      cleanup();
      return [home, view];
    };
    for (const item of ['Budget', 'My week', 'Swaps']) {
      const full = await run(FULL_PROFILE, item);
      expect(full).toEqual(await run(BASE, item));
    }
  });

  it('the Share button on My week sends exactly the builder text', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<ServicesProvider services={createCoreServices(new InMemoryProfileStore(FULL_PROFILE))}><App now={() => NOW_ISO} /></ServicesProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'My week' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].text).toBe(shareText(weekSummary(WEEK, NOW_ISO)));
    expect(leaks(JSON.stringify(share.mock.calls[0][0]), ALL_TRADEOFF_TEXT)).toBe(false);
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
});

// ---- (b) (c) (f) full flow with every channel spied before it starts --------------------------

describe('full flow: log, note, remove, undo, clear, support card', () => {
  const calls: Array<[string, RequestInit | undefined]> = [];
  const mock = createCoreServices(new InMemoryProfileStore());
  const allIds = [...new Set(mock.catalogue.allCravings().flatMap((c) => [c.id, ...mock.catalogue.swapsFor(c.id).map((s) => s.alternative.id)]))];
  const stubFetch: FetchLike = async (url, init) => {
    calls.push([url, init as RequestInit | undefined]);
    return { ok: true, status: 200, json: async () => [] };
  };

  let directFetch: ReturnType<typeof vi.spyOn>;
  let xhrOpen: ReturnType<typeof vi.spyOn>;
  let setItem: ReturnType<typeof vi.spyOn>;
  let pushState: ReturnType<typeof vi.spyOn>;
  let replaceState: ReturnType<typeof vi.spyOn>;
  let beacon: ReturnType<typeof vi.fn>;
  let socket: ReturnType<typeof vi.fn>;
  let imageCtor: ReturnType<typeof vi.fn>;
  let notification: ReturnType<typeof vi.fn>;
  let swRegister: ReturnType<typeof vi.fn>;
  let share: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;
  let idbOpen: ReturnType<typeof vi.fn>;
  let consoles: ReturnType<typeof vi.spyOn>[];
  const real = { Image: globalThis.Image, WebSocket: globalThis.WebSocket, Notification: (globalThis as any).Notification, indexedDB: (globalThis as any).indexedDB };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    calls.length = 0;
    directFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no direct fetch'));
    xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItem = vi.spyOn(Storage.prototype, 'setItem');
    pushState = vi.spyOn(history, 'pushState');
    replaceState = vi.spyOn(history, 'replaceState');
    beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    socket = vi.fn();
    globalThis.WebSocket = socket as unknown as typeof WebSocket;
    imageCtor = vi.fn();
    globalThis.Image = imageCtor as unknown as typeof Image;
    notification = vi.fn();
    (globalThis as any).Notification = notification;
    swRegister = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', { value: { register: swRegister }, configurable: true });
    share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    idbOpen = vi.fn();
    (globalThis as any).indexedDB = { open: idbOpen, databases: vi.fn().mockResolvedValue([]), deleteDatabase: vi.fn() };
    consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  });
  afterEach(() => {
    cleanup();
    for (const s of [directFetch, xhrOpen, setItem, pushState, replaceState, ...consoles]) s.mockRestore();
    for (const k of ['sendBeacon', 'serviceWorker', 'share', 'clipboard']) Object.defineProperty(navigator, k, { value: undefined, configurable: true });
    globalThis.Image = real.Image;
    globalThis.WebSocket = real.WebSocket;
    (globalThis as any).Notification = real.Notification;
    (globalThis as any).indexedDB = real.indexedDB;
    localStorage.clear();
  });

  const stored = () => JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}');
  const status = () => screen.getByRole('status');
  const pick = (label: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Add a trade-off' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Add a trade-off' })).getByRole('button', { name: label }));
  };
  const addNote = (text: string) => {
    fireEvent.click(within(status()).getByRole('button', { name: 'Add a note' }));
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
  };

  /** Everything a snapshot of the page, URL and storage could leak, taken between steps. */
  const surfaces = () => {
    const dataAttrs = [...document.querySelectorAll('*')].flatMap((el) =>
      [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${a.value}`));
    return { title: document.title, href: location.href, dataAttrs: dataAttrs.join('\n') };
  };
  const checkSurfaces = (step: string) => {
    const s = surfaces();
    expect(leaks(s.title, ALL_TRADEOFF_TEXT), `${step}: document.title`).toBe(false);
    expect(leaks(decodeURIComponent(s.href), ALL_TRADEOFF_TEXT), `${step}: location`).toBe(false);
    expect(leaks(s.dataAttrs, ALL_TRADEOFF_TEXT), `${step}: data- attributes`).toBe(false);
    expect(Object.keys(localStorage), `${step}: localStorage keys`).toEqual([PROFILE_KEY]);
    expect(sessionStorage.length, `${step}: sessionStorage`).toBe(0);
    expect(document.cookie, `${step}: cookie`).toBe('');
  };

  async function runFlow() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ welcomeSeen: true }));
    const services = await createHttpServices(new LocalProfileStore(), stubFetch);
    render(<ServicesProvider services={services}><App now={clock} /></ServicesProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trade-offs' }));
    await screen.findByRole('heading', { level: 1, name: 'What we went without' });

    pick(TRADEOFF_LABELS['meal-skipped']);
    screen.getByRole('heading', { name: 'If it would help' }); // the support card is on screen
    checkSurfaces('after add');
    addNote(NOTE_A);
    expect(stored().tradeoffs[0].note).toBe(NOTE_A);
    checkSurfaces('after note');

    pick(TRADEOFF_LABELS['cheaper-food']);
    addNote(NOTE_B);
    expect(stored().tradeoffs).toHaveLength(2);
    checkSurfaces('after second');

    fireEvent.click(screen.getAllByRole('button', { name: /^Remove/ })[0]);
    expect(stored().tradeoffs).toHaveLength(1);
    fireEvent.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(stored().tradeoffs).toHaveLength(2);
    checkSurfaces('after remove and undo');

    fireEvent.click(screen.getByRole('button', { name: 'Clear all my trade-offs' }));
    expect(stored()).not.toHaveProperty('tradeoffs');
    checkSurfaces('after clear');
    fireEvent.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(stored().tradeoffs).toHaveLength(2);
    pick(TRADEOFF_LABELS['meal-skipped']);
    fireEvent.click(screen.getAllByRole('button', { name: 'See food support places' })[0]);
    checkSurfaces('after support places');
  }

  it('the spies are live (a deliberate call shows up on each)', async () => {
    await fetch('/x').catch(() => {});
    new XMLHttpRequest().open('GET', '/x');
    navigator.sendBeacon('/x', 'd');
    new WebSocket('ws://x');
    new Image();
    new (globalThis as any).Notification('a');
    await navigator.serviceWorker.register('/sw.js');
    await navigator.share({ text: 'x' });
    await navigator.clipboard.writeText('x');
    (globalThis as any).indexedDB.open('x');
    localStorage.setItem('x', 'y');
    history.pushState(null, '', '/');
    history.replaceState(null, '', '/');
    console.log('x');
    for (const spy of [directFetch, xhrOpen, beacon, socket, imageCtor, notification, swRegister, share, writeText, idbOpen, setItem, pushState, replaceState, consoles[0]]) {
      expect(spy).toHaveBeenCalled();
    }
  });

  it('full flow with HTTP services makes no request containing a note, category id or label', async () => {
    await runFlow();
    expect(calls.length).toBeGreaterThan(0);
    const allowed = new Set(['/api/cravings/all', '/api/cravings/popular', '/api/food-info', ...allIds.flatMap((i) => [`/api/swaps/${i}`, `/api/prices/${i}`, `/api/nutrition/${i}`])]);
    for (const [url, init] of calls) {
      expect(allowed.has(url) || /^\/api\/support(\?|$)/.test(url), `unexpected request ${url}`).toBe(true);
      expect(leaks(decodeURIComponent(url), ALL_TRADEOFF_TEXT), url).toBe(false);
      expect(init?.body, url).toBeUndefined();
      expect(leaks(JSON.stringify(init ?? {}), ALL_TRADEOFF_TEXT), `${url} init`).toBe(false);
    }
    expect(directFetch).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
  });

  it('only the profile key changes (localStorage keys, sessionStorage, cookies, IndexedDB)', async () => {
    await runFlow();
    expect(Object.keys(localStorage)).toEqual([PROFILE_KEY]);
    expect(setItem.mock.calls.every((call: unknown[]) => call[0] === PROFILE_KEY)).toBe(true);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
    expect(idbOpen).not.toHaveBeenCalled();
  });

  it('no navigator.share, clipboard, sendBeacon, Notification or history.pushState calls', async () => {
    await runFlow();
    expect(beacon).not.toHaveBeenCalled();
    expect(socket).not.toHaveBeenCalled();
    expect(imageCtor).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
    expect(swRegister).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(consoles.every((c) => c.mock.calls.length === 0)).toBe(true);
  });

  it('no trade-off text in document.title, location or any data- attribute (the check is live)', () => {
    document.title = NOTE_A;
    history.replaceState(null, '', `/?q=${encodeURIComponent(NOTE_B)}`);
    const el = document.createElement('div');
    el.setAttribute('data-x', CHOSEN_IDS[0]);
    document.body.append(el);
    const s = surfaces();
    expect(leaks(s.title, ALL_TRADEOFF_TEXT)).toBe(true);
    expect(leaks(decodeURIComponent(s.href), ALL_TRADEOFF_TEXT)).toBe(true);
    expect(leaks(s.dataAttrs, ALL_TRADEOFF_TEXT)).toBe(true);
    el.remove();
    document.title = '';
    history.replaceState(null, '', '/');
  });

  it('the support card writes nothing and fetches nothing, on show, on its buttons and on close', () => {
    for (const category of ['meal-skipped', 'child-meal', 'bill-delayed', 'health-skipped'] as const) {
      const onOpenSupport = vi.fn();
      const onClose = vi.fn();
      render(<SupportCard category={category} onOpenSupport={onOpenSupport} onClose={onClose} />);
      const place = screen.queryByRole('button', { name: 'See food support places' });
      if (place) fireEvent.click(place);
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledTimes(1);
      cleanup();
    }
    expect(setItem).not.toHaveBeenCalled();
    expect(directFetch).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
    expect(consoles.every((c) => c.mock.calls.length === 0)).toBe(true);
  });
});

// ---- (e) clear, profile delete and "Start from my current data" --------------------------------

describe('(e) clear, delete and migrate', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('Clear removes the key from the stored JSON and leaves the rest', async () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(FULL_PROFILE));
    render(<ServicesProvider services={createCoreServices(new LocalProfileStore())}><App now={clock} /></ServicesProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trade-offs' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all my trade-offs' }));
    const raw = localStorage.getItem(PROFILE_KEY) ?? '';
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['foodBudgetWeekly', 'score', 'spendEntries', 'suburb', 'weekSwaps', 'welcomeSeen']);
    expect(leaks(raw, SECRETS)).toBe(false);
  });

  it('"Start from my current data" carries it; starting fresh leaves it in the guest profile', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL_PROFILE));
    const svc = new LocalAuthService();
    const r = await svc.create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    if (!r.ok) throw new Error('create failed');
    expect(JSON.parse(localStorage.getItem(profileKey(r.account.id)) ?? '{}')).toMatchObject({ tradeoffs: TRADEOFFS });
    expect(new LocalProfileStore(`.${r.account.id}`).load().tradeoffs).toEqual(TRADEOFFS);
    expect(localStorage.getItem(KEYS.guestProfile)).toBeNull();

    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL_PROFILE));
    const fresh = await svc.create({ name: 'Alex', colour: 'sand', migrateGuestData: false });
    if (!fresh.ok) throw new Error('create failed');
    expect(JSON.parse(localStorage.getItem(profileKey(fresh.account.id)) ?? '{}')).toEqual({ welcomeSeen: true });
    expect(JSON.parse(localStorage.getItem(KEYS.guestProfile) ?? '{}')).toMatchObject({ tradeoffs: TRADEOFFS });
  });

  it('deleting a profile removes its key, and with it the trade-offs', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL_PROFILE));
    const svc = new LocalAuthService();
    const r = await svc.create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    if (!r.ok) throw new Error('create failed');
    expect(leaks(dump(localStorage), [NOTE_A])).toBe(true); // the self-check: it is there before delete
    expect((await svc.remove(r.account.id, 'Sam')).ok).toBe(true);
    expect(localStorage.getItem(profileKey(r.account.id))).toBeNull();
    expect(leaks(dump(localStorage) + dump(sessionStorage), SECRETS)).toBe(false);
  });
});
