import type { AccountRecord } from './types';

const NAME_MAX = 24;
const WEAK_MESSAGE = 'That one is easy to guess. Try another.';

export function validateName(name: string): { ok: boolean; value: string; reason?: string } {
  const value = name.trim();
  if (value.length === 0) return { ok: false, value, reason: 'Please enter a name.' };
  if (value.length > NAME_MAX) {
    return { ok: false, value, reason: `Keep it to ${NAME_MAX} characters or fewer.` };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F-\u009F]/.test(value)) {
    return { ok: false, value, reason: 'Please remove any hidden or control characters.' };
  }
  return { ok: true, value };
}

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 64;
const LENGTH_MESSAGE = `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;

/** Rejects easy digit-only passwords (as before): one digit repeated, runs up or down, short repeats. */
function isWeak(chars: string[]): boolean {
  if (!chars.every((c) => c >= '0' && c <= '9')) return false;
  const p = chars.join('');
  const digits = chars.map(Number);
  const n = digits.length;
  if (digits.every((d) => d === digits[0])) return true;
  const step = (a: number, b: number) => (b - a + 10) % 10;
  if (digits.slice(1).every((d, i) => step(digits[i], d) === 1)) return true;
  if (digits.slice(1).every((d, i) => step(digits[i], d) === 9)) return true;
  for (let len = 2; len <= n / 2; len++) {
    if (n % len === 0 && p === p.slice(0, len).repeat(n / len)) return true;
  }
  return false;
}

/** A password is 6 to 64 Unicode code points, any characters but control ones, never trimmed. */
export function validatePassword(p: string): { ok: boolean; reason?: string } {
  // A cheap bound first, so an absurdly long string is not split into code points.
  if (typeof p !== 'string' || p.length > PASSWORD_MAX * 2) return { ok: false, reason: LENGTH_MESSAGE };
  const chars = [...p];
  if (chars.length < PASSWORD_MIN || chars.length > PASSWORD_MAX) return { ok: false, reason: LENGTH_MESSAGE };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F-\u009F]/.test(p)) {
    return { ok: false, reason: 'Please remove any hidden or control characters.' };
  }
  if (isWeak(chars)) return { ok: false, reason: WEAK_MESSAGE };
  return { ok: true };
}

export function isDeletionConfirmed(account: AccountRecord, typed: string): boolean {
  return typed.trim() === account.name;
}
