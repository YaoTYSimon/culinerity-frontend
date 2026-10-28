import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MockPlaceSource, StaticPlaceSource, formatDistance, haversineMetres, placeData, rankSentence, roundOrigin,
  type LocationProvider, type LocationResult, type Place, type PlaceSource,
} from '@culinerity/core';
import { LocationProviderContext } from '../location/LocationContext';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { Nearby } from './Nearby';
import { NearbyPlaceRow } from './NearbyPlaceRow';
import type { View } from './views';

const CBD = { lat: -37.8136, lng: 144.9631 };
const OK: LocationResult = { ok: true, ...CBD };

const fake = (...results: LocationResult[]) => {
  let i = 0;
  return { locate: vi.fn(() => Promise.resolve(results[Math.min(i++, results.length - 1)])) };
};
const deferred = () => {
  let resolve!: (r: LocationResult) => void;
  const promise = new Promise<LocationResult>((r) => { resolve = r; });
  return { provider: { locate: vi.fn(() => promise) }, resolve, promise };
};

function renderNearby(provider: LocationProvider, props: { score?: number; profileSuburb?: string; onNavigate?: (v: View) => void } = {}, source: PlaceSource = new MockPlaceSource()) {
  const services = { ...createServices(), places: source };
  return render(
    <ServicesProvider services={services}>
      <LocationProviderContext.Provider value={provider}><Nearby {...props} /></LocationProviderContext.Provider>
    </ServicesProvider>,
  );
}
const press = async (name: string | RegExp = 'Use my location') =>
  act(async () => { fireEvent.click(screen.getByRole('button', { name })); });
const names = () => within(screen.getByRole('list', { name: 'Places near you' })).getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
const typeSuburb = (text: string) => {
  fireEvent.change(screen.getByLabelText('Type a suburb or postcode'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Use this suburb' }));
};
const many = (n: number, lat = -37.81, lng = 144.96): PlaceSource => ({
  sources: async () => [],
  list: async () => Array.from({ length: n }, (_, i): Place => ({
    id: `p${i}`, name: `Place ${String(i).padStart(2, '0')}`, kind: 'market', lat: lat + i * 0.0005, lng,
    address: '1 Test Street', suburb: 'Testville', priceBand: 'mid', priceBasis: 'typical', fit: ['fresh'],
    access: 'open', sourceId: 'test', verification: 'primary', checked: '2026-01-01',
  })),
});

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  vi.useRealTimers();
});

