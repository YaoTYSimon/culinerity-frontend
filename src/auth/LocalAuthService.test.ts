import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalAuthService } from './LocalAuthService';
import { KEYS, profileKey } from './storageKeys';

let t = 1_000_000;
const make = () => new LocalAuthService({ now: () => t });
const PASS = '5829';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  t = 1_000_000;
});
afterEach(() => vi.restoreAllMocks());

async function mk(svc: LocalAuthService, name = 'Sam', passcode?: string) {
  const r = await svc.create({ name, colour: 'sand', passcode });
  if (!r.ok) throw new Error('create failed: ' + r.reason);
  return r.account;
}

describe('create / list / signIn', () => {
  it('creates, lists and signs in with the right passcode', async () => {
    const svc = make();
    const a = await mk(svc, ' Sam ', PASS);
    expect(a.name).toBe('Sam');
    expect(a.verifier?.v).toBe(1);
    expect(svc.list().map((x) => x.id)).toEqual([a.id]);
    expect(JSON.stringify(localStorage)).not.toContain(PASS);
    const r = await svc.signIn(a.id, PASS);
    expect(r.ok).toBe(true);
    expect(svc.current()?.id).toBe(a.id);
    expect(sessionStorage.getItem(KEYS.session)).toBe(a.id);
  });
  it('a new profile starts with welcomeSeen true', async () => {
    const a = await mk(make(), 'Sam');
    expect(JSON.parse(localStorage.getItem(profileKey(a.id)) ?? '{}')).toEqual({ welcomeSeen: true });
  });
  it('rejects bad names and weak passcodes with typed reasons', async () => {
    const svc = make();
    expect(await svc.create({ name: '  ', colour: 'sand' })).toMatchObject({ ok: false, reason: 'invalid-name' });
    expect(await svc.create({ name: 'A', colour: 'sand', passcode: '1234' })).toMatchObject({
      ok: false,
      reason: 'invalid-passcode',
    });
    expect(svc.list()).toEqual([]);
  });
  it('an invalid colour has its own reason; an empty passcode means no passcode', async () => {
    const svc = make();
    expect(await svc.create({ name: 'A', colour: 'neon' as never })).toMatchObject({ ok: false, reason: 'invalid-colour' });
    const r = await svc.create({ name: 'A', colour: 'sand', passcode: '' });
    expect(r.ok && r.account.verifier).toBeUndefined();
  });
  it('wrong passcode reports tries left; right passcode resets', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    expect(await svc.signIn(a.id, '0000')).toEqual({ ok: false, reason: 'wrong-passcode', triesLeft: 4 });
    expect(await svc.signIn(a.id, '9999')).toEqual({ ok: false, reason: 'wrong-passcode', triesLeft: 3 });
    expect((await svc.signIn(a.id, PASS)).ok).toBe(true);
    expect(await svc.signIn(a.id, '9999')).toEqual({ ok: false, reason: 'wrong-passcode', triesLeft: 4 });
  });
  it('5 wrong -> too-many-attempts with retryInSeconds, even for the right passcode', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    for (let i = 0; i < 4; i++) await svc.signIn(a.id, '9999');
    expect(await svc.signIn(a.id, '9999')).toEqual({ ok: false, reason: 'too-many-attempts', retryInSeconds: 30 });
    t += 10_000;
    expect(await svc.signIn(a.id, PASS)).toEqual({ ok: false, reason: 'too-many-attempts', retryInSeconds: 20 });
    expect(svc.current()).toBeNull();
  });
  it('the pause survives a new service instance; a correct passcode works after it', async () => {
    const a = await mk(make(), 'Sam', PASS);
    for (let i = 0; i < 5; i++) await make().signIn(a.id, '9999');
    const fresh = make();
    expect(await fresh.signIn(a.id, PASS)).toMatchObject({ ok: false, reason: 'too-many-attempts' });
    t += 30_000;
    expect((await fresh.signIn(a.id, PASS)).ok).toBe(true);
  });
  it('after the pause expires a wrong passcode has 4 tries left (live state)', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    for (let i = 0; i < 5; i++) await svc.signIn(a.id, '9999');
    t += 31_000;
    expect(await svc.signIn(a.id, '9999')).toEqual({ ok: false, reason: 'wrong-passcode', triesLeft: 4 });
  });
  it('passcode-less profiles sign in without needs-passcode', async () => {
    const svc = make();
    const a = await mk(svc, 'Kim');
    expect(a.verifier).toBeUndefined();
    expect((await svc.signIn(a.id)).ok).toBe(true);
  });
  it('a passcode profile without a passcode -> needs-passcode', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    expect(await svc.signIn(a.id)).toEqual({ ok: false, reason: 'needs-passcode' });
    expect(await svc.signIn(a.id, '')).toEqual({ ok: false, reason: 'needs-passcode' });
    expect(svc.current()).toBeNull();
  });
  it('unknown profile', async () => {
    expect(await make().signIn('nope', PASS)).toEqual({ ok: false, reason: 'unknown-profile' });
  });
  it('refuses passcodes when Web Crypto is missing', async () => {
    const real = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: real.getRandomValues.bind(real), randomUUID: real.randomUUID.bind(real) }, configurable: true });
    try {
      const svc = make();
      expect(await svc.create({ name: 'A', colour: 'sand', passcode: PASS })).toMatchObject({ ok: false, reason: 'passcode-unsupported' });
      expect((await svc.create({ name: 'A', colour: 'sand' })).ok).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true });
    }
  });
  it('refuses creation when no id can be made', async () => {
    const real = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    try {
      expect(await make().create({ name: 'A', colour: 'sand' })).toMatchObject({ ok: false, reason: 'no-id' });
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true });
    }
  });
});

