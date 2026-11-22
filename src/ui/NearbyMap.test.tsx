import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { cellKey, type BulkManifest, type CellShard, type LocationProvider, type Place, type PlaceSource } from '@culinerity/core';
import { BulkSourceContext } from '../location/BulkContext';
import type { BulkSource } from '../location/cellFetcher';
import { LocationProviderContext } from '../location/LocationContext';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { Nearby } from './Nearby';

const CBD = { lat: -37.8136, lng: 144.9631 };
const provider: LocationProvider = { locate: () => Promise.resolve({ ok: true, ...CBD }) };
const RELEASE = '2026-10-21.0';

const places = (n: number): PlaceSource => ({
  sources: async () => [],
  list: async () => Array.from({ length: n }, (_, i): Place => ({
    id: `p${i}`, name: `Place ${String(i).padStart(2, '0')}`, kind: 'market', lat: CBD.lat + 0.003 + i * 0.0006, lng: CBD.lng,
    address: '1 Test Street', suburb: 'Testville', priceBand: 'mid', priceBasis: 'typical', fit: i % 2 ? ['meals'] : ['fresh'],
    access: 'open', sourceId: 'test', verification: 'primary', checked: '2026-01-01',
  })),
});
const shard = (count: number) => ({
  release: RELEASE,
  places: Array.from({ length: count }, (_, i) => ({
    id: `ovt-${i}`, name: `Bulk ${i}`, kind: 'bakery', lat: CBD.lat - 0.002 - i * 0.0004, lng: CBD.lng,
    address: `${i} High St`, postcode: '3000', sourceDataset: 'meta', licence: 'CDLA-Permissive-2.0',
  })),
}) as unknown as CellShard;
const bulkSource = (count: number | null): BulkSource => ({
  manifest: async () => (count === null ? null : ({ release: RELEASE, cells: {} } as BulkManifest)),
  cell: () => async (key) => (key === cellKey(CBD.lat, CBD.lng) ? shard(count ?? 0) : { release: RELEASE, places: [] }),
});

async function open(opts: { n?: number; bulk?: number | null; typed?: string; empty?: boolean; noPosition?: boolean } = {}) {
  const services = { ...createServices(), places: places(opts.empty ? 0 : (opts.n ?? 5)) };
  render(
    <ServicesProvider services={services}>
      <LocationProviderContext.Provider value={provider}>
        <BulkSourceContext.Provider value={bulkSource(opts.bulk === undefined ? null : opts.bulk)}><Nearby today="2026-11-03" /></BulkSourceContext.Provider>
      </LocationProviderContext.Provider>
    </ServicesProvider>,
  );
  await screen.findByText(/^Press Use my location/);
  if (opts.typed) {
    fireEvent.change(screen.getByLabelText('Type a suburb or postcode'), { target: { value: opts.typed } });
    fireEvent.click(screen.getByRole('button', { name: 'Use this suburb' }));
  } else if (!opts.noPosition) {
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use my location' })); });
  }
}
const toMap = async () => { fireEvent.click(screen.getByRole('radio', { name: 'Map' })); return screen.findByRole('img', { name: /on a map of Melbourne/ }); };
const checkedDots = () => screen.getAllByRole('button').filter((b) => b.getAttribute('data-dot') === 'checked');
const viewBox = () => screen.getByRole('img', { name: /map of Melbourne/ }).getAttribute('viewBox')!.split(' ').map(Number);

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

describe('List | Map switch', () => {
  it('opens on List with the list as the source of truth, and switches both ways', async () => {
    await open();
    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked();
    expect(screen.getByRole('list', { name: 'Places near you' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /map of Melbourne/ })).toBeNull();
    await toMap();
    expect(screen.getByRole('radio', { name: 'Map' })).toBeChecked();
    expect(screen.queryByRole('list', { name: 'Places near you' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'List' }));
    expect(screen.getByRole('list', { name: 'Places near you' })).toBeInTheDocument();
  });
  it('has no switch and no map when nothing is found', async () => {
    await open({ empty: true });
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('img', { name: /map of Melbourne/ })).toBeNull();
  });
  it('shows no switch before there is a position', async () => {
    await open({ noPosition: true });
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('img', { name: /map of Melbourne/ })).toBeNull();
  });
});

