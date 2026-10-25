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
    return { ok: false, value, reason: 'Please use letters and numbers only.' };
  }
  return { ok: true, value };
}

function isWeak(p: string): boolean {
  const digits = [...p].map(Number);
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

export function validatePasscode(p: string): { ok: boolean; reason?: string } {
  if (!/^[0-9]{4,8}$/.test(p)) return { ok: false, reason: 'Use 4 to 8 digits.' };
  if (isWeak(p)) return { ok: false, reason: WEAK_MESSAGE };
  return { ok: true };
}

export function isDeletionConfirmed(account: AccountRecord, typed: string): boolean {
  return typed.trim() === account.name;
}
