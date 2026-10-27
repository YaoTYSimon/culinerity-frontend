import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow';

// Sunday 25 October 2026, 23:59:30 Melbourne time; Monday starts a new tracker week.
beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 9, 25, 23, 59, 30) }));
afterEach(() => vi.useRealTimers());

describe('useNow', () => {
  it('moves to the next day at local midnight, so Sunday becomes Monday', () => {
    const { result } = renderHook(() => useNow(() => new Date().toISOString()));
    expect(result.current.getDay()).toBe(0);
    act(() => { vi.advanceTimersByTime(31_000); });
    expect(result.current.getDay()).toBe(1);
    expect(result.current.getDate()).toBe(26);
  });

  it('re-reads the clock when the tab becomes visible again', () => {
    const { result } = renderHook(() => useNow(() => new Date().toISOString()));
    vi.setSystemTime(new Date(2026, 9, 27, 8, 0, 0));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.getDate()).toBe(27);
  });

  // Pace uses the time of day at the last tick, so between ticks it can be up to 15 minutes stale; it
  // refreshes every 15 minutes, on visibility and at midnight.
  it('is stale between ticks, then refreshes after 15 minutes', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 10, 0, 0));
    const { result } = renderHook(() => useNow(() => new Date().toISOString()));
    act(() => { vi.advanceTimersByTime(14 * 60_000); });
    expect(result.current.getHours() * 60 + result.current.getMinutes()).toBe(10 * 60);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.getHours() * 60 + result.current.getMinutes()).toBe(10 * 60 + 15);
  });

  it('cleans up its timer and listener', () => {
    const { unmount } = renderHook(() => useNow(() => new Date().toISOString()));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
