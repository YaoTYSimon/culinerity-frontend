import { bulkCanMatch, hasActiveFilters, bulkStaleness, rankBulk, type LatLng, type PlaceFilters, type RankedBulk } from '@culinerity/core';
import type { BulkState } from './useBulkPlaces';

export type BulkView =
  | { mode: 'none' }
  | { mode: 'hidden' }
  | { mode: 'shown'; ranked: RankedBulk[]; old: boolean; failed: boolean; release: string };

/**
 * What the page says about the not-checked tier. 'none' draws nothing at all (not published, still loading, or a filter
 * no bulk place can match). 'hidden' is a release older than 12 months: one line, no places.
 */
export function bulkView(state: BulkState, origin: LatLng, filters: PlaceFilters, today: string): BulkView {
  if (state.status !== 'ready' || !bulkCanMatch(filters)) return { mode: 'none' };
  const age = bulkStaleness(state.release, today);
  if (age === 'hidden') return { mode: 'hidden' };
  const ranked = rankBulk(state.places, origin, filters);
  const failed = state.failedCells.length > 0;
  // A filter that leaves nothing here is said once, by the page's own count, not again under this heading.
  if (hasActiveFilters(filters) && ranked.length === 0 && !failed) return { mode: 'none' };
  return { mode: 'shown', ranked, old: age === 'old', failed, release: state.release };
}
