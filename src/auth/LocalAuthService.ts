import {
  isDeletionConfirmed,
  MAX_FAILURES,
  nextAttemptState,
  parseProfile,
  retryInSeconds,
  THEME_IDS,
  triesLeft,
  validateName,
  validatePasscode,
  type AccountRecord,
  type AttemptState,
  type AuthService,
  type CreateFailureReason,
  type CreateInput,
  type CreateResult,
  type RemoveLeftover,
  type RemoveResult,
  type ProfileId,
  type SignInResult,
} from '@culinerity/core';
import { KEYS, profileKey } from './storageKeys';
import { newId, supportsPasscode } from './uuid';
import { createVerifier, isVerifier, verifyPasscode } from './verifier';

export interface LocalAuthOptions {
  /** Injected clock (ms). Defaults to Date.now. */
  now?: () => number;
}

const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/;
const STORAGE_MESSAGE = "We couldn't save to this browser. Check that storage is allowed and try again.";

function local(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
function session(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

function sanitiseAccount(x: unknown): AccountRecord | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const r = x as Record<string, unknown>;
  if (typeof r.id !== 'string' || !SAFE_ID.test(r.id)) return null;
  if (typeof r.name !== 'string' || typeof r.createdAt !== 'string') return null;
  const colour = THEME_IDS.find((c) => c === r.colour);
  if (!colour) return null;
  const account: AccountRecord = { id: r.id, name: r.name, colour, createdAt: r.createdAt };
  if (r.verifier !== undefined) {
    // A corrupt verifier must not turn a locked profile into an open one: drop the whole record.
    if (!isVerifier(r.verifier)) return null;
    const v = r.verifier;
    account.verifier = { v: 1, salt: v.salt, iterations: v.iterations, hash: v.hash };
  }
  return account;
}

function sanitiseAttempt(x: unknown): AttemptState | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  if (typeof r.failures !== 'number' || !Number.isFinite(r.failures) || r.failures < 0) return null;
  if (r.lockedUntil !== undefined && (typeof r.lockedUntil !== 'number' || !Number.isFinite(r.lockedUntil))) return null;
  return r.lockedUntil === undefined ? { failures: r.failures } : { failures: r.failures, lockedUntil: r.lockedUntil };
}

/** On-device profiles with an optional passcode. Storage-backed, never throws, never keeps a passcode. */
export class LocalAuthService implements AuthService {
  private readonly now: () => number;
  private readonly listeners = new Set<() => void>();
  /** Fallback when storage can't be written: the soft lock still holds for this page. */
  private readonly queues = new Map<ProfileId, Promise<void>>();
  private readonly memoryAttempts = new Map<ProfileId, AttemptState>();

  constructor(opts: LocalAuthOptions = {}) {
    this.now = opts.now ?? Date.now;
  }

