const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

/** A UUID v4 from crypto.randomUUID, else from crypto.getRandomValues, else null (refuse to make one). */
export function newId(): string | null {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    if (c && typeof c.getRandomValues === 'function') {
      const b = c.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = Array.from(b, (x) => HEX[x]);
      return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
    }
  } catch {
    // fall through
  }
  return null;
}

/** Passcodes need Web Crypto PBKDF2 and secure random bytes; never fall back to anything weaker. */
export function supportsPasscode(): boolean {
  try {
    const c = globalThis.crypto;
    return !!c && typeof c.getRandomValues === 'function' && !!c.subtle && typeof c.subtle.importKey === 'function' && typeof c.subtle.deriveBits === 'function';
  } catch {
    return false;
  }
}
