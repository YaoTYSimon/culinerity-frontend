import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cellKey, type BulkManifest, type CellShard, type LocationProvider } from '@culinerity/core';
import { BulkSourceContext } from '../location/BulkContext';
import type { BulkSource } from '../location/cellFetcher';
import { LocationProviderContext } from '../location/LocationContext';
import { WhereToGet } from './WhereToGet';

const CBD = { lat: -37.8136, lng: 144.9631 };
const provider: LocationProvider = { locate: () => Promise.resolve({ ok: true, ...CBD }) };
const RELEASE = '2026-10-21.0';
const sp = (id: string, name: string, kind: string, dLat: number) =>
  ({ id: `ovt-${id}`, name, kind, lat: CBD.lat + dLat, lng: CBD.lng, address: `${id} High St`, postcode: '3000', sourceDataset: 'meta', licence: 'CDLA-Permissive-2.0' });
const SHARD = {
  release: RELEASE,
  places: [
    sp('1', 'Coles Central', 'supermarket', 0.002),
    sp('2', 'Pigalle Grocer', 'supermarket', 0.0005),
    sp('3', 'IGA Express', 'supermarket', 0.003),
    sp('4', 'Nugget Shop', 'takeaway', 0.001),
  ],
} as unknown as CellShard;
const manifest: BulkManifest = { release: RELEASE, cells: {} };

function mount(cravingId: string, cell = vi.fn(async (key: string) => (key === cellKey(CBD.lat, CBD.lng) ? SHARD : { release: RELEASE, places: [] }))) {
  const bulk: BulkSource = { manifest: async () => manifest, cell: () => cell };
  render(
    <LocationProviderContext.Provider value={provider}>
      <BulkSourceContext.Provider value={bulk}><WhereToGet cravingId={cravingId} today="2026-11-03" /></BulkSourceContext.Provider>
    </LocationProviderContext.Provider>,
  );
  return cell;
}
const openIt = () => fireEvent.click(screen.getByRole('button', { name: 'Where to get it' }));
const locate = async () => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use my location' })); }); };

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

describe('WhereToGet', () => {
  it('is collapsed, loads nothing, and asks for a place only once opened', () => {
    const cell = mount('chicken-nuggets');
    const b = screen.getByRole('button', { name: 'Where to get it' });
    expect(b).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Use my location' })).toBeNull();
    expect(cell).not.toHaveBeenCalled();
    openIt();
    expect(b).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument();
    expect(screen.queryByText('Coles Central')).toBeNull();
  });

  it('after a location, lists branded supermarkets and takeaways labelled not checked, with distances', async () => {
    mount('chicken-nuggets');
    openIt();
    await locate();
    expect(await screen.findByText('Coles Central')).toBeInTheDocument();
    expect(screen.getByText('IGA Express')).toBeInTheDocument();
    expect(screen.queryByText('Pigalle Grocer')).toBeNull();
    expect(screen.getByText('Nugget Shop')).toBeInTheDocument();
    expect(screen.getByText('Not checked by us')).toBeInTheDocument();
    expect(screen.getAllByText(/\d+ m|km|under 100 m/).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Supermarkets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Takeaway' })).toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });

  it('shows no takeaway group for a shop-bought craving', async () => {
    mount('chocolate');
    openIt();
    await locate();
    expect(await screen.findByText('Coles Central')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Takeaway' })).toBeNull();
    expect(screen.queryByText('Nugget Shop')).toBeNull();
  });

  it('works from a typed suburb', async () => {
    mount('pizza');
    openIt();
    fireEvent.change(screen.getByLabelText('Type a suburb or postcode'), { target: { value: 'Melbourne' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Use this suburb' })); });
    const list = await screen.findByRole('list', { name: 'Supermarkets' });
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});
