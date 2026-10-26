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
  type ProfileId,
  type SignInResult,
  type ThemeId,
} from '@culinerity/core';
import { KEYS, profileKey } from './storageKeys';
import { newId, supportsPasscode } from './uuid';
import { createVerifier, isVerifier, verifyPasscode } from './verifier';

export interface CreateInput {
  name: string;
  colour: ThemeId;
  passcode?: string;
  migrateGuestData?: boolean;
}

export type CreateFailure =
  | 'invalid-name'
  | 'invalid-passcode'
  | 'passcode-unsupported'
  | 'no-id'
  | 'storage';

export type CreateResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; reason: CreateFailure; message: string };

/** Thrown only by the interface-shaped `create()`; carries a calm message and never a secret. */
export class CreateError extends Error {
  constructor(
    readonly reason: CreateFailure,
    message: string,
  ) {
    super(message);
    this.name = 'CreateError';
  }
}

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
      const raw = local()?.getItem(KEYS.accounts);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set<string>();
      const out: AccountRecord[] = [];
      for (const item of parsed) {
        const a = sanitiseAccount(item);
        if (a && !seen.has(a.id)) {
          seen.add(a.id);
          out.push(a);
        }
      }
      return out;
    } catch {
      return [];
    }
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

  async createAccount(input: CreateInput): Promise<CreateResult> {
    try {
      return await this.doCreate(input);
    } catch {
      return { ok: false, reason: 'storage', message: STORAGE_MESSAGE };
    }
  }

  /** AuthService-shaped create: resolves with the account, or rejects with a CreateError. Prefer createAccount. */
  async create(input: CreateInput): Promise<AccountRecord> {
    const r = await this.createAccount(input);
    if (r.ok) return r.account;
    throw new CreateError(r.reason, r.message);
  }

  private async doCreate(input: CreateInput): Promise<CreateResult> {
    const name = validateName(typeof input.name === 'string' ? input.name : '');
    if (!name.ok) return fail('invalid-name', name.reason ?? 'Please enter a name.');
    const colour = THEME_IDS.find((c) => c === input.colour);
    if (!colour) return fail('invalid-name', 'Please choose a colour.');

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
      this.tryRun(() => this.writeAccounts(this.list().filter((a) => a.id !== id)));
    };
    try {
      ls.setItem(key, data);
      if (ls.getItem(key) !== data) throw new Error('read-back mismatch');
      // Re-read the list now and merge by id, so another tab's profile is not lost.
      this.writeAccounts([...this.list().filter((a) => a.id !== id), account]);
      if (guestRaw !== null) ls.removeItem(profileKey());
    } catch {
      rollback();
      return fail('storage', STORAGE_MESSAGE);
    }
    this.emit();
    return { ok: true, account };
  }

  // ---- sign in / out ----

  async signIn(id: ProfileId, passcode?: string): Promise<SignInResult> {
    try {
      const account = this.list().find((a) => a.id === id);
      if (!account) return { ok: false, reason: 'unknown-profile' };
      if (account.verifier) {
        if (typeof passcode !== 'string' || passcode === '') return { ok: false, reason: 'needs-passcode' };
        const before = this.readAttempt(id);
        if (retryInSeconds(before, this.now()) > 0) {
          return { ok: false, reason: 'too-many-attempts', retryInSeconds: retryInSeconds(before, this.now()) };
        }
        const ok = await verifyPasscode(passcode, account.verifier);
        // Re-read: another tab may have recorded attempts while we were hashing.
        const after = nextAttemptState(this.readAttempt(id), ok, this.now());
        this.writeAttempt(id, after);
        if (!ok) {
          const wait = retryInSeconds(after, this.now());
          if (wait > 0) return { ok: false, reason: 'too-many-attempts', retryInSeconds: wait };
          return { ok: false, reason: 'wrong-passcode', triesLeft: triesLeft(after, this.now(), MAX_FAILURES) };
        }
      }
      const ss = session();
      if (!ss) return { ok: false, reason: 'unknown-profile' };
      ss.setItem(KEYS.session, id);
      this.emit();
      return { ok: true, account };
    } catch {
      return { ok: false, reason: 'unknown-profile' };
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

  async remove(id: ProfileId, confirmName: string): Promise<boolean> {
    try {
      const account = this.list().find((a) => a.id === id);
      if (!account || typeof confirmName !== 'string' || !isDeletionConfirmed(account, confirmName)) return false;
      const ls = local();
      if (!ls) return false;
      // Data first: a profile left without data is harmless; data left without a profile is not.
      ls.removeItem(profileKey(id));
      this.memoryAttempts.delete(id);
      const attempts = this.readAttempts();
      if (id in attempts) {
        delete attempts[id];
        ls.setItem(KEYS.attempts, JSON.stringify(attempts));
      }
      this.writeAccounts(this.list().filter((a) => a.id !== id));
      if (session()?.getItem(KEYS.session) === id) session()?.removeItem(KEYS.session);
      this.emit();
      return true;
    } catch {
      return false;
    }
  }

  // ---- storage helpers ----

  private writeAccounts(accounts: AccountRecord[]): void {
    const ls = local();
    if (!ls) throw new Error('storage unavailable');
    ls.setItem(KEYS.accounts, JSON.stringify(accounts));
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

function fail(reason: CreateFailure, message: string): CreateResult {
  return { ok: false, reason, message };
}
