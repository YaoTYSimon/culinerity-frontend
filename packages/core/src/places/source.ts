import { placeData } from './generated/places.generated';
import type { Place, PlaceData, PlaceNotice, PlaceSourceRecord } from './types';

export { placeData };

export interface PlaceSource {
  list(): Promise<Place[]>;
}

/** Reads the generated, sourced dataset. Callers get copies, so they cannot change it. */
export class StaticPlaceSource implements PlaceSource {
  constructor(private readonly data: PlaceData = placeData) {}

  async list(): Promise<Place[]> {
    return this.data.places.map((p) => structuredClone(p));
  }
}

export function placeSourceFor(id: string, data: PlaceData = placeData): PlaceSourceRecord | undefined {
  return data.sources.find((s) => s.id === id);
}

/** Feeds the generated coverage statement, so it is never typed by hand. */
export function coverage(places: Place[]): { count: number; suburbs: string[] } {
  return { count: places.length, suburbs: [...new Set(places.map((p) => p.suburb))].sort() };
}

/** Notices that have not ended on `today` (YYYY-MM-DD); an ended notice is never shown. */
export function activeNotices(place: Place, today: string): PlaceNotice[] {
  return (place.notices ?? []).filter((n) => n.until >= today);
}