  /** Call `listener` after any change here or in another tab. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1 && typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorage);
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && typeof window !== 'undefined') {
        window.removeEventListener('storage', this.onStorage);
      }
    };
  }

  private readonly onStorage = (): void => this.emit();

  private emit(): void {
    for (const l of [...this.listeners]) {
      try {
        l();
      } catch {
        // A faulty listener must not break the service.
      }
    }
  }

  // ---- reads (always from storage) ----

  list(): AccountRecord[] {
    try {
      return this.readAccounts().valid;
    } catch {
      return [];
    }
  }

  /** Valid accounts, plus the raw entries that failed sanitising (kept so writes never erase them). */
  private readAccounts(): { valid: AccountRecord[]; foreign: unknown[] } {
    const raw = local()?.getItem(KEYS.accounts);
    if (!raw) return { valid: [], foreign: [] };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { valid: [], foreign: [] };
    }
    if (!Array.isArray(parsed)) return { valid: [], foreign: [] };
    const seen = new Set<string>();
    const valid: AccountRecord[] = [];
    const foreign: unknown[] = [];
    for (const item of parsed) {
      const a = sanitiseAccount(item);
      if (!a) foreign.push(item);
      else if (!seen.has(a.id)) {
        seen.add(a.id);
        valid.push(a);
      }
    }
    return { valid, foreign };
  }

  current(): AccountRecord | null {
    try {
      const id = session()?.getItem(KEYS.session);
      if (!id) return null;
      return this.list().find((a) => a.id === id) ?? null;
    } catch {
      return null;
    }
  }

  // ---- create ----

  /**
   * Never throws. An empty-string passcode means "no passcode" (the UI should pass undefined;
   * '' is tolerated so a blank field can't create a half-protected profile).
   */
  async create(input: CreateInput): Promise<CreateResult> {
    try {
      return await this.doCreate(input);
    } catch {
      return { ok: false, reason: 'storage', message: STORAGE_MESSAGE };
    }
  }

  private async doCreate(input: CreateInput): Promise<CreateResult> {
    const name = validateName(typeof input.name === 'string' ? input.name : '');
    if (!name.ok) return fail('invalid-name', name.reason ?? 'Please enter a name.');
    const colour = THEME_IDS.find((c) => c === input.colour);
    if (!colour) return fail('invalid-colour', 'Please choose a colour.');

    const passcode = input.passcode ? input.passcode : undefined;
    if (passcode !== undefined) {
      if (!supportsPasscode()) {
        return fail('passcode-unsupported', "This browser can't protect profiles with a passcode.");
      }
      const p = validatePasscode(passcode);
      if (!p.ok) return fail('invalid-passcode', p.reason ?? 'Use 4 to 8 digits.');
    }
    const id = newId();
    if (!id) return fail('no-id', "This browser can't create profiles safely.");

    const account: AccountRecord = { id, name: name.value, colour, createdAt: new Date(this.now()).toISOString() };
    if (passcode !== undefined) account.verifier = await createVerifier(passcode);

    const ls = local();
    if (!ls) return fail('storage', STORAGE_MESSAGE);

    const guestRaw = input.migrateGuestData ? ls.getItem(profileKey()) : null;
    const profile = guestRaw !== null ? parseProfile(guestRaw) : {};
    const data = JSON.stringify({ ...profile, welcomeSeen: true });
    const key = profileKey(id);
    const rollback = (): void => {
      this.tryRun(() => ls.removeItem(key));
      this.tryRun(() => this.updateAccounts((list) => list.filter((a) => a.id !== id)));
    };
    try {
      ls.setItem(key, data);
      if (ls.getItem(key) !== data) throw new Error('read-back mismatch');
      // Re-read the list now and merge by id, so another tab's profile is not lost.
      this.updateAccounts((list) => [...list.filter((a) => a.id !== id), account]);
      if (guestRaw !== null) ls.removeItem(profileKey());
    } catch {
      rollback();
      return fail('storage', STORAGE_MESSAGE);
    }
    this.emit();
    return { ok: true, account };
  }

  // ---- sign in / out ----

  /**
   * Sign-ins for the same profile id are serialised: a second call waits for the first, then re-reads
   * the attempt state, so parallel or double-submitted calls each count once and the lock engages on
   * the 5th failure. The hash can also finish after a lock appeared (another tab), so the state is
   * re-read afterwards and a locked profile never gets a session.
   */
  signIn(id: ProfileId, passcode?: string): Promise<SignInResult> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const run = previous.then(() => this.doSignIn(id, passcode));
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(id, tail);
    void tail.then(() => {
      if (this.queues.get(id) === tail) this.queues.delete(id);
    });
    return run;
  }

  private async doSignIn(id: ProfileId, passcode?: string): Promise<SignInResult> {
    try {
      const account = this.list().find((a) => a.id === id);
      if (!account) return { ok: false, reason: 'unknown-profile' };
      if (account.verifier) {
        if (typeof passcode !== 'string' || passcode === '') return { ok: false, reason: 'needs-passcode' };
        const locked = (): SignInResult | null => {
          const wait = retryInSeconds(this.readAttempt(id), this.now());
          return wait > 0 ? { ok: false, reason: 'too-many-attempts', retryInSeconds: wait } : null;
        };
        const early = locked();
        if (early) return early;
        const ok = await verifyPasscode(passcode, account.verifier);
        // The lock may have engaged while hashing (another tab): never sign in, never count again.
        const late = locked();
        if (late) return late;
        const after = nextAttemptState(this.readAttempt(id), ok, this.now());
        this.writeAttempt(id, after);
        if (!ok) {
          const wait = retryInSeconds(after, this.now());
          if (wait > 0) return { ok: false, reason: 'too-many-attempts', retryInSeconds: wait };
          return { ok: false, reason: 'wrong-passcode', triesLeft: triesLeft(after, this.now(), MAX_FAILURES) };
        }
      }
      const ss = session();
      if (!ss) return { ok: false, reason: 'storage-error' };
      ss.setItem(KEYS.session, id);
      this.emit();
      return { ok: true, account };
    } catch {
      return { ok: false, reason: 'storage-error' };
    }
  }

  lock(): void {
    this.clearSession();
  }

  signOut(): void {
    this.clearSession();
  }

  private clearSession(): void {
    this.tryRun(() => session()?.removeItem(KEYS.session));
    this.emit();
  }

  // ---- remove ----

  /** Attempts every deletion step even if one throws; `remaining` says what is still in storage. */
  async remove(id: ProfileId, confirmName: string): Promise<RemoveResult> {
    let account: AccountRecord | undefined;
    try {
      account = this.list().find((a) => a.id === id);
    } catch {
      account = undefined;
    }
    if (!account) return { ok: false, reason: 'unknown-profile', remaining: [] };
    if (typeof confirmName !== 'string' || !isDeletionConfirmed(account, confirmName)) {
      return { ok: false, reason: 'name-mismatch', remaining: [] };
    }
    const remaining: RemoveLeftover[] = [];
    const step = (what: RemoveLeftover, fn: () => void): void => {
      try {
        fn();
      } catch {
        remaining.push(what);
      }
    };
    // Data first: a profile left without data is harmless; data left without a profile is not.
    step('data', () => {
      const ls = local();
      if (!ls) throw new Error('storage unavailable');
      ls.removeItem(profileKey(id));
    });
    this.memoryAttempts.delete(id);
    step('attempts', () => {
      const all = this.readAttempts();
      if (id in all) {
        delete all[id];
        local()?.setItem(KEYS.attempts, JSON.stringify(all));
      }
    });
    step('account', () => this.updateAccounts((list) => list.filter((a) => a.id !== id)));
    step('session', () => {
      const ss = session();
      if (ss?.getItem(KEYS.session) === id) ss.removeItem(KEYS.session);
    });
    this.emit();
    return remaining.length === 0 ? { ok: true } : { ok: false, reason: 'storage-error', remaining };
  }

  // ---- storage helpers ----

  /** Re-read, apply `change` to the valid accounts, and write back with malformed entries preserved. */
  private updateAccounts(change: (list: AccountRecord[]) => AccountRecord[]): void {
    const ls = local();
    if (!ls) throw new Error('storage unavailable');
    const { valid, foreign } = this.readAccounts();
    ls.setItem(KEYS.accounts, JSON.stringify([...change(valid), ...foreign]));
  }

  private readAttempts(): Record<string, AttemptState> {
    const out: Record<string, AttemptState> = {};
    try {
      const raw = local()?.getItem(KEYS.attempts);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          const s = sanitiseAttempt(v);
          if (s && SAFE_ID.test(k)) out[k] = s;
        }
      }
    } catch {
      // unreadable: treated as empty
    }
    return out;
  }

  /** The stricter of the stored and in-memory state, so unwritable storage can't reset the pause. */
  private readAttempt(id: ProfileId): AttemptState {
    const stored = this.readAttempts()[id] ?? { failures: 0 };
    const mem = this.memoryAttempts.get(id);
    if (!mem) return stored;
    return (mem.lockedUntil ?? 0) > (stored.lockedUntil ?? 0) || mem.failures > stored.failures ? mem : stored;
  }

  private writeAttempt(id: ProfileId, state: AttemptState): void {
    this.memoryAttempts.set(id, state);
    this.tryRun(() => {
      const all = this.readAttempts();
      all[id] = state;
      local()?.setItem(KEYS.attempts, JSON.stringify(all));
    });
  }

  private tryRun(fn: () => void): void {
    try {
      fn();
    } catch {
      // Storage unavailable: nothing more to do.
    }
  }
}

function fail(reason: CreateFailureReason, message: string): CreateResult {
  return { ok: false, reason, message };
}
