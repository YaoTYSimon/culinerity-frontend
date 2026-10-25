export interface AttemptState {
  failures: number;
  lockedUntil?: number;
}

export const MAX_FAILURES = 5;
export const LOCK_MS = 30000;

function isLocked(state: AttemptState, nowMs: number): boolean {
  return state.lockedUntil !== undefined && nowMs < state.lockedUntil;
}

export function nextAttemptState(state: AttemptState, ok: boolean, nowMs: number): AttemptState {
  if (isLocked(state, nowMs)) return state;
  if (ok) return { failures: 0 };
  const base = state.lockedUntil !== undefined ? 0 : state.failures;
  const failures = base + 1;
  return failures >= MAX_FAILURES ? { failures, lockedUntil: nowMs + LOCK_MS } : { failures };
}

export function retryInSeconds(state: AttemptState, nowMs: number): number {
  if (!isLocked(state, nowMs)) return 0;
  return Math.ceil(((state.lockedUntil as number) - nowMs) / 1000);
}
