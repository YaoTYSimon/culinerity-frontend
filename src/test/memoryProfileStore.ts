import type { Profile } from '../domain/types';
import type { ProfileStore } from '../storage/profileStore';

/** In-memory ProfileStore for tests; `saved` records every save. */
export class MemoryProfileStore implements ProfileStore {
  saved: Profile[] = [];
  constructor(private profile: Profile = {}) {}
  load(): Profile { return { ...this.profile }; }
  save(p: Profile): void { this.profile = { ...p }; this.saved.push({ ...p }); }
  clear(): void { this.profile = {}; }
}
