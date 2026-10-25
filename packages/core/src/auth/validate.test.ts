import { describe, expect, it } from 'vitest';
import { isDeletionConfirmed, validateName, validatePasscode } from './validate';
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
    expect(r.reason).toBeTruthy();
    expect(validateName('a\tb').ok).toBe(false);
    expect(validateName('a\u007Fb').ok).toBe(false);
  });
});

describe('validatePasscode', () => {
  it('accepts good passcodes', () => {
    expect(validatePasscode('5829').ok).toBe(true);
    expect(validatePasscode('908413').ok).toBe(true);
  });
  it('rejects non-digits and bad lengths', () => {
    for (const p of ['123', '123456789', '12a4', '', '58 29', '５８２９']) {
      expect(validatePasscode(p).ok, p).toBe(false);
    }
  });
  it('rejects easy-to-guess passcodes with the kind message', () => {
    for (const p of ['0000', '1111', '1234', '4321', '0123', '7890', '0987', '1212', '123123', '12341234']) {
      const r = validatePasscode(p);
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