describe('map dots', () => {
  it('summarises in the label and draws one focusable button per checked place, in distance order', async () => {
    await open({ n: 5, bulk: 3 });
    const map = await toMap();
    expect(map).toHaveAccessibleName('8 places on a map of Melbourne. You are here');
    const dots = checkedDots();
    expect(dots.map((d) => d.getAttribute('aria-label')!.split(',')[0])).toEqual(['Place 00', 'Place 01', 'Place 02', 'Place 03', 'Place 04']);
    dots.forEach((d) => expect(d).toHaveAttribute('tabindex', '0'));
  });
  it('draws checked and not-checked differently: solid and focusable versus a hollow ring that is hidden from assistive tech', async () => {
    await open({ n: 2, bulk: 3 });
    const map = await toMap();
    const rings = map.querySelectorAll('[data-dot="unchecked"]');
    expect(rings).toHaveLength(3);
    rings.forEach((r) => {
      expect(r).toHaveAttribute('aria-hidden', 'true');
      expect(r).toHaveAttribute('fill', 'transparent');
      expect(r).not.toHaveAttribute('tabindex');
    });
    const solid = checkedDots()[0].querySelectorAll('circle');
    expect([...solid].some((c) => c.getAttribute('fill') === 'var(--ink)')).toBe(true);
    const ringR = Number(rings[0].getAttribute('r'));
    expect(ringR).toBeLessThan(Number([...solid].find((c) => c.getAttribute('fill') === 'var(--ink)')!.getAttribute('r')));
  });
  it('follows the current filters', async () => {
    await open({ n: 6, bulk: 3 });
    await toMap();
    expect(checkedDots()).toHaveLength(6);
    fireEvent.click(screen.getByRole('radio', { name: 'List' }));
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Meals' }));
    await toMap();
    expect(checkedDots()).toHaveLength(3);
    expect(screen.getByRole('img', { name: /map of Melbourne/ })).toHaveAccessibleName(/^3 places on a map/);
  });
  it('caps not-checked dots to the nearest 300 but draws every checked dot', async () => {
    await open({ n: 14, bulk: 320 });
    const map = await toMap();
    expect(checkedDots()).toHaveLength(14);
    expect(map.querySelectorAll('[data-dot="unchecked"]')).toHaveLength(300);
  });
  it('draws the user dot only when there is a position, and says where it is', async () => {
    await open({ typed: 'Footscray' });
    const map = await toMap();
    expect(map.querySelector('[data-testid="map-you"]')).not.toBeNull();
    expect(map).toHaveAccessibleName(/You are here \(middle of Footscray\)/);
  });
});

describe('selecting a dot', () => {
  it('shows the name, distance and a Maps link that names the place only', async () => {
    await open({ n: 3 });
    await toMap();
    fireEvent.click(checkedDots()[1]);
    const link = screen.getByRole('link', { name: 'Open Place 01 in Maps' });
    const href = decodeURIComponent(link.getAttribute('href')!);
    expect(href).toContain('Place 01 1 Test Street');
    expect(href).not.toMatch(/37\.8|144\.9/);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getAllByText('Place 01').length).toBeGreaterThan(0);
    expect(checkedDots()[1]).toHaveAttribute('aria-pressed', 'true');
  });
  it('selects with the keyboard', async () => {
    await open({ n: 3 });
    await toMap();
    fireEvent.keyDown(checkedDots()[2], { key: 'Enter' });
    expect(screen.getByRole('link', { name: 'Open Place 02 in Maps' })).toBeInTheDocument();
  });
  it('a not-checked ring selects by click, with a Maps link but no Show in list', async () => {
    await open({ n: 2, bulk: 2 });
    const map = await toMap();
    fireEvent.click(map.querySelector('[data-dot="unchecked"]')!);
    expect(screen.getByRole('link', { name: 'Open Bulk 0 in Maps' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show in list' })).toBeNull();
  });
  it('Show in list switches to the list and focuses that row, even one past the first page', async () => {
    await open({ n: 15 });
    await toMap();
    fireEvent.click(checkedDots()[14]);
    fireEvent.click(screen.getByRole('button', { name: 'Show in list' }));
    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked();
    const row = document.getElementById('nearby-place-p14')!;
    expect(row).not.toBeNull();
    expect(within(row).getByRole('heading', { name: 'Place 14' })).toBeInTheDocument();
    expect(row).toHaveFocus();
  });
});

describe('zoom', () => {
  it('buttons change the viewBox and Whole map shows everything', async () => {
    await open({ n: 4 });
    await toMap();
    const start = viewBox();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const zin = viewBox();
    expect(zin[2]).toBeLessThan(start[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(viewBox()[2]).toBeGreaterThan(zin[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Whole map' }));
    expect(viewBox()[2]).toBe(1000);
  });
  it('keeps dots the same size on screen: the radius shrinks with the window', async () => {
    await open({ n: 4 });
    await toMap();
    const r = () => Number(checkedDots()[0].querySelectorAll('circle')[2].getAttribute('r'));
    const before = r();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(r() / before).toBeCloseTo(0.6, 1);
    expect(r()).toBeLessThan(before);
  });
  it('arrow keys pan and + zooms when the map has focus', async () => {
    await open({ n: 4 });
    await toMap();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const a = viewBox();
    fireEvent.keyDown(checkedDots()[0], { key: 'ArrowRight' });
    expect(viewBox()[0]).toBeGreaterThan(a[0]);
    fireEvent.keyDown(checkedDots()[0], { key: '+' });
    expect(viewBox()[2]).toBeLessThan(a[2]);
  });
});
