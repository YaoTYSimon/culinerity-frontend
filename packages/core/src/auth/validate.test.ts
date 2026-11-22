import { describe, expect, it } from 'vitest';
import { isDeletionConfirmed, validateName, validatePassword } from './validate';
import type { AccountRecord } from './types';

describe('validateName', () => {
  it('accepts and trims', () => {
    expect(validateName('Sam')).toEqual({ ok: true, value: 'Sam' });
    expect(validateName('  Sam ')).toEqual({ ok: true, value: 'Sam' });
  });
  it('rejects empty, whitespace-only and too long', () => {
    expect(validateName('').ok).toBe(false);
    expect(validateName('   ').ok).toBe(false);
    expect(validateName('a'.repeat(25)).ok).toBe(false);
    expect(validateName('a'.repeat(24)).ok).toBe(true);
  });
  it('rejects control characters', () => {
    const r = validateName('a\u0000b');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('Please remove any hidden or control characters.');
    expect(validateName('a\tb').ok).toBe(false);
    expect(validateName('a\u007Fb').ok).toBe(false);
  });
});

describe('validatePassword', () => {
  const MSG = 'Use 6 to 64 characters.';
  it('accepts 6 to 64 characters, any kind', () => {
    for (const p of ['abcdef', 'correct horse battery', 'p@ss w0rd!', '  spaced  ', '908413', 'x'.repeat(64)]) {
      expect(validatePassword(p).ok, p).toBe(true);
    }
  });
  it('rejects under 6 and over 64 with the short message', () => {
    for (const p of ['', 'a', 'abcde', '5829', 'x'.repeat(65)]) {
      const r = validatePassword(p);
      expect(r.ok, p).toBe(false);
      expect(r.reason, p).toBe(MSG);
    }
  });
  it('counts code points, not UTF-16 units', () => {
    expect(validatePassword('\u{1F600}'.repeat(6)).ok).toBe(true);
    expect(validatePassword('\u{1F600}'.repeat(5)).ok).toBe(false);
    expect(validatePassword('\u{1F600}'.repeat(64)).ok).toBe(true);
    expect(validatePassword('\u{1F600}'.repeat(65)).ok).toBe(false);
  });
  it('does not trim', () => {
    expect(validatePassword('ab    ').ok).toBe(true);
    expect(validatePassword('      ').ok).toBe(true);
    expect(validatePassword('ab   ').ok).toBe(false);
  });
  it('rejects control characters', () => {
    for (const p of ['abc\u0000def', 'abc\tdef', 'abc\ndef', 'abc\u007Fdef', 'abc\u0085def']) {
      expect(validatePassword(p).ok, JSON.stringify(p)).toBe(false);
    }
  });
  it('still rejects easy-to-guess digit and repeated passwords with the kind message', () => {
    for (const p of ['000000', '111111', '123456', '654321', '234567', '123123', '12341234']) {
      const r = validatePassword(p);
      expect(r.ok, p).toBe(false);
      expect(r.reason, p).toBe('That one is easy to guess. Try another.');
    }
  });
});

describe('isDeletionConfirmed', () => {
  const a: AccountRecord = { id: 'x', name: 'Sam', colour: 'sand', createdAt: '2026-01-01T00:00:00Z' };
  it('is exact after trim', () => {
    expect(isDeletionConfirmed(a, 'Sam')).toBe(true);
    expect(isDeletionConfirmed(a, '  Sam ')).toBe(true);
    expect(isDeletionConfirmed(a, 'sam')).toBe(false);
    expect(isDeletionConfirmed(a, 'Sa')).toBe(false);
    expect(isDeletionConfirmed(a, '')).toBe(false);
  });
});
