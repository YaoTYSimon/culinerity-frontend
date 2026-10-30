import type { Bp, Cents, Recurring } from './types';

/** Dollars to whole cents, half away from zero. Non-finite input gives 0 (callers parse first). */
export function toCents(aud: number): Cents {
  if (!Number.isFinite(aud)) return 0;
  const cents = Math.round(Number((Math.abs(aud) * 100).toPrecision(15)));
  return aud < 0 ? -cents : cents;
}

/** A recurring amount as weekly cents: week x1, fortnight /2, month x12/52, rounded half up once. */
export function toWeeklyCents(r: Recurring): Cents {
  switch (r.per) {
    case 'week':
      return r.cents;
    case 'fortnight':
      return Math.floor((r.cents + 1) / 2);
    case 'month':
      return Math.floor((r.cents * 12 + 26) / 52);
  }
}

/** `base` x `bp` / 10000 in cents, rounded half away from zero. */
export function deltaBp(base: Cents, bp: Bp): Cents {
  const exact = Math.abs(base) * Math.abs(bp);
  const rounded = Math.floor((exact + 5000) / 10000);
  return (base < 0) !== (bp < 0) && rounded !== 0 ? -rounded : rounded;
}

// Digits with up to two decimals and an optional trailing %: "10", "10%", "7.25", ".5".
const PERCENT = /^(\d*)(?:\.(\d{1,2}))?\s*%?$/;

/** Typed percentage to basis points; null for blank, signed, exponent, over-precise or above max. */
export function parsePercentBp(text: string, opts: { max: Bp }): Bp | null {
  const m = PERCENT.exec(text.trim());
  if (!m || (m[1] === '' && m[2] === undefined)) return null;
  const bp = Number(m[1] || '0') * 100 + Number((m[2] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(bp) && bp <= opts.max ? bp : null;
}

/** "$42", "$12.50", "$20,000". Callers pass absolute values; a negative gets a leading minus. */
export function formatCents(c: Cents): string {
  const abs = Math.abs(c);
  const dollars = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+$)/g, ',');
  const rem = abs % 100;
  return `${c < 0 ? '-' : ''}$${dollars}${rem === 0 ? '' : `.${String(rem).padStart(2, '0')}`}`;
}
