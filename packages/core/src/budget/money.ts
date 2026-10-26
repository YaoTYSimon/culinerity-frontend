export interface ParseMoneyOptions {
  /** Accept 0 (default true). */
  allowZero?: boolean;
  /** Largest accepted amount (default: no limit). */
  max?: number;
}

// Optional "$", then whole dollars (plain or with thousands commas), then up to two decimal digits.
const MONEY = /^\$?\s*([1-9]\d{0,2}(?:,\d{3})+|\d+)?(?:\.(\d{1,2}))?$/;

/**
 * Parse typed dollars ("12", "12.5", "$12.50", "1,200") into a number rounded to cents.
 * Blank, non-numeric, negative, over-precise or out-of-range text gives null, never NaN.
 */
export function parseMoney(text: string, opts: ParseMoneyOptions = {}): number | null {
  const { allowZero = true, max = Infinity } = opts;
  const m = MONEY.exec(text.trim());
  if (!m || (m[1] === undefined && m[2] === undefined)) return null;
  const n = Math.round(Number(`${(m[1] ?? '0').replace(/,/g, '')}.${m[2] ?? '0'}`) * 100) / 100;
  if (!Number.isFinite(n) || n > max || (n === 0 && !allowZero)) return null;
  return n;
}

/** Spending as a percentage of income to one decimal; null without a positive income. */
export function shareOfIncome(spent: number, income: number | undefined): number | null {
  if (typeof income !== 'number' || !Number.isFinite(income) || income <= 0) return null;
  return Math.round((spent / income) * 1000) / 10;
}
