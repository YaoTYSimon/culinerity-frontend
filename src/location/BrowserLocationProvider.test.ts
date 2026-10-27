import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserLocationProvider } from './BrowserLocationProvider';

type Success = (p: { coords: { latitude: number; longitude: number } }) => void;
type Failure = (e: { code: number }) => void;

function stubGeolocation(impl: (ok: Success, fail: Failure, options: PositionOptions) => void) {
  const geo = { getCurrentPosition: vi.fn(impl), watchPosition: vi.fn(), clearWatch: vi.fn() };
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
  return geo;
}

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  vi.restoreAllMocks();
});

describe('BrowserLocationProvider', () => {
  it('returns the raw coordinates on success (rounding is the view\'s job)', async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: -37.81234, longitude: 144.96321 } }));
    await expect(new BrowserLocationProvider().locate()).resolves.toEqual({ ok: true, lat: -37.81234, lng: 144.96321 });
  });

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
    [99, 'unavailable'],
  ])('maps error code %i to %s', async (code, reason) => {
    stubGeolocation((_ok, fail) => fail({ code }));
    await expect(new BrowserLocationProvider().locate()).resolves.toEqual({ ok: false, reason });
  });

  it('is unavailable when the API is missing or the context is insecure', async () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    await expect(new BrowserLocationProvider().locate()).resolves.toEqual({ ok: false, reason: 'unavailable' });
    const geo = stubGeolocation(() => {});
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    await expect(new BrowserLocationProvider().locate()).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('is unavailable when the API throws or gives a non-finite position', async () => {
    stubGeolocation(() => { throw new Error('nope'); });
    await expect(new BrowserLocationProvider().locate()).resolves.toEqual({ ok: false, reason: 'unavailable' });
    stubGeolocation((ok) => ok({ coords: { latitude: NaN, longitude: 1 } }));
    await expect(new BrowserLocationProvider().locate()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('asks once, coarsely, with no cached fix, and never watches or logs', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const geo = stubGeolocation((ok) => ok({ coords: { latitude: -37.8, longitude: 144.9 } }));
    await new BrowserLocationProvider().locate();
    stubGeolocation((_ok, fail) => fail({ code: 1 }));
    await new BrowserLocationProvider().locate();
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(geo.getCurrentPosition.mock.calls[0][2]).toEqual({ enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
    expect(geo.watchPosition).not.toHaveBeenCalled();
    [log, warn, error, info, debug].forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
