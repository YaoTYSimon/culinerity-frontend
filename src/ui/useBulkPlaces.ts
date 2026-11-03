import { useEffect, useState } from 'react';
import { loadBulkFor, type BulkPlace, type LatLng } from '@culinerity/core';
import type { BulkSource } from '../location/cellFetcher';

export type BulkState =
  | { status: 'none' }
  | { status: 'ready'; places: BulkPlace[]; failedCells: string[]; release: string };

const NONE: BulkState = { status: 'none' };

/**
 * The not-checked places for a position held in memory. 'none' covers every case where there is nothing to say:
 * no position yet, still loading, or the list is not published. An absent feature is never an error.
 */
export function useBulkPlaces(origin: LatLng | null, source: BulkSource): BulkState {
  const [state, setState] = useState<BulkState>(NONE);
  const lat = origin?.lat;
  const lng = origin?.lng;
  useEffect(() => {
    setState(NONE);
    if (lat === undefined || lng === undefined) return;
    let live = true;
    (async () => {
      const manifest = await source.manifest();
      if (!manifest) return;
      const load = await loadBulkFor({ lat, lng }, source.cell(manifest));
      if (live) setState({ status: 'ready', places: load.places, failedCells: load.failedCells, release: load.release ?? manifest.release });
    })().catch(() => { /* an absent or broken extra list stays silent */ });
    return () => { live = false; };
  }, [lat, lng, source]);
  return state;
}
