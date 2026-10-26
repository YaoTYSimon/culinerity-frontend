import type { AccountRecord } from '@culinerity/core';

type Verifier = NonNullable<AccountRecord['verifier']>;

export const ITERATIONS = 210000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
/** Upper bound for stored iteration counts: a tampered huge value must not hang the tab. */
const MAX_ITERATIONS = 5_000_000;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Strict base64 decode: null for anything malformed. */
function fromBase64(text: string): Uint8Array<ArrayBuffer> | null {
  if (typeof text !== 'string' || text.length % 4 !== 0 || !BASE64.test(text)) return null;
  try {
    const s = atob(text);
    const out = new Uint8Array(new ArrayBuffer(s.length));
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function derive(passcode: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, HASH_BYTES * 8);
  return new Uint8Array(bits);
}

/** Equal-length constant-time compare: no early return on a mismatching byte. */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * PBKDF2-HMAC-SHA-256 verifier. The passcode itself is never stored.
 * `opts` exists for known-vector tests only.
 */
export async function createVerifier(
  passcode: string,
  opts?: { salt?: Uint8Array<ArrayBuffer>; iterations?: number },
): Promise<Verifier> {
  const salt = opts?.salt ?? globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iterations = opts?.iterations ?? ITERATIONS;
  const hash = await derive(passcode, salt, iterations);
  return { v: 1, salt: toBase64(salt), iterations, hash: toBase64(hash) };
}

/** True only for the right passcode. Never throws: any error (bad data, no Web Crypto) is false. */
export async function verifyPasscode(passcode: string, verifier: Verifier): Promise<boolean> {
  try {
    if (typeof passcode !== 'string' || !isVerifier(verifier)) return false;
    const salt = fromBase64(verifier.salt);
    const expected = fromBase64(verifier.hash);
    if (!salt || !expected) return false;
    return equalBytes(await derive(passcode, salt, verifier.iterations), expected);
  } catch {
    return false;
  }
}

/** Shape check for a verifier read from storage: version, iterations, base64, 16-byte salt, 32-byte hash. */
export function isVerifier(x: unknown): x is Verifier {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  if (v.v !== 1 || typeof v.salt !== 'string' || typeof v.hash !== 'string') return false;
  if (typeof v.iterations !== 'number' || !Number.isInteger(v.iterations)) return false;
  if (v.iterations < 1 || v.iterations > MAX_ITERATIONS) return false;
  return fromBase64(v.salt)?.length === SALT_BYTES && fromBase64(v.hash)?.length === HASH_BYTES;
}
