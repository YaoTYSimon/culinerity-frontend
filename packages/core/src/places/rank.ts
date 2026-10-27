import { rankNudge, type RankNudge } from '../domain/bands';
import { haversineMetres, type LatLng } from './distance';
import type { Place, PriceBand } from './types';

export type PlaceFilter = 'all' | 'fresh' | 'free' | 'low-cost';

export interface RankedPlace {
  place: Place;
  metres: number;
}

export const PRICE_LABEL: Record<PriceBand, string> = {
  free: 'Free',
  budget: 'Budget',
  mid: 'Mid',
  pricier: 'Pricier',
};

/** Label for a place's price; "Typically ..." when the source does not state it. */
export function priceLabel(p: Pick<Place, 'priceBand' | 'priceBasis'>): string {
  const label = PRICE_LABEL[p.priceBand];
  return p.priceBasis === 'stated' ? label : `Typically ${label.toLowerCase()}`;
}

const PRICE_ORDER: Record<PriceBand, number> = { free: 0, budget: 1, mid: 2, pricier: 3 };
const BAND_LIMITS_M = [1000, 2000, 5000, 10_000];

const SENTENCES: Record<RankNudge, string> = {
  cheapest: 'Sorted by distance, then cheapest first.',
  balanced: 'Sorted by distance, then fresh produce.',
  healthiest: 'Sorted by distance, then fresh produce and price.',
};

export function nudgeFor(score: number | undefined): RankNudge {
  return score === undefined ? 'balanced' : rankNudge(score);
}

export function rankSentence(score: number | undefined): string {
  return SENTENCES[nudgeFor(score)];
}

const FILTERS: Record<PlaceFilter, (p: Place) => boolean> = {
  all: () => true,
  fresh: (p) => p.fit.includes('fresh'),
  free: (p) => p.priceBasis === 'stated' && p.priceBand === 'free',
  'low-cost': (p) => p.priceBasis === 'stated' && (p.priceBand === 'free' || p.priceBand === 'budget'),
};

const distanceBand = (m: number) => {
  const i = BAND_LIMITS_M.findIndex((limit) => m < limit);
  return i === -1 ? BAND_LIMITS_M.length : i;
};

type Key = (r: RankedPlace) => number;
const price: Key = (r) => PRICE_ORDER[r.place.priceBand];
const fresh: Key = (r) => (r.place.fit.includes('fresh') ? 0 : 1);
const dist: Key = (r) => r.metres;

const NUDGE_KEYS: Record<RankNudge, Key[]> = {
  cheapest: [price, fresh, dist],
  balanced: [fresh, dist, price],
  healthiest: [fresh, price, dist],
};

export function rankPlaces(
  places: Place[],
  origin: LatLng,
  score: number | undefined,
  filter: PlaceFilter,
): RankedPlace[] {
  const keys: Key[] = [(r) => distanceBand(r.metres), ...NUDGE_KEYS[nudgeFor(score)], dist];
  return places
    .filter(FILTERS[filter])
    .map((place) => ({ place, metres: haversineMetres(origin, place) }))
    .filter((r) => Number.isFinite(r.metres))
    .sort((a, b) => {
      for (const key of keys) {
        const d = key(a) - key(b);
        if (d !== 0) return d;
      }
      return (
        a.place.name.localeCompare(b.place.name, 'en-AU') ||
        (a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0)
      );
    });
}
