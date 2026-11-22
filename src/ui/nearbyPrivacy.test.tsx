import { act, fireEvent, render, screen } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryProfileStore, StaticPlaceSource, cellKey, cellPath, loadBulkFor, shareText, weekSummary, type LocationProvider } from '@culinerity/core';
import App from '../App';
import { LocationProviderContext } from '../location/LocationContext';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { Nearby } from './Nearby';

const FORBIDDEN =
  /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|caches|BroadcastChannel|importScripts)\b|document\s*\.\s*cookie|\bimport\s*\(|\b(window|globalThis|self|top|parent|frames)\s*\[|(?<![-\w])(globalThis|self)(?![-\w])|\bnavigator\s*\[|\beval\s*\(|\bnew\s+Function\b|\bcookie\s*[:=]|(?:'|"|`)\s*(?:local|session)\s*(?:'|"|`)\s*\+|\bstorage\b\s*\[/i;
const ROOT = resolve(__dirname, '../..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const isSource = (p: string) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p);

const RAW = { lat: -37.81234, lng: 144.96321 };
const DIGITS = ['-37.812', '144.963', '-37.81234', '144.96321', '37.812', '37.81234'];
const provider: LocationProvider = { locate: () => Promise.resolve({ ok: true, ...RAW }) };

/** True when any needle appears in the text (case-insensitive). The tests below prove it can fail. */
const leaks = (text: string, needles: string[]) => needles.some((n) => text.toLowerCase().includes(n.toLowerCase()));
const dump = (s: Storage) => JSON.stringify(Object.fromEntries(Object.entries(s)));

describe('detectors are live (not circular)', () => {
  it('the scanner flags forbidden APIs', () => {
    expect(FORBIDDEN.test('await fetch(url)')).toBe(true);
    expect(FORBIDDEN.test('window.localStorage.setItem')).toBe(true);
    expect(FORBIDDEN.test('document.cookie = x')).toBe(true);
    expect(FORBIDDEN.test('const quiet = 1')).toBe(false);
    expect(FORBIDDEN.test("window['local' + 'Storage']")).toBe(true);
    expect(FORBIDDEN.test('const g = globalThis; g.fetch(u)')).toBe(true);
    expect(FORBIDDEN.test('const s = self; s.sessionStorage')).toBe(true);
    expect(FORBIDDEN.test('const b = navigator.sendBeacon')).toBe(true);
    expect(FORBIDDEN.test("navigator['send' + 'Beacon'](u)")).toBe(true);
    expect(FORBIDDEN.test("await import('https://x.test/a.js')")).toBe(true);
    expect(FORBIDDEN.test("const k = 'local' + 'Storage'")).toBe(true);
    expect(FORBIDDEN.test('const { fetch: f } = window')).toBe(true);
    expect(FORBIDDEN.test('eval("x")')).toBe(true);
    expect(FORBIDDEN.test('const geo = navigator.geolocation')).toBe(false);
  });
  it('the leak check finds a stored coordinate', () => {
    localStorage.setItem('oops', JSON.stringify(RAW));
    expect(leaks(dump(localStorage), DIGITS)).toBe(true);
    localStorage.clear();
    expect(leaks(dump(localStorage), DIGITS)).toBe(false);
  });
});

describe('static guard (spec 22)', () => {
  const files = [
    ...readdirSync(join(ROOT, 'src/ui')).filter((f) => /^Nearby.*\.tsx$/.test(f)).map((f) => join(ROOT, 'src/ui', f)),
    join(ROOT, 'src/location/LocationContext.tsx'),
    join(ROOT, 'src/location/BrowserLocationProvider.ts'),
    ...walk(join(ROOT, 'packages/core/src/places')),
  ].filter(isSource);

  it('scans the real files', () => {
    const rel = files.map((f) => f.slice(ROOT.length + 1));
    expect(rel).toEqual(expect.arrayContaining(['src/ui/Nearby.tsx', 'src/ui/NearbyFilters.tsx', 'src/ui/NearbyPlaceRow.tsx', 'src/location/LocationContext.tsx', 'src/location/BrowserLocationProvider.ts', 'packages/core/src/places/rank.ts']));
  });
  it.each(files.map((f) => [f.slice(ROOT.length + 1), f]))('%s mentions no network or storage API', (_n, f) => {
    const code = readFileSync(f, 'utf8');
    // The generated datasets are data (place text); everything else must be clean.
    if (f.includes('/generated/')) return;
    expect(code.match(FORBIDDEN)?.[0]).toBeUndefined();
  });
});

describe('full flow (spec 23, 24)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let xhrOpen: ReturnType<typeof vi.spyOn>;
  let beacon: ReturnType<typeof vi.fn>;
  let socket: ReturnType<typeof vi.fn>;
  let consoles: ReturnType<typeof vi.spyOn>[];
  let imageCtor: ReturnType<typeof vi.fn>;
  const realImage = globalThis.Image;
  const realFetch = globalThis.fetch;
  const realSocket = globalThis.WebSocket;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open');
    beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    socket = vi.fn();
    globalThis.WebSocket = socket as unknown as typeof WebSocket;
    consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    imageCtor = vi.fn();
    globalThis.Image = imageCtor as unknown as typeof Image;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    globalThis.WebSocket = realSocket;
    globalThis.Image = realImage;
    consoles.forEach((c) => c.mockRestore());
    xhrOpen.mockRestore();
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
    localStorage.clear();
  });

  async function walkFlow() {
    const services = { ...createServices(), places: new StaticPlaceSource() };
    const { container } = render(
      <ServicesProvider services={services}>
        <LocationProviderContext.Provider value={provider}><Nearby score={30} profileSuburb="Carlton" /></LocationProviderContext.Provider>
      </ServicesProvider>,
    );
    await screen.findByText(/starter list/i);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use my location' })); });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fresh produce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.change(screen.getByLabelText('Type a suburb or postcode'), { target: { value: 'Footscray' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use this suburb' }));
    const links = screen.getAllByRole('link', { name: /in Maps/ });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((l) => fireEvent.click(l));
    return { container, links };
  }

  it('makes no network request except the same-origin manifest and coarse cell paths', async () => {
    await walkFlow();
    for (const [url, init] of fetchSpy.mock.calls) {
      expect(String(url)).toMatch(/^\/places\/(manifest|cells\/\d+_\d+)\.json$/);
      expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
      expect(leaks(String(url), [...DIGITS, '-37.813', '144.963', 'Footscray'])).toBe(false);
    }
    expect(xhrOpen).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    expect(socket).not.toHaveBeenCalled();
    expect(imageCtor).not.toHaveBeenCalled();
  });

  it('logs nothing, so no coordinate reaches the console', async () => {
    await walkFlow();
    const logged = consoles.flatMap((c) => c.mock.calls).map((args) => args.map(String).join(' ')).join('\n');
    expect(consoles.every((c) => c.mock.calls.length === 0)).toBe(true);
    expect(leaks(logged, DIGITS)).toBe(false);
  });

  it('stores nothing: no coordinate, rounded or raw, and not the typed suburb', async () => {
    await walkFlow();
    const stored = dump(localStorage) + dump(sessionStorage) + document.cookie;
    expect(leaks(stored, [...DIGITS, '-37.813', '144.963', 'Footscray'])).toBe(false);
    expect(localStorage.length + sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });

  it('Maps links and image sources carry the place, never the position', async () => {
    const { container, links } = await walkFlow();
    links.forEach((l) => {
      const href = decodeURIComponent(l.getAttribute('href') ?? '');
      expect(leaks(href, [...DIGITS, '-37.813'])).toBe(false);
      expect(href).toContain(l.getAttribute('aria-label')!.replace(/^Open /, '').replace(/ in Maps$/, ''));
    });
    container.querySelectorAll('img').forEach((img) => expect(leaks(img.src, DIGITS)).toBe(false));
  });
});

describe('bulk place requests reveal only a coarse cell', () => {
  const requested = async (pos: { lat: number; lng: number }) => {
    const urls: string[] = [];
    await loadBulkFor(pos, async (key) => {
      urls.push(cellPath(key));
      return { release: '2026-10-21.0', places: [] };
    });
    return urls;
  };

  it('every request is a same-origin cell path with no coordinate, rounded or raw', async () => {
    const urls = await requested(RAW);
    expect(urls).toHaveLength(9);
    for (const u of urls) {
      expect(u).toMatch(/^\/places\/cells\/\d+_\d+\.json$/);
      expect(leaks(u, [...DIGITS, '-37.813', '144.963', 'Footscray'])).toBe(false);
    }
  });
  it('the cell is coarse: points hundreds of metres apart ask for the same cells', async () => {
    const a = await requested(RAW);
    const b = await requested({ lat: RAW.lat + 0.0003, lng: RAW.lng + 0.0003 });
    expect(cellKey(RAW.lat, RAW.lng)).toBe(cellKey(RAW.lat + 0.0003, RAW.lng + 0.0003));
    expect(b).toEqual(a);
  });
  it('a position outside Greater Melbourne sends no request at all', async () => {
    expect(await requested({ lat: -33.87, lng: 151.2 })).toEqual([]);
  });
});

describe('share text (spec 24)', () => {
  const NOW = '2026-10-28T10:00:00.000Z';
  const week = [{ itemId: 'a', name: 'Lentils', saving: 2.5, at: NOW }];
  afterEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    localStorage.clear();
  });

  async function shared(withOrigin: boolean) {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const services = { ...createServices(), profiles: new InMemoryProfileStore({ welcomeSeen: true, weekSwaps: week }) };
    const { unmount } = render(
      <ServicesProvider services={services}>
        <LocationProviderContext.Provider value={provider}><App now={() => NOW} /></LocationProviderContext.Provider>
      </ServicesProvider>,
    );
    const go = async (item: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      fireEvent.click(screen.getByRole('button', { name: item }));
      await screen.findByRole('heading', { level: 1 }); // lazy views: wait for the view's h1
    };
    if (withOrigin) {
      await go('Nearby');
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use my location' })); });
      expect(await screen.findByRole('list', { name: 'Places near you' })).toBeInTheDocument();
    }
    await go('My week');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share' })); });
    unmount();
    return share.mock.calls[0][0].text as string;
  }

  it('is the same with and without an origin, and is the real builder\'s output', async () => {
    const without = await shared(false);
    const withOrigin = await shared(true);
    expect(withOrigin).toBe(without);
    expect(without).toBe(shareText(weekSummary(week, NOW)));
    expect(leaks(withOrigin, DIGITS)).toBe(false);
  });
});

