/** What asking the device for a position can give back. Only these three failures exist, all calm. */
export type LocationResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' };

/** Finds where the device is, once, when asked. Implemented in the web layer so the core stays platform-free. */
export interface LocationProvider {
  locate(): Promise<LocationResult>;
}