describe('storage hygiene', () => {
  it('corrupt accounts JSON -> empty list', () => {
    for (const bad of ['{not json', '{"a":1}', '"x"', 'null']) {
      localStorage.setItem(KEYS.accounts, bad);
      expect(make().list()).toEqual([]);
    }
  });
  it('drops malformed entries, including ones with a corrupt verifier (fail closed)', () => {
    const good = { id: 'a1', name: 'A', colour: 'sand', createdAt: 'x' };
    localStorage.setItem(
      KEYS.accounts,
      JSON.stringify([
        good,
        { ...good, id: 'a2', verifier: { v: 1, salt: 's', iterations: -1, hash: 'h' } },
        { ...good, id: 'a3', colour: 'neon' },
        { ...good, id: '../x' },
        { ...good, id: 'a1' },
        7,
      ]),
    );
    expect(make().list().map((x) => x.id)).toEqual(['a1']);
  });
  it('current() is null when the session id points to a deleted profile', async () => {
    const svc = make();
    const a = await mk(svc);
    await svc.signIn(a.id);
    localStorage.setItem(KEYS.accounts, '[]');
    expect(svc.current()).toBeNull();
    sessionStorage.setItem(KEYS.session, 'ghost');
    expect(svc.current()).toBeNull();
  });
  it('lock and signOut clear the session', async () => {
    const svc = make();
    const a = await mk(svc);
    await svc.signIn(a.id);
    svc.lock();
    expect(svc.current()).toBeNull();
    await svc.signIn(a.id);
    svc.signOut();
    expect(sessionStorage.getItem(KEYS.session)).toBeNull();
  });
  it('merges with accounts written by another instance (re-read before write)', async () => {
    const a = make();
    const b = make();
    await mk(a, 'One');
    await mk(b, 'Two');
    expect(a.list().map((x) => x.name).sort()).toEqual(['One', 'Two']);
  });
});

