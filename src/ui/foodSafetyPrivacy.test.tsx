import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FoodSafetyView } from './FoodSafetyView';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Spies are installed before the render; the detector is proven live first.
describe('Food safety privacy', () => {
  it('the detectors catch a request and a write', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', fetchSpy);
    const set = vi.spyOn(Storage.prototype, 'setItem');
    await fetch('/x');
    localStorage.setItem('k', 'v');
    expect(fetchSpy).toHaveBeenCalled();
    expect(set).toHaveBeenCalled();
    localStorage.clear();
  });

  it('makes no request, writes no storage, shares nothing and changes nothing outside the page', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    const set = vi.spyOn(Storage.prototype, 'setItem');
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    const title = document.title;
    const { container } = render(<FoodSafetyView />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(document.title).toBe(title);
    expect(container.querySelector('input, textarea, select, form')).toBeNull();
    expect(container.querySelector('script, iframe, img')).toBeNull();
  });
});
