import { pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createVerifier, verifyPasscode } from './verifier';
import { newId, supportsPasscode } from './uuid';

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

describe('verifier', () => {
  it('round-trips and rejects a wrong passcode', async () => {
    const v = await createVerifier('5829');
    expect(v.v).toBe(1);
    expect(v.iterations).toBe(210000);
    expect(await verifyPasscode('5829', v)).toBe(true);
    expect(await verifyPasscode('5830', v)).toBe(false);
  });
  it('never contains the passcode', async () => {
    const v = await createVerifier('5829');
    expect(JSON.stringify(v)).not.toContain('5829');
  });
  it('gives different salts and hashes for the same passcode', async () => {
    const a = await createVerifier('5829');
    const b = await createVerifier('5829');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
  it('matches Node pbkdf2Sync for a fixed salt and iterations', async () => {
    const salt = new Uint8Array(16).map((_, i) => i + 1);
    const v = await createVerifier('5829', { salt, iterations: 1000 });
    const expected = pbkdf2Sync('5829', Buffer.from(salt), 1000, 32, 'sha256');
    expect(v.hash).toBe(b64(new Uint8Array(expected)));
    expect(v.salt).toBe(b64(salt));
    expect(await verifyPasscode('5829', v)).toBe(true);
  });
  it('fails closed on tampering without throwing', async () => {
    const v = await createVerifier('5829');
    expect(await verifyPasscode('5829', { ...v, salt: b64(new Uint8Array(16)) })).toBe(false);
    expect(await verifyPasscode('5829', { ...v, hash: b64(new Uint8Array(32)) })).toBe(false);
    expect(await verifyPasscode('5829', { ...v, hash: v.hash.slice(0, 20) })).toBe(false);
    expect(await verifyPasscode('5829', { ...v, hash: b64(new Uint8Array(16)) })).toBe(false);
    expect(await verifyPasscode('5829', { ...v, hash: '!!!not base64' })).toBe(false);
    expect(await verifyPasscode('5829', { ...v, salt: '%%%' })).toBe(false);
    expect(await verifyPasscode('5829', { ...v, iterations: 0 })).toBe(false);
    expect(await verifyPasscode('5829', { ...v, iterations: -5 })).toBe(false);
    expect(await verifyPasscode('5829', { ...v, iterations: 1e12 })).toBe(false);
  });
  it('rejects an unknown version and garbage', async () => {
    const v = await createVerifier('5829');
    expect(await verifyPasscode('5829', { ...v, v: 2 } as never)).toBe(false);
    expect(await verifyPasscode('5829', null as never)).toBe(false);
    expect(await verifyPasscode(undefined as never, v)).toBe(false);
  });
});

describe('uuid', () => {
  it('makes distinct v4 ids', () => {
    const a = newId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newId()).not.toBe(a);
    expect(supportsPasscode()).toBe(true);
  });
  it('falls back to getRandomValues, then null', () => {
    const real = globalThis.crypto;
    const stub = (c: unknown) => Object.defineProperty(globalThis, 'crypto', { value: c, configurable: true });
    try {
      stub({ getRandomValues: real.getRandomValues.bind(real) });
      expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(supportsPasscode()).toBe(false);
      stub({});
      expect(newId()).toBeNull();
    } finally {
      stub(real);
    }
  });
});