describe('migration', () => {
  const guest = { score: 61, suburb: 'Carlton', welcomeSeen: false };
  it('moves guest data: guest key gone, new key has the data', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(guest));
    const a = await mk2(make(), true);
    expect(localStorage.getItem(KEYS.guestProfile)).toBeNull();
    expect(JSON.parse(localStorage.getItem(profileKey(a.id)) ?? '{}')).toEqual({ ...guest, welcomeSeen: true });
  });
  it('carries the pantry and shopping list over, cleaned', async () => {
    const pantry = { items: [{ id: 'a', name: 'Rice', ingredientId: 'rice', addedAt: '2026-10-29T01:00:00.000Z' }], staples: ['canola-oil'], serves: 4 };
    const shoppingList = [{ id: 's1', name: 'Onion', addedAt: '2026-10-29T01:00:00.000Z' }];
    localStorage.setItem(KEYS.guestProfile, JSON.stringify({ score: 1, pantry, shoppingList }));
    const a = await mk2(make(), true);
    expect(JSON.parse(localStorage.getItem(profileKey(a.id)) ?? '{}')).toEqual({ score: 1, pantry, shoppingList, welcomeSeen: true });
    expect(localStorage.getItem(KEYS.guestProfile)).toBeNull();
  });
  it('without migrateGuestData the guest key is untouched', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(guest));
    await mk2(make(), false);
    expect(JSON.parse(localStorage.getItem(KEYS.guestProfile) ?? '{}')).toEqual(guest);
  });
  it('a failed write leaves guest data intact, returns an error and creates no account', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(guest));
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k.startsWith(KEYS.guestProfile + '.')) throw new Error('quota');
      return real.call(this, k, v);
    });
    const r = await make().create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    expect(r).toMatchObject({ ok: false, reason: 'storage' });
    expect(JSON.parse(localStorage.getItem(KEYS.guestProfile) ?? '{}')).toEqual(guest);
    expect(make().list()).toEqual([]);
  });
  it('a read-back mismatch is a failure and rolls back', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(guest));
    const realGet = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, k: string) {
      return k.startsWith(KEYS.guestProfile + '.') ? '{"tampered":1}' : realGet.call(this, k);
    });
    const r = await make().create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    expect(r).toMatchObject({ ok: false, reason: 'storage' });
    vi.restoreAllMocks();
    expect(JSON.parse(localStorage.getItem(KEYS.guestProfile) ?? '{}')).toEqual(guest);
    expect(make().list()).toEqual([]);
    expect(Object.keys(localStorage).filter((k) => k.startsWith(KEYS.guestProfile + '.'))).toEqual([]);
  });
  it('a failed guest-key removal rolls back the new profile', async () => {
    localStorage.setItem(KEYS.guestProfile, JSON.stringify(guest));
    const realRemove = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, k: string) {
      if (k === KEYS.guestProfile) throw new Error('blocked');
      return realRemove.call(this, k);
    });
    const r = await make().create({ name: 'Sam', colour: 'sand', migrateGuestData: true });
    expect(r).toMatchObject({ ok: false, reason: 'storage' });
    expect(make().list()).toEqual([]);
    expect(Object.keys(localStorage).filter((k) => k.startsWith(KEYS.guestProfile + '.'))).toEqual([]);
  });
  async function mk2(svc: LocalAuthService, migrate: boolean) {
    const r = await svc.create({ name: 'Sam', colour: 'sand', migrateGuestData: migrate });
    if (!r.ok) throw new Error(r.reason);
    return r.account;
  }
});

