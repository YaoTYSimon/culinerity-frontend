import { describe, expect, it } from 'vitest';
import { nextAttemptState, retryInSeconds, type AttemptState } from './rateLimit';

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
