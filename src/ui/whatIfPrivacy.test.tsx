import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  baselineFromProfile, createCoreServices, runWhatIf, shareText, weekSummary, type Profile, type SavedWhatIf, type Scenario,
} from '@culinerity/core';
import App from './../App';
import { LocalAuthService } from '../auth/LocalAuthService';
import { KEYS, profileKey } from '../auth/storageKeys';
import { ServicesProvider } from '../services/ServicesContext';
import { LocalProfileStore } from '../storage/localProfileStore';

// Same method as foodPrivacy.test.tsx: spies installed before the flow, detectors proven live.
// If an assertion here fails, fix the code, not the test.

const clock = () => '2026-10-28T12:00:00';
const NOW_ISO = '2026-10-28T02:00:00.000Z';
const PROFILE_KEY = KEYS.guestProfile;
const SENTINEL = 'SENTINEL-WHATIF-731';
const SECOND = 'SENTINEL-WHATIF-second';
const RENAMED = 'SENTINEL-WHATIF-renamed';
const NAMES = [SENTINEL, SECOND, RENAMED, 'sentinel-whatif'];

const leaks = (text: string, needles: string[]) => needles.some((n) => text.toLowerCase().includes(n.toLowerCase()));
const dump = (s: Storage) => JSON.stringify(Object.fromEntries(Object.entries(s)));

const NUMBERS = { Income: '731.19', 'Rent or housing': '483.17', 'Other regular costs': '120', 'Food budget': '95' };
const COMBINED: Scenario = {
  kind: 'combined',
  steps: [
    { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 1000 } },
    { kind: 'pay-change', direction: 'up', bp: 1000 },
  ],
};
const PROFILE_NUMBERS: Profile = { incomeWeekly: 731.19, housingWeekly: 483.17, otherFixedWeekly: 120, foodBudgetWeekly: 95 };

/** Result figures (cents, 5 digits or more so a percentage can't match by luck) in both cents and dollar spellings. */
function resultNumbers(): string[] {
  const base = baselineFromProfile(PROFILE_NUMBERS);
  const r = runWhatIf(base, COMBINED, new Date(2026, 9, 28, 12));
  if (r.status !== 'ok') throw new Error('expected a result');
  const inputs = new Set(Object.values(base));
  const all = [r.before, ...r.weeks, r.before4, r.after4, r.change4].flatMap((f) => Object.values(f));
  const cents = all.filter((v): v is number => typeof v === 'number' && Math.abs(v) >= 10000 && !inputs.has(v));
  return [...new Set(cents)].flatMap((c) => [String(c), (c / 100).toFixed(2)]);
}
const RESULT_NUMBERS = resultNumbers();

const DOCUMENTED_PROFILE_KEYS = ['foodBudgetWeekly', 'housingWeekly', 'incomeWeekly', 'otherFixedWeekly', 'welcomeSeen', 'whatIfScenarios'];

describe('detectors are live (not circular)', () => {
  it('the leak check finds names, and the result numbers come from a real run', () => {
    expect(leaks(`GET /x?q=${SENTINEL}`, NAMES)).toBe(true);
    expect(leaks('GET /api/prices/x', NAMES)).toBe(false);
    expect(RESULT_NUMBERS.length).toBeGreaterThan(2);
    expect(RESULT_NUMBERS.some((n) => leaks('{"left":' + n + '}', [n]))).toBe(true);
  });
});