describe('remove', () => {
  it('removes only that profile and its keys', async () => {
    const svc = make();
    const a = await mk(svc, 'Ann', PASS);
    const b = await mk(svc, 'Bob', PASS);
    localStorage.setItem(KEYS.guestProfile, '{"score":5}');
    localStorage.setItem(KEYS.theme, 'sand');
    await svc.signIn(a.id, '9999');
    await svc.signIn(b.id, '9999');
    expect(await svc.remove(a.id, 'Ann')).toEqual({ ok: true });
    expect(svc.list().map((x) => x.id)).toEqual([b.id]);
    expect(localStorage.getItem(profileKey(a.id))).toBeNull();
    expect(localStorage.getItem(profileKey(b.id))).not.toBeNull();
    expect(localStorage.getItem(KEYS.guestProfile)).toBe('{"score":5}');
    expect(localStorage.getItem(KEYS.theme)).toBe('sand');
    const attempts = JSON.parse(localStorage.getItem(KEYS.attempts) ?? '{}');
    expect(Object.keys(attempts)).toEqual([b.id]);
  });
  it('needs the exact typed name', async () => {
    const svc = make();
    const a = await mk(svc, 'Ann');
    expect(await svc.remove(a.id, 'ann')).toMatchObject({ ok: false, reason: 'name-mismatch' });
    expect(await svc.remove('ghost', 'Ann')).toMatchObject({ ok: false, reason: 'unknown-profile' });
    expect(svc.list()).toHaveLength(1);
  });
  it('signs out when removing the current profile only', async () => {
    const svc = make();
    const a = await mk(svc, 'Ann');
    const b = await mk(svc, 'Bob');
    await svc.signIn(a.id);
    await svc.remove(b.id, 'Bob');
    expect(svc.current()?.id).toBe(a.id);
    await svc.remove(a.id, 'Ann');
    expect(sessionStorage.getItem(KEYS.session)).toBeNull();
    expect(svc.current()).toBeNull();
  });
});

describe('race and storage errors', () => {
  it('parallel wrong passcodes count once each and the 5th locks', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    const results = await Promise.all(Array.from({ length: 7 }, () => svc.signIn(a.id, '9999')));
    expect(results.map((r) => (r.ok ? 'ok' : r.reason))).toEqual([
      'wrong-passcode', 'wrong-passcode', 'wrong-passcode', 'wrong-passcode',
      'too-many-attempts', 'too-many-attempts', 'too-many-attempts',
    ]);
    expect(results.slice(0, 4).map((r) => (r.ok ? -1 : r.triesLeft))).toEqual([4, 3, 2, 1]);
    expect(results[4]).toMatchObject({ retryInSeconds: 30 });
    expect(JSON.parse(localStorage.getItem(KEYS.attempts) ?? '{}')[a.id].failures).toBe(5);
  });
  it('a correct passcode that finishes hashing after the lock engaged does not sign in', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    const orig = crypto.subtle.deriveBits.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, 'deriveBits').mockImplementationOnce(async (...args) => {
      localStorage.setItem(KEYS.attempts, JSON.stringify({ [a.id]: { failures: 5, lockedUntil: t + 30_000 } }));
      return orig(...args);
    });
    const r = await svc.signIn(a.id, PASS);
    expect(r).toEqual({ ok: false, reason: 'too-many-attempts', retryInSeconds: 30 });
    expect(sessionStorage.getItem(KEYS.session)).toBeNull();
    expect(svc.current()).toBeNull();
  });
  it('returns storage-error when the session cannot be written', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string) {
      if (k === KEYS.session) throw new Error('blocked');
    });
    expect(await svc.signIn(a.id)).toEqual({ ok: false, reason: 'storage-error' });
  });
  it('returns storage-error when sessionStorage is unavailable', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam');
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(await svc.signIn(a.id)).toEqual({ ok: false, reason: 'storage-error' });
  });
});

describe('malformed entries and partial removal', () => {
  it('keeps malformed raw entries across writes', async () => {
    const weird = { id: 'zz', name: 'Old', colour: 'sand', createdAt: 'x', verifier: { v: 1, salt: 'bad', iterations: 1, hash: 'bad' } };
    localStorage.setItem(KEYS.accounts, JSON.stringify([weird, 7]));
    const svc = make();
    expect(svc.list()).toEqual([]);
    const a = await mk(svc, 'Ann');
    await svc.remove(a.id, 'Ann');
    expect(JSON.parse(localStorage.getItem(KEYS.accounts) ?? '[]')).toEqual([weird, 7]);
  });
  it('attempts every removal step and reports what remains', async () => {
    const svc = make();
    const a = await mk(svc, 'Ann', PASS);
    await svc.signIn(a.id, '9999');
    await svc.signIn(a.id, PASS);
    const realRemove = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, k: string) {
      if (k === profileKey(a.id)) throw new Error('blocked');
      return realRemove.call(this, k);
    });
    const r = await svc.remove(a.id, 'Ann');
    expect(r).toEqual({ ok: false, reason: 'storage-error', remaining: ['data'] });
    expect(svc.list()).toEqual([]);
    expect(sessionStorage.getItem(KEYS.session)).toBeNull();
  });
});

