import { bulkCanMatch, bulkStaleness, rankBulk, type LatLng, type PlaceFilter, type RankedBulk } from '@culinerity/core';
import type { BulkState } from './useBulkPlaces';

export type BulkView =
  | { mode: 'none' }
  | { mode: 'hidden' }
  | { mode: 'shown'; ranked: RankedBulk[]; old: boolean; failed: boolean; release: string };

/**
 * What the page says about the not-checked tier. 'none' draws nothing at all (not published, still loading, or a filter
 * no bulk place can match). 'hidden' is a release older than 12 months: one line, no places.
 */
export function bulkView(state: BulkState, origin: LatLng, filter: PlaceFilter, today: string): BulkView {
  if (state.status !== 'ready' || !bulkCanMatch(filter)) return { mode: 'none' };
  const age = bulkStaleness(state.release, today);
  if (age === 'hidden') return { mode: 'hidden' };
  return { mode: 'shown', ranked: rankBulk(state.places, origin, filter), old: age === 'old', failed: state.failedCells.length > 0, release: state.release };
}