describe('full flow with every channel spied before it starts', () => {
  let directFetch: ReturnType<typeof vi.spyOn>;
  let xhrOpen: ReturnType<typeof vi.spyOn>;
  let setItem: ReturnType<typeof vi.spyOn>;
  let beacon: ReturnType<typeof vi.fn>;
  let socket: ReturnType<typeof vi.fn>;
  let share: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;
  let consoles: ReturnType<typeof vi.spyOn>[];
  const realWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    directFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network'));
    xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItem = vi.spyOn(Storage.prototype, 'setItem');
    beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    socket = vi.fn();
    globalThis.WebSocket = socket as unknown as typeof WebSocket;
    share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  });
  afterEach(() => {
    cleanup();
    for (const s of [directFetch, xhrOpen, setItem, ...consoles]) s.mockRestore();
    for (const k of ['sendBeacon', 'share', 'clipboard']) Object.defineProperty(navigator, k, { value: undefined, configurable: true });
    globalThis.WebSocket = realWebSocket;
    localStorage.clear();
  });

  const stored = () => JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}');
  const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const pick = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
  const run = () => fireEvent.click(screen.getByRole('button', { name: 'Show what changes' }));
  const save = (name: string) => { type('Name', name); fireEvent.click(screen.getByRole('button', { name: 'Save this what-if' })); };
  // Views load lazily: wait for the new view's h1 (the old view is hidden while the fallback shows).
  const nav = async (item: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: item }));
    await screen.findByRole('heading', { level: 1 });
  };

  const surfaces = () => {
    const dataAttrs = [...document.querySelectorAll('*')].flatMap((el) =>
      [...el.attributes].filter((a) => a.name.startsWith('data-') && a.name !== 'data-theme').map((a) => `${a.name}=${a.value}`));
    return { title: document.title, href: location.href, dataAttrs: dataAttrs.join('\n') };
  };
  const checkSurfaces = (step: string) => {
    const s = surfaces();
    const bad = [...NAMES, ...RESULT_NUMBERS];
    expect(leaks(s.title, bad), `${step}: document.title`).toBe(false);
    expect(leaks(decodeURIComponent(s.href), bad), `${step}: location`).toBe(false);
    expect(leaks(s.dataAttrs, NAMES), `${step}: data- attributes`).toBe(false);
    const allowed = new Set<string>([PROFILE_KEY, KEYS.theme]);
    expect(Object.keys(localStorage).filter((k) => !allowed.has(k)), `${step}: localStorage keys`).toEqual([]);
    expect(sessionStorage.length, `${step}: sessionStorage`).toBe(0);
    expect(document.cookie, `${step}: cookie`).toBe('');
  };

  async function runFlow() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ welcomeSeen: true }));
    render(<ServicesProvider services={createCoreServices(new LocalProfileStore())}><App now={clock} /></ServicesProvider>);
    await nav('What if');
    for (const [label, v] of Object.entries(NUMBERS)) type(label, v);
    fireEvent.click(screen.getByRole('button', { name: 'Save my numbers' }));
    checkSurfaces('numbers');

    pick('A few things at once');
    const group = screen.getByRole('group', { name: 'Which changes?' });
    fireEvent.click(within(group).getByRole('button', { name: 'Rent changes' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Pay changes' }));
    for (const r of screen.getAllByRole('radio', { name: 'goes up' })) fireEvent.click(r);
    type('Rent change (%)', '10');
    type('Pay change (%)', '10');
    run();
    checkSurfaces('after run');
    save(SENTINEL);
    checkSurfaces('after save');

    pick('Rent changes'); pick('goes up'); type('Rent change (%)', '20'); run();
    save(SECOND);
    expect(stored().whatIfScenarios).toHaveLength(2);

    const first = within(screen.getByRole('radiogroup', { name: 'First' }));
    const second = within(screen.getByRole('radiogroup', { name: 'Second' }));
    fireEvent.click(first.getByRole('radio', { name: SENTINEL }));
    fireEvent.click(second.getByRole('radio', { name: SECOND }));
    screen.getByRole('table', { name: /Side by side/ });
    checkSurfaces('after compare');

    fireEvent.click(screen.getByRole('button', { name: `Rename ${SECOND}` }));
    type('New name', RENAMED);
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    checkSurfaces('after rename');
    fireEvent.click(screen.getByRole('button', { name: `Remove ${RENAMED}` }));
    expect(stored().whatIfScenarios).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(stored().whatIfScenarios).toHaveLength(2);
    checkSurfaces('after undo');
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(stored()).not.toHaveProperty('whatIfScenarios');
    checkSurfaces('after clear');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }));
    checkSurfaces('after start again');
  }

  it('the spies are live (a deliberate call shows up on each)', async () => {
    await fetch('/x').catch(() => {});
    new XMLHttpRequest().open('GET', '/x');
    navigator.sendBeacon('/x', 'd');
    new WebSocket('ws://x');
    await navigator.share({ text: 'x' });
    await navigator.clipboard.writeText('x');
    localStorage.setItem('x', 'y');
    console.log('x');
    for (const spy of [directFetch, xhrOpen, beacon, socket, share, writeText, setItem, consoles[0]]) expect(spy).toHaveBeenCalled();
  });

  it('makes no network call, share, clipboard or console call, and writes only the profile key', async () => {
    await runFlow();
    expect(directFetch).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    expect(socket).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(consoles.every((c) => c.mock.calls.length === 0)).toBe(true);
    expect(setItem.mock.calls.every((c: unknown[]) => c[0] === PROFILE_KEY || c[0] === KEYS.theme)).toBe(true);
  });

  it('the stored profile holds only documented fields, inputs only, no result numbers', async () => {
    await runFlow();
    const profile = stored();
    expect(Object.keys(profile).sort()).toEqual(DOCUMENTED_PROFILE_KEYS);
    expect(profile).toMatchObject({ incomeWeekly: 731.19, housingWeekly: 483.17 });
    const list = profile.whatIfScenarios as SavedWhatIf[];
    expect(list).toHaveLength(2);
    for (const item of list) expect(Object.keys(item).sort()).toEqual(['id', 'name', 'savedAt', 'scenario']);
    const json = JSON.stringify(list);
    for (const n of RESULT_NUMBERS) expect(new RegExp(`(?<![\\d.])${n.replace('.', '\\.')}(?![\\d])`).test(json), `result number ${n} in saved JSON`).toBe(false);
  });

  it('the names and numbers stay out of My week, its share text and the Menu', async () => {
    await runFlow();
    const bad = [...NAMES];
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(leaks(screen.getByRole('navigation', { name: 'Menu' }).textContent ?? '', bad)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'My week' }));
    expect(leaks(document.body.textContent ?? '', bad)).toBe(false);
    const text = shareText(weekSummary(stored().weekSwaps ?? [], NOW_ISO));
    expect(leaks(text, [...bad, ...RESULT_NUMBERS])).toBe(false);
    expect(leaks(shareText(weekSummary([{ itemId: 'x', name: SENTINEL, saving: 1, at: NOW_ISO }], NOW_ISO)), bad)).toBe(true); // self-check
  });

  it('title, location and data- checks are live', () => {
    document.title = SENTINEL;
    history.replaceState(null, '', `/?q=${encodeURIComponent(SECOND)}`);
    const el = document.createElement('div');
    el.setAttribute('data-x', RENAMED);
    document.body.append(el);
    const s = surfaces();
    expect(leaks(s.title, NAMES)).toBe(true);
    expect(leaks(decodeURIComponent(s.href), NAMES)).toBe(true);
    expect(leaks(s.dataAttrs, NAMES)).toBe(true);
    el.remove();
    document.title = '';
    history.replaceState(null, '', '/');
  });
});

