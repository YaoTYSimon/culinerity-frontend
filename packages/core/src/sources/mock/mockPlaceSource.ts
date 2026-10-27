import type { PlaceSource } from '../../places/source';
import type { Place } from '../../places/types';

const base = { address: '1 Test Street, Testville', suburb: 'Testville', access: 'open', sourceId: 'test', verification: 'primary', checked: '2026-01-01' } as const;

/** Obviously fake places, for tests only. */
export class MockPlaceSource implements PlaceSource {
  async list(): Promise<Place[]> {
    return [
      { ...base, id: 'test-market', name: 'Test Market', kind: 'market', lat: -37.81, lng: 144.96, priceBand: 'mid', fit: ['fresh'] },
      { ...base, id: 'test-pantry', name: 'Test Pantry', kind: 'food-relief', lat: -37.82, lng: 144.97, priceBand: 'free', fit: ['packaged'], hours: 'Test hours' },
      { ...base, id: 'test-kitchen', name: 'Test Kitchen', kind: 'community-meal', lat: -37.8, lng: 144.95, priceBand: 'free', fit: ['meals'] },
    ];
  }
}