describe('profile stays untouched (spec 24)', () => {
  afterEach(() => localStorage.clear());

  it('typing and using a suburb leaves profile.suburb and the saved profile unchanged', async () => {
    localStorage.clear();
    const start = { welcomeSeen: true, suburb: 'Carlton', score: 55 };
    const store = new InMemoryProfileStore(start);
    const services = { ...createServices(), profiles: store };
    render(
      <ServicesProvider services={services}>
        <LocationProviderContext.Provider value={provider}><App /></LocationProviderContext.Provider>
      </ServicesProvider>,
    );
    const savesBefore = store.saved.length;
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nearby' }));
    const field = await screen.findByLabelText('Type a suburb or postcode');
    expect(field).toHaveValue('Carlton');
    fireEvent.change(field, { target: { value: 'Footscray' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use this suburb' }));
    expect(await screen.findByText('from the middle of Footscray')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use my location' })); });
    expect(store.saved.length).toBe(savesBefore);
    expect(store.load()).toMatchObject(start);
    expect(store.load().suburb).toBe('Carlton');
    expect(JSON.stringify(store.load())).not.toMatch(/Footscray|144\.9|37\.8/);
    expect(leaks(dump(localStorage) + dump(sessionStorage), [...DIGITS, 'Footscray'])).toBe(false);
  });
});
