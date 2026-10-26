import { describe, expect, it } from 'vitest';
import { nextAttemptState, retryInSeconds, triesLeft, type AttemptState } from './rateLimit';

const fail = (s: AttemptState, now: number) => nextAttemptState(s, false, now);

describe('nextAttemptState', () => {
  it('does not lock on the 4th failure but locks on the 5th', () => {
    let s: AttemptState = { failures: 0 };
    for (let i = 0; i < 4; i++) s = fail(s, 1000);
    expect(s).toEqual({ failures: 4 });
    s = fail(s, 1000);
    expect(s.lockedUntil).toBe(31000);
  });
  it('resets on success', () => {
    expect(nextAttemptState({ failures: 3 }, true, 5)).toEqual({ failures: 0 });
  });
  it('ignores attempts while locked', () => {
    const locked: AttemptState = { failures: 5, lockedUntil: 31000 };
    expect(nextAttemptState(locked, false, 2000)).toEqual(locked);
    expect(nextAttemptState(locked, true, 2000)).toEqual(locked);
  });
  it('starts fresh after the lock expires', () => {
    const locked: AttemptState = { failures: 5, lockedUntil: 31000 };
    expect(nextAttemptState(locked, false, 31000)).toEqual({ failures: 1 });
    expect(nextAttemptState(locked, true, 40000)).toEqual({ failures: 0 });
  });
});

describe('retryInSeconds', () => {
  it('is 0 when not locked or expired', () => {
    expect(retryInSeconds({ failures: 2 }, 0)).toBe(0);
    expect(retryInSeconds({ failures: 5, lockedUntil: 1000 }, 1000)).toBe(0);
    expect(retryInSeconds({ failures: 5, lockedUntil: 1000 }, 5000)).toBe(0);
  });
  it('rounds up', () => {
    expect(retryInSeconds({ failures: 5, lockedUntil: 31000 }, 1000)).toBe(30);
    expect(retryInSeconds({ failures: 5, lockedUntil: 31000 }, 1001)).toBe(30);
    expect(retryInSeconds({ failures: 5, lockedUntil: 31000 }, 30001)).toBe(1);
  });
});

describe('triesLeft', () => {
  it('counts down from live failures', () => {
    expect(triesLeft({ failures: 0 }, 0)).toBe(5);
    expect(triesLeft({ failures: 3 }, 0)).toBe(2);
  });
  it('is 0 while locked', () => {
    expect(triesLeft({ failures: 5, lockedUntil: 31000 }, 2000)).toBe(0);
  });
  it('is back to max once the lock has expired', () => {
    expect(triesLeft({ failures: 5, lockedUntil: 31000 }, 31000)).toBe(5);
  });
  it('never goes below 0 and honours a custom max', () => {
    expect(triesLeft({ failures: 9 }, 0)).toBe(0);
    expect(triesLeft({ failures: 1 }, 0, 3)).toBe(2);
  });
});
