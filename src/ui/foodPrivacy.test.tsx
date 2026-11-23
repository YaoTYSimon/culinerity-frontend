import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCoreServices,
  createHttpServices,
  InMemoryProfileStore,
  shareText,
  weekSummary,
  type CulturalMeal,
  type FetchLike,
  type FoodProfile,
  type Profile,
} from '@culinerity/core';
import App from './../App';
import { LocalAuthService } from '../auth/LocalAuthService';
import { KEYS, profileKey } from '../auth/storageKeys';
import { ServicesProvider } from '../services/ServicesContext';
import { LocalProfileStore } from '../storage/localProfileStore';
import { pickMenuItem } from '../test/menu';

// ---- shared helpers -------------------------------------------------------------------------

const NOW_ISO = '2026-10-28T02:00:00.000Z'; // Wed 28 Oct 2026, Melbourne morning
const clock = () => '2026-10-28T12:00:00';
const PROFILE_KEY = 'culinerity.profile.v1';

/** Made-up text nobody could type by accident: every one of these must stay on the device. */
const TRADITION_TEXT = 'Zzquince home cooking';
const ALLERGY_TEXT = 'Zzquince allergy';
const DISH_TEXT = 'Zzquince dish';
const SECRETS = [TRADITION_TEXT, ALLERGY_TEXT, DISH_TEXT, 'zzquince'];
/** The ids behind the pills the flow picks. */
const CHOSEN_IDS = ['halal', 'diwali'];

/** True when any needle appears in the text (case-insensitive). The self-checks below prove it can fail. */
const leaks = (text: string, needles: string[]) => needles.some((n) => text.toLowerCase().includes(n.toLowerCase()));
const dump = (s: Storage) => JSON.stringify(Object.fromEntries(Object.entries(s)));

const FULL_FOOD: FoodProfile = {
  traditions: ['greek', TRADITION_TEXT],
  rules: ['halal', 'noPork'],
  allergies: ['Peanuts', ALLERGY_TEXT],
  occasions: ['ramadan', 'diwali'],
  dismissed: ['ramadan-2027'],
};
const FULL_MEALS: CulturalMeal[] = [
  { id: 'm2', at: '2026-10-26T01:00:00.000Z', tradition: 'greek', dish: 'Zzquince moussaka' },
  { id: 'm1', at: '2026-10-27T01:00:00.000Z', tradition: TRADITION_TEXT, dish: DISH_TEXT, with: 'family' },
];
const WEEK = [{ itemId: 'a', name: 'Lentils', saving: 2.5, at: NOW_ISO }];
const FULL_PROFILE: Profile = { welcomeSeen: true, score: 40, weekSwaps: WEEK, foodProfile: FULL_FOOD, culturalMeals: FULL_MEALS };

// ---- (d) static guard: the new files hold no network, storage, console or notification code ---

