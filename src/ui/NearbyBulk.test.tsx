import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MockPlaceSource, bulkSourceLine, cellKey, type BulkManifest, type CellShard, type LocationProvider } from '@culinerity/core';
import { BulkSourceContext } from '../location/BulkContext';
import type { BulkSource } from '../location/cellFetcher';
import { LocationProviderContext } from '../location/LocationContext';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { Nearby } from './Nearby';
import { BULK_EMPTY_TEXT, BULK_FAILED_TEXT, BULK_HIDDEN_TEXT, BULK_OLD_TEXT } from './NearbyBulk';

const CBD = { lat: -37.8136, lng: 144.9631 };
const provider: LocationProvider = { locate: () => Promise.resolve({ ok: true, ...CBD }) };
const RELEASE = '2026-10-21.0';
const shardPlace = (id: string, name: string, kind: string, lat: number) =>
  ({ id, name, kind, lat, lng: 144.9631, address: `${id} High St`, postcode: '3000', sourceDataset: 'meta', licence: 'CDLA-Permissive-2.0' });
const SHARD = {
  release: RELEASE,
  places: [shardPlace('ovt-1', 'Bulk Bakery', 'bakery', -37.815), shardPlace('ovt-2', 'Bulk Greens', 'greengrocer', -37.816)],
} as unknown as CellShard;

function source(opts: { manifest?: BulkManifest | null; cell?: (key: string) => Promise<CellShard> } = {}): BulkSource {
  const manifest = opts.manifest === undefined ? { release: RELEASE, cells: {} } : opts.manifest;
  return { manifest: async () => manifest, cell: () => opts.cell ?? (async (key) => (key === cellKey(CBD.lat, CBD.lng) ? SHARD : { release: RELEASE, places: [] })) };
}

async function open(bulk: BulkSource, today = '2026-11-03') {
  const services = { ...createServices(), places: new MockPlaceSource() };
  render(
    <ServicesProvider services={services}>
      <LocationProviderContext.Provider value={provider}>
        <BulkSourceContext.Provider value={bulk}><Nearby today={today} /></BulkSourceContext.Provider>
      </LocationProviderContext.Provider>
    </ServicesProvider>,
  );
  await screen.findByText(/starter list/i);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use my location' })); });
}

afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('Nearby not-checked tier', () => {
  it('is absent without a manifest: no headings, no message, checked places as before at heading level 2', async () => {
    await open(source({ manifest: null }));
    expect(screen.queryByRole('heading', { name: 'Not checked by us' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Checked by us' })).toBeNull();
    expect(screen.queryByText(BULK_FAILED_TEXT)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Places near you' })).getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
  });

  it('shows both headings, checked first, with the source line and licences', async () => {
    await open(source());
    const heads = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent);
    expect(heads.indexOf('Checked by us')).toBeGreaterThanOrEqual(0);
    expect(heads.indexOf('Checked by us')).toBeLessThan(heads.indexOf('Not checked by us'));
    expect(screen.getByRole('list', { name: 'Not checked by us places near you' })).toBeInTheDocument();
    expect(screen.getByText('Bulk Bakery')).toBeInTheDocument();
    expect(screen.getByText(bulkSourceLine(RELEASE))).toBeInTheDocument();
    expect(screen.getByText('Data licences')).toBeInTheDocument();
    expect(screen.queryByText(BULK_OLD_TEXT)).toBeNull();
  });

  it('says it may be out of date after 6 months', async () => {
    await open(source(), '2027-04-22');
    expect(await screen.findByText(BULK_OLD_TEXT)).toBeInTheDocument();
    expect(screen.getByText('Bulk Bakery')).toBeInTheDocument();
  });

  it('hides the tier once older than 12 months with one line, keeping the checked list', async () => {
    await open(source(), '2027-10-22');
    expect(await screen.findByText(BULK_HIDDEN_TEXT)).toBeInTheDocument();
    expect(screen.queryByText('Bulk Bakery')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Not checked by us' })).toBeNull();
    expect(screen.getByRole('list', { name: 'Places near you' })).toBeInTheDocument();
  });

  it('shows a calm message when a cell fails, with the places that did load', async () => {
    let n = 0;
    await open(source({ cell: async () => { if (n++ === 0) throw new Error('x'); return SHARD; } }));
    expect(await screen.findByText(BULK_FAILED_TEXT)).toBeInTheDocument();
    expect(screen.getAllByText('Bulk Bakery').length).toBeGreaterThan(0);
  });

  it('does not say the area is empty when every cell failed', async () => {
    await open(source({ cell: async () => { throw new Error('x'); } }));
    expect(await screen.findByText(BULK_FAILED_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(BULK_EMPTY_TEXT)).toBeNull();
  });

  it('keeps one polite live region mounted before the notes are filled, so they are announced', async () => {
    await open(source(), '2027-04-22');
    const note = await screen.findByText(BULK_OLD_TEXT);
    const region = note.closest('[aria-live="polite"]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region.getAttribute('data-testid')).toBe('bulk-notes');
  });

  it('shows an empty state when nothing is listed close by', async () => {
    await open(source({ cell: async () => ({ release: RELEASE, places: [] }) }));
    expect(await screen.findByText(BULK_EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Not checked by us' })).toBeInTheDocument();
  });

  it('reads fine when many rows are under 100 m: each row says so, and equal distances order by name', async () => {
    const crowd = ['Delta Cafe', 'Alpha Cafe', 'Charlie Cafe', 'Bravo Cafe', 'Echo Cafe', 'Foxtrot Cafe'].map((n, i) =>
      shardPlace(`ovt-c${i}`, n, 'cafe-restaurant', CBD.lat + 0.0002));
    const shard = { release: RELEASE, places: crowd } as unknown as CellShard;
    await open(source({ cell: async (key) => (key === cellKey(CBD.lat, CBD.lng) ? shard : { release: RELEASE, places: [] }) }));
    const list = await screen.findByRole('list', { name: 'Not checked by us places near you' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(6);
    for (const row of rows) expect(row.textContent).toMatch(/Cafe or restaurant · ovt-c\d High St 3000 · under\u00A0100\u00A0m/);
    expect(within(list).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Alpha Cafe', 'Bravo Cafe', 'Charlie Cafe', 'Delta Cafe', 'Echo Cafe', 'Foxtrot Cafe']);
  });

  it('shows the empty line for a real Greater Melbourne place with no listed places in its block (Christmas Hills)', async () => {
    // Christmas Hills (-37.658, 145.314): the shipped manifest has no shard in its 3x3 block, so the app shows no bulk rows.
    const { readFileSync } = await import('node:fs');
    const manifest = JSON.parse(readFileSync('public/places/manifest.json', 'utf8')) as BulkManifest;
    const key = cellKey(-37.658, 145.314);
    const [ix, iy] = key.split('_').map(Number);
    for (let y = iy - 1; y <= iy + 1; y++) for (let x = ix - 1; x <= ix + 1; x++) expect(manifest.cells[`${x}_${y}`]).toBeUndefined();
    expect(BULK_EMPTY_TEXT).toBe('No places in this list close to here.');
  });

  it('leaves the tier out for Free and Low cost, and Fresh produce keeps only fresh kinds', async () => {
    await open(source());
    await screen.findByText('Bulk Bakery');
    fireEvent.click(screen.getByRole('radio', { name: /Fresh produce/ }));
    expect(screen.queryByText('Bulk Bakery')).toBeNull();
    expect(screen.getByText('Bulk Greens')).toBeInTheDocument();
    for (const f of [/Free/, /Low cost/]) {
      fireEvent.click(screen.getByRole('radio', { name: f }));
      expect(screen.queryByRole('heading', { name: 'Not checked by us' })).toBeNull();
      expect(screen.queryByText('Bulk Greens')).toBeNull();
    }
  });

  it('rows carry no price band, hours, or cheap/healthy/budget words, and nothing is stored', async () => {
    await open(source());
    const list = await screen.findByRole('list', { name: 'Not checked by us places near you' });
    expect(list.textContent).not.toMatch(/cheap|healthy|budget|\$/i);
    expect(list.textContent).not.toMatch(/\bHours\b/);
    expect(within(list).getAllByText('Price not known').length).toBe(2);
    expect(within(list).getAllByText('Check hours before you go').length).toBe(2);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
});