describe('delete, migrate and separate profiles', () => {
  const SAVED: SavedWhatIf[] = [{ id: 'w1', name: SENTINEL, scenario: COMBINED, savedAt: '2026-10-28T01:00:00.000Z' }];
  const FULL: Profile = { welcomeSeen: true, ...PROFILE_NUMBERS, whatIfScenarios: SAVED };

  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { cleanup(); localStorage.clear(); });

  it('"Start from my current data" carries the scenarios; starting fresh leaves them in the guest profile', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL));
    const svc = new LocalAuthService();
    const r = await svc.create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    if (!r.ok) throw new Error('create failed');
    expect(new LocalProfileStore(`.${r.account.id}`).load().whatIfScenarios).toEqual(SAVED);
    expect(localStorage.getItem(KEYS.guestProfile)).toBeNull();

    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL));
    const fresh = await svc.create({ name: 'Alex', colour: 'sand', migrateGuestData: false });
    if (!fresh.ok) throw new Error('create failed');
    expect(JSON.parse(localStorage.getItem(profileKey(fresh.account.id)) ?? '{}')).toEqual({ welcomeSeen: true });
    expect(new LocalProfileStore().load().whatIfScenarios).toEqual(SAVED);
  });

  it('deleting a profile removes its scenarios with it', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(FULL));
    const svc = new LocalAuthService();
    const r = await svc.create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    if (!r.ok) throw new Error('create failed');
    expect(leaks(dump(localStorage), [SENTINEL])).toBe(true); // self-check: it is there before delete
    expect((await svc.remove(r.account.id, 'Sam')).ok).toBe(true);
    expect(localStorage.getItem(profileKey(r.account.id))).toBeNull();
    expect(leaks(dump(localStorage) + dump(sessionStorage), NAMES)).toBe(false);
  });

  it('two profiles keep separate lists', async () => {
    const svc = new LocalAuthService();
    const a = await svc.create({ name: 'Sam', colour: 'sand', migrateGuestData: false });
    const b = await svc.create({ name: 'Alex', colour: 'sand', migrateGuestData: false });
    if (!a.ok || !b.ok) throw new Error('create failed');
    const storeA = new LocalProfileStore(`.${a.account.id}`);
    const storeB = new LocalProfileStore(`.${b.account.id}`);
    storeA.save({ welcomeSeen: true, whatIfScenarios: SAVED });
    storeB.save({ welcomeSeen: true });
    expect(storeA.load().whatIfScenarios).toEqual(SAVED);
    expect(storeB.load().whatIfScenarios).toBeUndefined();
    expect(leaks(localStorage.getItem(profileKey(b.account.id)) ?? '', NAMES)).toBe(false);
  });
});