describe('subscribe', () => {
  it('notifies on own changes and on storage events, and unsubscribes', async () => {
    const svc = make();
    const fn = vi.fn();
    const off = svc.subscribe(fn);
    await mk(svc);
    expect(fn).toHaveBeenCalled();
    fn.mockClear();
    window.dispatchEvent(new StorageEvent('storage', { key: KEYS.accounts }));
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    fn.mockClear();
    window.dispatchEvent(new StorageEvent('storage', { key: KEYS.accounts }));
    svc.signOut();
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('secrets and failures', () => {
  it('never logs a passcode', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m));
    const svc = make();
    const a = await mk(svc, 'Sam', '7391');
    await svc.signIn(a.id, '1111');
    await svc.signIn(a.id, '7391');
    await svc.create({ name: 'X', colour: 'sand', passcode: '1234' });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('boom');
    });
    await svc.signIn(a.id, '7391');
    const out = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(out).not.toContain('7391');
    expect(out).not.toContain('1111');
  });
  it('never throws when storage throws in every operation', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    await svc.signIn(a.id, PASS);
    for (const m of ['getItem', 'setItem', 'removeItem'] as const) {
      vi.spyOn(Storage.prototype, m).mockImplementation(() => {
        throw new Error('blocked');
      });
    }
    expect(svc.list()).toEqual([]);
    expect(svc.current()).toBeNull();
    expect(await svc.create({ name: 'Z', colour: 'sand' })).toMatchObject({ ok: false });
    expect(await svc.signIn(a.id, PASS)).toMatchObject({ ok: false });
    expect(() => svc.lock()).not.toThrow();
    expect(() => svc.signOut()).not.toThrow();
    expect((await svc.remove(a.id, 'Sam')).ok).toBe(false);
    const off = svc.subscribe(() => {});
    expect(() => off()).not.toThrow();
  });
});

describe('a corrupt account list is never overwritten', () => {
  for (const raw of ['{not json', '{"a":1}', '"text"']) {
    it(`create() refuses and leaves ${raw} untouched`, async () => {
      localStorage.setItem(KEYS.accounts, raw);
      const r = await make().create({ name: 'Sam', colour: 'sand' });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reason).toBe('accounts-corrupt');
        expect(r.message).toMatch(/can't be read/i);
      }
      expect(localStorage.getItem(KEYS.accounts)).toBe(raw);
      expect(Object.keys(localStorage).filter((k) => k.startsWith('culinerity.profile.v1.'))).toEqual([]);
    });
  }
  it('remove() leaves it untouched too', async () => {
    localStorage.setItem(KEYS.accounts, '{not json');
    const r = await make().remove('abc', 'Sam');
    expect(r.ok).toBe(false);
    expect(localStorage.getItem(KEYS.accounts)).toBe('{not json');
  });
});

describe('writes for a removed profile', () => {
  it('a sign-in that finishes after the profile was removed (another tab) does not recreate its attempts entry', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    const p = svc.signIn(a.id, '9999');
    await new Promise((r) => setTimeout(r, 0));
    localStorage.setItem(KEYS.accounts, '[]');
    await p;
    expect(localStorage.getItem(KEYS.attempts) ?? '{}').not.toContain(a.id);
  });
});

describe('passcode length guard', () => {
  it('a passcode over 64 characters is wrong without any hashing', async () => {
    const svc = make();
    const a = await mk(svc, 'Sam', PASS);
    const spy = vi.spyOn(crypto.subtle, 'deriveBits');
    const r = await svc.signIn(a.id, 'x'.repeat(65));
    expect(r).toMatchObject({ ok: false, reason: 'wrong-passcode' });
    expect(spy).not.toHaveBeenCalled();
    expect(svc.current()).toBeNull();
  });
});