describe('Nearby', () => {
  it('has one h1, shows the privacy sentence first, and does not ask for location on mount', async () => {
    const provider = fake(OK);
    renderNearby(provider);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Close to you.' })).toBeInTheDocument();
    expect(screen.getByText('Your location stays on this device. It is not saved or sent anywhere.')).toBeInTheDocument();
    await screen.findByText(/starter list/i);
    expect(provider.locate).not.toHaveBeenCalled();
  });

  it('finds you, then lists places in ranked order with distances and the rank sentence', async () => {
    const { resolve, provider } = deferred();
    renderNearby(provider, { score: 20 });
    await press();
    expect(screen.getByText('Finding you…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    await act(async () => resolve(OK));
    expect(names()).toEqual(['Test Pantry', 'Test Market', 'Test Kitchen']);
    expect(screen.getByText(rankSentence(20))).toBeInTheDocument();
    const origin = roundOrigin(CBD);
    const pantry = formatDistance(haversineMetres(origin, { lat: -37.82, lng: 144.97 }));
    expect(screen.getByText(new RegExp(pantry.replace('.', '\\.')))).toBeInTheDocument();
    expect(screen.queryByText('Finding you…')).not.toBeInTheDocument();
  });

  it('uses the balanced order when there is no score', async () => {
    renderNearby(fake(OK));
    await press();
    expect(names()).toEqual(['Test Market', 'Test Pantry', 'Test Kitchen']);
    expect(screen.getByText(rankSentence(undefined))).toBeInTheDocument();
  });

  it('denied: calm copy, focus to the suburb field, and a later grant replaces it', async () => {
    renderNearby(fake({ ok: false, reason: 'denied' }, OK));
    await press();
    expect(screen.getByText(/Location is off for this site\. You can type a suburb instead, or turn it on in your browser settings\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Type a suburb or postcode')).toHaveFocus();
    await press();
    expect(screen.queryByText(/Location is off/)).not.toBeInTheDocument();
    expect(names()).toHaveLength(3);
  });

  it('unavailable: copy, and the offline sentence only when offline', async () => {
    renderNearby(fake({ ok: false, reason: 'unavailable' }));
    await press();
    expect(screen.getByText(/We couldn't work out where you are\. Type a suburb instead\./)).toBeInTheDocument();
    expect(screen.queryByText(/offline/)).not.toBeInTheDocument();
  });

  it('unavailable and offline adds the offline sentence', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    renderNearby(fake({ ok: false, reason: 'unavailable' }));
    await press();
    expect(screen.getByText(/You also look to be offline; the list still works\./)).toBeInTheDocument();
  });

  it('timeout: copy and Try again, which asks again', async () => {
    const provider = fake({ ok: false, reason: 'timeout' }, OK);
    renderNearby(provider);
    await press();
    expect(screen.getByText(/That took too long\. Try again, or type a suburb\./)).toBeInTheDocument();
    await press('Try again');
    expect(provider.locate).toHaveBeenCalledTimes(2);
    expect(names()).toHaveLength(3);
  });

  it('a provider that rejects shows the unavailable copy', async () => {
    renderNearby({ locate: () => Promise.reject(new Error('boom')) });
    await press();
    expect(screen.getByText(/We couldn't work out where you are/)).toBeInTheDocument();
  });

  it('Cancel ignores a late result', async () => {
    const { resolve, provider } = deferred();
    renderNearby(provider);
    await press();
    await press('Cancel');
    expect(screen.queryByText('Finding you…')).not.toBeInTheDocument();
    await act(async () => resolve(OK));
    expect(screen.queryByRole('list', { name: 'Places near you' })).not.toBeInTheDocument();
  });

  it('a second press while finding does nothing', async () => {
    const { provider } = deferred();
    renderNearby(provider);
    await press();
    await press();
    expect(provider.locate).toHaveBeenCalledTimes(1);
  });

  it.each([['Footscray'], ['3011'], ['  FOOTSCRAY, VIC ']])('typing "%s" ranks from the centroid', async (text) => {
    renderNearby(fake(OK));
    typeSuburb(text);
    expect(await screen.findByText(/from the middle of (Footscray|postcode 3011)/)).toBeInTheDocument();
    expect(names()).toHaveLength(3);
  });

  it('several matches become "Did you mean" buttons; choosing one ranks from it', async () => {
    renderNearby(fake(OK));
    await screen.findByText(/starter list/i);
    typeSuburb('fitz');
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fitzroy' }));
    expect(screen.getByText('from the middle of Fitzroy')).toBeInTheDocument();
  });

  it('no match says so calmly', () => {
    renderNearby(fake(OK));
    typeSuburb('Zzzzville');
    expect(screen.getByText("We don't have that suburb yet. Try one nearby.")).toBeInTheDocument();
  });

  it('prefills the field from the profile suburb without ranking or storing', () => {
    const provider = fake(OK);
    renderNearby(provider, { profileSuburb: 'Carlton' });
    expect(screen.getByLabelText('Type a suburb or postcode')).toHaveValue('Carlton');
    expect(provider.locate).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: 'Places near you' })).not.toBeInTheDocument();
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('filters change the list and the live count without moving focus', async () => {
    renderNearby(fake(OK));
    await press();
    const live = screen.getByText('3 places');
    expect(live.closest('[aria-live="polite"]')).not.toBeNull();
    const group = screen.getByRole('group', { name: 'Show' });
    const free = within(group).getByRole('radio', { name: /Free/ });
    free.focus();
    fireEvent.click(free);
    expect(screen.getByText('2 places')).toBeInTheDocument();
    expect(names().sort()).toEqual(['Test Kitchen', 'Test Pantry']);
    expect(free).toHaveFocus();
    fireEvent.click(within(group).getByRole('radio', { name: /Fresh produce/ }));
    expect(screen.getByText('1 place')).toBeInTheDocument();
  });

  it('mounts the places count region empty, then fills it so the first result is announced', async () => {
    let mounted: Element | null = null;
    let filledLater = false;
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          const el = n.matches('[aria-live="polite"]') ? n : n.querySelector('.text-base.font-semibold[aria-live="polite"]');
          if (el && el.className === 'text-base font-semibold') mounted = el;
        });
        // Text added into an already-mounted region (a childList change on it) is what screen readers announce.
        if (mounted && m.target === mounted && m.addedNodes.length > 0) filledLater = true;
      }
    });
    renderNearby(fake(OK));
    obs.observe(document.body, { childList: true, subtree: true });
    await press();
    obs.disconnect();
    expect(screen.getByText('3 places')).toBeInTheDocument();
    expect(mounted).not.toBeNull();
    expect(filledLater).toBe(true);
  });

  it('an empty filter result says so', async () => {
    renderNearby(fake(OK), {}, many(3));
    await press();
    fireEvent.click(screen.getByRole('radio', { name: /Free/ }));
    expect(screen.getByText('Nothing matches that filter nearby. Try All.')).toBeInTheDocument();
  });

  it('a Sydney origin is honest and shows the closest five', async () => {
    renderNearby(fake({ ok: true, lat: -33.8688, lng: 151.2093 }), {}, many(8));
    await press();
    expect(screen.getByText(/Our starter list covers Melbourne for now\./)).toBeInTheDocument();
    expect(screen.getByText(/Nothing in our list within 10 km\./)).toBeInTheDocument();
    expect(names()).toHaveLength(5);
  });

  it('nothing within 10 km (but under 50 km) says so and shows the closest five', async () => {
    renderNearby(fake({ ok: true, lat: -37.81, lng: 145.2 }), {}, many(8));
    await press();
    expect(screen.getByText(/Nothing in our list within 10 km\./)).toBeInTheDocument();
    expect(screen.queryByText(/covers Melbourne for now/)).not.toBeInTheDocument();
    expect(names()).toHaveLength(5);
  });

  it('shows 12 rows then "Show more"', async () => {
    renderNearby(fake(OK), {}, many(14));
    await press();
    expect(names()).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(names()).toHaveLength(14);
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('renders the generated coverage statement and the licence text of the sources', async () => {
    renderNearby(fake(OK), {}, new StaticPlaceSource());
    const n = placeData.places.length;
    expect(await screen.findByText(new RegExp(`${n} places`))).toBeInTheDocument();
    expect(screen.getByText('Where this comes from')).toBeInTheDocument();
    expect(screen.getByText(placeData.sources[0].licence)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /More help from Foodbank/ })).toHaveAttribute('href', 'https://findfood.foodbank.org.au/?state=vic');
  });

  it('"Clear my location" empties the list and the typed field, and exists once for either origin', async () => {
    renderNearby(fake(OK));
    await press();
    expect(names()).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Clear my location' })).toHaveLength(1);
    await press('Clear my location');
    expect(screen.queryByRole('list', { name: 'Places near you' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear my location' })).not.toBeInTheDocument();

    typeSuburb('Footscray');
    expect(await screen.findByText('from the middle of Footscray')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clear my location' })).toHaveLength(1);
    await press('Clear my location');
    expect(screen.getByLabelText('Type a suburb or postcode')).toHaveValue('');
    expect(screen.queryByRole('list', { name: 'Places near you' })).not.toBeInTheDocument();
  });

  it('the last press wins: a stale result after Cancel and a new press is ignored', async () => {
    const stale = deferred();
    const fresh = deferred();
    let n = 0;
    const provider = { locate: vi.fn(() => (n++ === 0 ? stale : fresh).promise) };
    renderNearby(provider);
    await press();
    await press('Cancel');
    await press();
    await act(async () => stale.resolve({ ok: true, lat: -33.8688, lng: 151.2093 }));
    expect(screen.getByText('Finding you…')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Places near you' })).not.toBeInTheDocument();
    await act(async () => fresh.resolve(OK));
    expect(names()).toHaveLength(3);
    expect(screen.queryByText(/covers Melbourne for now/)).not.toBeInTheDocument();
  });

  it('hints how to use a prefilled suburb, until it is used', async () => {
    renderNearby(fake(OK), { profileSuburb: 'Footscray' });
    expect(screen.getByText('Press Use this suburb to see places near it.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use this suburb' }));
    expect(screen.queryByText('Press Use this suburb to see places near it.')).not.toBeInTheDocument();
    cleanup();
    renderNearby(fake(OK));
    expect(screen.queryByText(/Press Use this suburb/)).not.toBeInTheDocument();
  });

  it('shows the injected source\'s own sources and licences, plus the centroid licence, none dropped', async () => {
    renderNearby(fake(OK), {}, new MockPlaceSource());
    expect(await screen.findByText('Test licence text')).toBeInTheDocument();
    expect(screen.getByText('Test Publisher')).toBeInTheDocument();
    expect(screen.getByText(/Creative Commons Attribution 4\.0/)).toBeInTheDocument();
    const many = await new StaticPlaceSource().sources();
    cleanup();
    renderNearby(fake(OK), {}, new StaticPlaceSource());
    await screen.findByText(many[0].licence);
    many.forEach((s) => expect(screen.getByText(s.licence)).toBeInTheDocument());
  });

  it('links to Food support only when it can navigate there', async () => {
    const onNavigate = vi.fn();
    renderNearby(fake(OK), { onNavigate });
    fireEvent.click(screen.getByRole('button', { name: 'Free food and meals' }));
    expect(onNavigate).toHaveBeenCalledWith('support');
    cleanup();
    renderNearby(fake(OK));
    expect(screen.queryByRole('button', { name: 'Free food and meals' })).not.toBeInTheDocument();
  });

  it('a failed place list offers Try again', async () => {
    let fail = true;
    const source: PlaceSource = { sources: async () => [], list: () => (fail ? Promise.reject(new Error('x')) : new MockPlaceSource().list()) };
    renderNearby(fake(OK), {}, source);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});

describe('NearbyPlaceRow', () => {
  const base: Place = {
    id: 'r', name: 'Row Test Pantry', kind: 'food-relief', lat: 0, lng: 0, address: '2 Row St, Rowville VIC 3000',
    suburb: 'Rowville', priceBand: 'free', priceBasis: 'typical', fit: ['packaged', 'meals'], access: 'referral',
    sourceId: 's', verification: 'primary', checked: '2026-10-27', note: 'Call first.',
    notices: [{ text: 'Closed for renovation', until: '2026-11-30' }, { text: 'Old news', until: '2026-01-01' }],
  };
  const row = (p: Place) => render(<ul><NearbyPlaceRow item={{ place: p, metres: 350 }} today="2026-10-28" /></ul>);

  it('shows the details, honest labels, live notices only, and a safe Maps link', () => {
    row(base);
    expect(screen.getByRole('heading', { level: 2, name: 'Row Test Pantry' })).toBeInTheDocument();
    expect(screen.getByText('Typically free')).toBeInTheDocument();
    expect(screen.getByText(/Packaged/)).toBeInTheDocument();
    expect(screen.getByText('Referral needed')).toBeInTheDocument();
    expect(screen.getByText('Hours not listed')).toBeInTheDocument();
    expect(screen.getByText('Call first.')).toBeInTheDocument();
    expect(screen.getByText('Closed for renovation')).toBeInTheDocument();
    expect(screen.queryByText('Old news')).not.toBeInTheDocument();
    expect(screen.getByText(/Last checked/)).toHaveTextContent('2026');
    const link = screen.getByRole('link', { name: 'Open Row Test Pantry in Maps' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.getAttribute('href')).toContain(encodeURIComponent('Row Test Pantry'));
  });

  it('shows hours when the source gives them, and nothing for open access', () => {
    row({ ...base, access: 'open', hours: 'Tuesdays 10-12', priceBasis: 'stated' });
    expect(screen.getByText(/Tuesdays 10-12/)).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.queryByText(/Referral|Membership/)).not.toBeInTheDocument();
  });
});