const ROOT = resolve(__dirname, '../..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const isSource = (p: string) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) && !p.includes('/generated/');
const FORBIDDEN =
  /\bconsole\s*\.|\bNotification\b|serviceWorker|sendBeacon|navigator\s*\.\s*share\b|\bfetch\b|XMLHttpRequest|WebSocket|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\s*\.\s*cookie|\bnavigator\s*\[|\b(window|globalThis|self)\s*\[|\beval\s*\(|\bnew\s+Function\b/;
const NEW_FILES = [
  ...['MyFood', 'FoodSteps', 'FoodSections', 'FoodSummary', 'TagInput', 'StepProgress', 'MealsView', 'AddMeal', 'WeekRing', 'OccasionLine', 'ComingUp'].map((n) => join(ROOT, 'src/ui', `${n}.tsx`)),
  join(ROOT, 'src/ui/foodCopy.ts'),
  ...walk(join(ROOT, 'packages/core/src/food')),
  ...walk(join(ROOT, 'packages/core/src/cultural')),
].filter(isSource);

describe('detectors are live (not circular)', () => {
  it('the scanner flags the forbidden APIs', () => {
    for (const bad of [
      'console.log(x)', 'new Notification("a")', 'navigator.serviceWorker.register(u)', 'navigator.sendBeacon(u, d)',
      'navigator.share({ text })', 'await fetch(u)', 'new XMLHttpRequest()', 'localStorage.setItem(a, b)',
      'sessionStorage.getItem(a)', 'indexedDB.open(a)', 'document.cookie = x', "window['fetch'](u)", 'eval("x")',
    ]) expect(FORBIDDEN.test(bad), bad).toBe(true);
    expect(FORBIDDEN.test('const quiet = 1; navigator.geolocation')).toBe(false);
  });
  it('the leak check finds a chosen string and the rule ids', () => {
    expect(leaks(`GET /api/swaps/x?q=${DISH_TEXT}`, SECRETS)).toBe(true);
    expect(leaks('{"rules":["halal"]}', CHOSEN_IDS)).toBe(true);
    expect(leaks('GET /api/prices/smash-burger', [...SECRETS, ...CHOSEN_IDS])).toBe(false);
  });
});

describe('(d) static guard on the new files', () => {
  it('scans the real files', () => {
    const rel = NEW_FILES.map((f) => f.slice(ROOT.length + 1));
    expect(rel).toEqual(expect.arrayContaining([
      'src/ui/MyFood.tsx', 'src/ui/MealsView.tsx', 'src/ui/OccasionLine.tsx', 'src/ui/ComingUp.tsx',
      'packages/core/src/food/rules.ts', 'packages/core/src/food/meals.ts', 'packages/core/src/food/occasions.ts',
    ]));
  });
  it.each(NEW_FILES.map((f) => [f.slice(ROOT.length + 1), f]))('%s has no console, network, storage, notification or share code', (_n, f) => {
    expect(readFileSync(f, 'utf8').match(FORBIDDEN)?.[0]).toBeUndefined();
  });
});

// ---- (a) share text -------------------------------------------------------------------------

describe('(a) share text', () => {
  it('the builders leak when the data does (self-check)', () => {
    const summary = weekSummary([{ itemId: 'x', name: DISH_TEXT, saving: 1, at: NOW_ISO }], NOW_ISO);
    expect(leaks(shareText(summary), SECRETS)).toBe(true);
  });

  it('shareText for a profile with every field set holds no food string', () => {
    const text = shareText(weekSummary(FULL_PROFILE.weekSwaps ?? [], NOW_ISO));
    expect(text).toBe('Lentils: $2.50\nSaved in the last 7 days: $2.50\nMade with Culinerity');
    expect(leaks(text, [...SECRETS, ...CHOSEN_IDS, 'greek', 'halal', 'peanut', 'moussaka'])).toBe(false);
  });

  it('the Share button on My week sends exactly the builder text, with no food string', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const services = { ...createCoreServices(new InMemoryProfileStore(FULL_PROFILE)) };
    render(<ServicesProvider services={services}><App now={() => NOW_ISO} /></ServicesProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    pickMenuItem('My week');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share' })); });
    expect(share).toHaveBeenCalledTimes(1);
    const text = share.mock.calls[0][0].text as string;
    expect(text).toBe(shareText(weekSummary(WEEK, NOW_ISO)));
    expect(leaks(JSON.stringify(share.mock.calls[0][0]), [...SECRETS, 'greek', 'halal', 'peanut', 'moussaka'])).toBe(false);
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
});

// ---- (b) (c) (d) (f) a full flow with every channel spied before it starts -------------------

describe('full flow: setup, search, rank, add meal, remove, clear', () => {
  const calls: Array<[string, RequestInit | undefined]> = [];
  const mock = createCoreServices(new InMemoryProfileStore());
  const allIds = [
    ...new Set(mock.catalogue.allCravings().flatMap((c) => [c.id, ...mock.catalogue.swapsFor(c.id).map((s) => s.alternative.id)])),
  ];
  const body = async (url: string): Promise<unknown> => {
    const [head, rest = ''] = url.replace(/^\/api\//, '').split('/');
    const id = decodeURIComponent(rest);
    if (head === 'cravings') return rest === 'popular' ? mock.catalogue.popularCravings() : mock.catalogue.allCravings();
    if (head === 'food-info') return allIds.flatMap((i) => mock.catalogue.foodInfo(i) ?? []);
    if (head === 'swaps') return mock.catalogue.swapsFor(id);
    if (head === 'prices') return mock.prices.getPrices(id);
    if (head === 'nutrition') return mock.nutrition.getNutrition(id);
    if (head === 'support') return [];
    return [];
  };
  const stubFetch: FetchLike = async (url, init) => {
    calls.push([url, init as RequestInit | undefined]);
    return { ok: true, status: 200, json: async () => body(url) };
  };

  let directFetch: ReturnType<typeof vi.spyOn>;
  let xhrOpen: ReturnType<typeof vi.spyOn>;
  let beacon: ReturnType<typeof vi.fn>;
  let socket: ReturnType<typeof vi.fn>;
  let imageCtor: ReturnType<typeof vi.fn>;
  let notification: ReturnType<typeof vi.fn>;
  let swRegister: ReturnType<typeof vi.fn>;
  let share: ReturnType<typeof vi.fn>;
  let idbOpen: ReturnType<typeof vi.fn>;
  let idbDatabases: ReturnType<typeof vi.fn>;
  let consoles: ReturnType<typeof vi.spyOn>[];
  const real = {
    Image: globalThis.Image, WebSocket: globalThis.WebSocket, Notification: (globalThis as any).Notification,
    indexedDB: (globalThis as any).indexedDB,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    calls.length = 0;
    directFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no direct fetch'));
    xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open');
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
    idbOpen = vi.fn();
    idbDatabases = vi.fn().mockResolvedValue([]);
    (globalThis as any).indexedDB = { open: idbOpen, databases: idbDatabases, deleteDatabase: vi.fn() };
    consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  });
  afterEach(() => {
    cleanup();
    directFetch.mockRestore();
    xhrOpen.mockRestore();
    consoles.forEach((c) => c.mockRestore());
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    globalThis.Image = real.Image;
    globalThis.WebSocket = real.WebSocket;
    (globalThis as any).Notification = real.Notification;
    (globalThis as any).indexedDB = real.indexedDB;
    localStorage.clear();
  });

  const openMenu = (item: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    pickMenuItem(item);
  };
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  const tag = (label: RegExp | string, text: string) => {
    const field = screen.getByLabelText(label);
    fireEvent.change(field, { target: { value: text } });
    fireEvent.keyDown(field, { key: 'Enter' });
  };
  const stored = () => JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}');

  /** Everything a snapshot of the page, URL and storage could leak, taken between steps. */
  const surfaces = () => {
    const dataAttrs = [...document.querySelectorAll('*')].flatMap((el) =>
      [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${a.value}`));
    return { title: document.title, href: location.href, dataAttrs: dataAttrs.join('\n') };
  };
  const checkSurfaces = (step: string) => {
    const s = surfaces();
    expect(leaks(s.title, [...SECRETS, ...CHOSEN_IDS]), `${step}: document.title`).toBe(false);
    expect(leaks(decodeURIComponent(s.href), [...SECRETS, ...CHOSEN_IDS]), `${step}: location`).toBe(false);
    expect(leaks(s.dataAttrs, SECRETS), `${step}: data- attributes`).toBe(false);
    expect(Object.keys(localStorage), `${step}: localStorage keys`).toEqual([PROFILE_KEY]);
    expect(sessionStorage.length, `${step}: sessionStorage`).toBe(0);
    expect(document.cookie, `${step}: cookie`).toBe('');
  };

  async function runFlow() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ welcomeSeen: true }));
    const services = await createHttpServices(new LocalProfileStore(), stubFetch);
    render(<ServicesProvider services={services}><App now={clock} /></ServicesProvider>);

    // setup
    openMenu('My food');
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    tag('Add your own', TRADITION_TEXT);
    next();
    fireEvent.click(screen.getByRole('button', { name: /^Halal/ }));
    next();
    tag(/avoid/i, ALLERGY_TEXT);
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Diwali' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(stored().foodProfile.traditions).toEqual(['greek', TRADITION_TEXT]);
    checkSurfaces('after setup');

    // search and rank
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.change(screen.getByLabelText(/what are you craving/i), { target: { value: 'burger' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText(/swaps? for/i);
    await waitFor(() => expect(calls.some(([u]) => u.startsWith('/api/swaps/'))).toBe(true));
    checkSurfaces('after search');

    // add a meal with a dish, then remove it
    openMenu('Meals that felt like home');
    fireEvent.click(screen.getByRole('button', { name: 'Add a meal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Add details' }));
    fireEvent.change(screen.getByLabelText('Dish (optional)'), { target: { value: DISH_TEXT } });
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(stored().culturalMeals).toHaveLength(1);
    expect(stored().culturalMeals[0].dish).toBe(DISH_TEXT);
    checkSurfaces('after add meal');
    fireEvent.click(screen.getByRole('button', { name: /^Remove/ }));
    expect(stored()).not.toHaveProperty('culturalMeals');
    checkSurfaces('after remove meal');

    // add another so Clear has something to clear, then clear both
    fireEvent.click(screen.getByRole('button', { name: 'Add a meal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    openMenu('My food');
    fireEvent.click(screen.getByRole('button', { name: 'Clear my meals' }));
    expect(stored()).not.toHaveProperty('culturalMeals');
    fireEvent.click(screen.getByRole('button', { name: 'Clear my food settings' }));
    expect(stored()).not.toHaveProperty('foodProfile');
    checkSurfaces('after clear');
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
    (globalThis as any).indexedDB.open('x');
    await (globalThis as any).indexedDB.databases();
    console.log('x');
    for (const spy of [directFetch, xhrOpen, beacon, socket, imageCtor, notification, swRegister, share, idbOpen, idbDatabases, consoles[0]]) {
      expect(spy).toHaveBeenCalled();
    }
  });

  it('(b) sends only id-based reference requests: no chosen text, rule id or meal text anywhere', async () => {
    await runFlow();
    expect(calls.length).toBeGreaterThan(0);
    const allowed = new Set([
      '/api/cravings/all', '/api/cravings/popular', '/api/food-info',
      ...allIds.flatMap((i) => [`/api/swaps/${i}`, `/api/prices/${i}`, `/api/nutrition/${i}`]),
    ]);
    for (const [url, init] of calls) {
      expect(allowed.has(url) || /^\/api\/support(\?|$)/.test(url), `unexpected request ${url}`).toBe(true);
      expect(leaks(url, [...SECRETS, ...CHOSEN_IDS]), url).toBe(false);
      expect(init?.body, url).toBeUndefined();
      expect(leaks(JSON.stringify(init ?? {}), [...SECRETS, ...CHOSEN_IDS, 'greek', 'peanut']), `${url} init`).toBe(false);
    }
    expect(directFetch).not.toHaveBeenCalled();
  });

  it('(c) writes only the profile key, and touches no other storage, cookie or database', async () => {
    await runFlow();
    expect(Object.keys(localStorage)).toEqual([PROFILE_KEY]);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
    expect(idbOpen).not.toHaveBeenCalled();
    expect(idbDatabases).not.toHaveBeenCalled();
    // After Clear the stored profile holds no food text at all.
    expect(leaks(dump(localStorage), SECRETS)).toBe(false);
  });

  it('(d) uses no beacon, socket, image, xhr, notification, service worker, share or console', async () => {
    await runFlow();
    expect(xhrOpen).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    expect(socket).not.toHaveBeenCalled();
    expect(imageCtor).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
    expect(swRegister).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(consoles.every((c) => c.mock.calls.length === 0)).toBe(true);
  });

  it('(f) the surface checks are live (title, location and data- attributes can fail)', () => {
    document.title = DISH_TEXT;
    history.replaceState(null, '', `/?q=${encodeURIComponent(TRADITION_TEXT)}`);
    const el = document.createElement('div');
    el.setAttribute('data-x', ALLERGY_TEXT);
    document.body.append(el);
    const s = surfaces();
    expect(leaks(s.title, SECRETS)).toBe(true);
    expect(leaks(decodeURIComponent(s.href), SECRETS)).toBe(true);
    expect(leaks(s.dataAttrs, SECRETS)).toBe(true);
    el.remove();
    document.title = '';
    history.replaceState(null, '', '/');
  });
});

// ---- (e) clear, profile delete and "Start from my current data" ------------------------------

describe('(e) clear, delete and migrate', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => localStorage.clear());

  it('Clear removes the keys from the stored JSON and leaves the rest', () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(FULL_PROFILE));
    render(<ServicesProvider services={createCoreServices(new LocalProfileStore())}><App now={clock} /></ServicesProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    pickMenuItem('My food');
    fireEvent.click(screen.getByRole('button', { name: 'Clear my meals' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear my food settings' }));
    const after = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}');
    expect(Object.keys(after).sort()).toEqual(['score', 'weekSwaps', 'welcomeSeen']);
    expect(leaks(localStorage.getItem(PROFILE_KEY) ?? '', SECRETS)).toBe(false);
  });

  it('"Start from my current data" carries foodProfile and culturalMeals into the new profile and removes the guest copy', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL_PROFILE));
    const svc = new LocalAuthService();
    const r = await svc.create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    if (!r.ok) throw new Error('create failed');
    const raw = localStorage.getItem(profileKey(r.account.id)) ?? '';
    expect(JSON.parse(raw)).toMatchObject({ foodProfile: FULL_FOOD, culturalMeals: FULL_MEALS });
    expect(localStorage.getItem(KEYS.guestProfile)).toBeNull();
    // And the app reads it back through the profile store the new profile uses.
    const loaded = new LocalProfileStore(`.${r.account.id}`).load();
    expect(loaded.foodProfile).toEqual(FULL_FOOD);
    expect(loaded.culturalMeals).toEqual(FULL_MEALS);
  });

  it('starting fresh leaves the food data in the guest profile and out of the new one', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL_PROFILE));
    const r = await new LocalAuthService().create({ name: 'Sam', colour: 'sand', migrateGuestData: false });
    if (!r.ok) throw new Error('create failed');
    expect(JSON.parse(localStorage.getItem(profileKey(r.account.id)) ?? '{}')).toEqual({ welcomeSeen: true });
    expect(JSON.parse(localStorage.getItem(KEYS.guestProfile) ?? '{}')).toMatchObject({ foodProfile: FULL_FOOD });
  });

  it('deleting a profile removes its key, and with it the food settings and meals', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL_PROFILE));
    const svc = new LocalAuthService();
    const r = await svc.create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    if (!r.ok) throw new Error('create failed');
    expect(leaks(dump(localStorage), [DISH_TEXT])).toBe(true); // the self-check: it is there before delete
    const removed = await svc.remove(r.account.id, 'Sam');
    expect(removed.ok).toBe(true);
    expect(localStorage.getItem(profileKey(r.account.id))).toBeNull();
    expect(leaks(dump(localStorage) + dump(sessionStorage), SECRETS)).toBe(false);
    // A tab that still has the profile open cannot bring it back.
    new LocalProfileStore(`.${r.account.id}`).save(FULL_PROFILE);
    expect(localStorage.getItem(profileKey(r.account.id))).toBeNull();
  });
});
