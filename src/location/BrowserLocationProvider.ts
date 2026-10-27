import type { LocationProvider, LocationResult } from '@culinerity/core';

const OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 };
const UNAVAILABLE: LocationResult = { ok: false, reason: 'unavailable' };
const BY_CODE: Record<number, 'denied' | 'unavailable' | 'timeout'> = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };

/**
 * The browser's geolocation, asked once per call. Never watches, never logs, never keeps the answer: the caller
 * decides what to do with it (the Nearby view rounds it and holds it in memory only).
 */
export class BrowserLocationProvider implements LocationProvider {
  locate(): Promise<LocationResult> {
    return new Promise((resolve) => {
      const geo = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
      const insecure = typeof window !== 'undefined' && window.isSecureContext === false;
      if (!geo || insecure) return resolve(UNAVAILABLE);
      try {
        geo.getCurrentPosition(
          ({ coords }) =>
            resolve(
              Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)
                ? { ok: true, lat: coords.latitude, lng: coords.longitude }
                : UNAVAILABLE,
            ),
          (error) => resolve({ ok: false, reason: BY_CODE[error.code] ?? 'unavailable' }),
          OPTIONS,
        );
      } catch {
        resolve(UNAVAILABLE);
      }
    });
  }
}
