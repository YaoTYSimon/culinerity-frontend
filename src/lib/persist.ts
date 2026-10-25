import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

// In-progress UI state (unsubmitted questionnaire answers, form drafts, open panels)
// lives under this prefix so it survives reloads in the same browser and can be wiped
// alongside saved data.
export const DRAFT_PREFIX = 'hf_draft_';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    if (raw === null) return fallback;
    const stored = JSON.parse(raw) as T;
    // Merge over the default so drafts saved before a field was added still get it.
    return isPlainObject(fallback) && isPlainObject(stored) ? ({ ...fallback, ...stored } as T) : stored;
  } catch {
    return fallback;
  }
}

export function clearDraft(...keys: string[]): void {
  keys.forEach((key) => {
    try {
      localStorage.removeItem(DRAFT_PREFIX + key);
    } catch {
      // storage unavailable — nothing to clear
    }
  });
}

export function hasDraft(key: string): boolean {
  try {
    return localStorage.getItem(DRAFT_PREFIX + key) !== null;
  } catch {
    return false;
  }
}

export function clearAllDrafts(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(DRAFT_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage unavailable — nothing to clear
  }
}

/** useState that auto-saves to localStorage under `key` and restores on next visit. */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    read(key, typeof initial === 'function' ? (initial as () => T)() : initial)
  );

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(value));
    } catch {
      // storage full or blocked — keep working in memory
    }
  }, [key, value]);

  return [value, setValue];
}
