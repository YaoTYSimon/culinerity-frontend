import { parseProfile, type Profile, type ProfileStore } from '@culinerity/core';

const KEY = 'culinerity.profile.v1';

/** localStorage-backed profile. Never throws: storage can be blocked, full or corrupt. */
export class LocalProfileStore implements ProfileStore {
  load(): Profile {
    try {
      return parseProfile(localStorage.getItem(KEY));
    } catch {
      return {};
    }
  }

  save(p: Profile): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Storage unavailable or full: the profile simply isn't persisted.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to do.
    }
  }
}
