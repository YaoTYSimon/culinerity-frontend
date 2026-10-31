import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { MAX_SPEND_AMOUNT, MAX_SPEND_NOTE, parseMoney, SPEND_CATEGORIES, type SpendEntry } from '@culinerity/core';
import { dayLabel } from './foodCopy';
import { INPUT_CLASS } from './formParts';
import { formatDollars } from './money';
import { PillButton } from './PillButton';

type Category = SpendEntry['category'];

const CATEGORY_LABELS: Record<Category, string> = { groceries: 'Groceries', takeaway: 'Takeaway', market: 'Market', other: 'Other' };
export const categoryLabel = (c: Category): string => CATEGORY_LABELS[c];

interface Props {
  /** The time the page last rendered; sets the allowed days. */
  now: Date;
  /** Reads the real time when saving, so an entry is stamped with the moment it was saved. */
  clock?: () => Date;
  onAdd: (entry: SpendEntry) => void;
  onCancel: () => void;
  /** Injected in tests. */
  newId?: () => string;
}

const pad = (n: number): string => String(n).padStart(2, '0');
/** Local calendar day as YYYY-MM-DD (what a date input speaks). */
export const localDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The earliest allowed day: Monday of the previous week, local time. */
export function earliestDay(now: Date): string {
  const sinceMonday = (now.getDay() + 6) % 7;
  return localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday - 7));
}

/** Today keeps the real time; other days are logged at midday, so they can never fall in the future. */
export function atFor(day: string, now: Date): string {
  if (day === localDay(now)) return now.toISOString();
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

export const dayText = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
};

/** How an instant (ISO timestamp) reads as its local day, e.g. "Thu 29 Oct". */
export const instantDayText = (iso: string): string => dayLabel(localDay(new Date(iso)));

export const defaultId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Amount, optional note, category and date: one short form, saved in one tap. */
export function AddSpend({ now, clock, onAdd, onCancel, newId = defaultId }: Props) {
  const ids = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('groceries');
  const today = localDay(now);
  const [day, setDay] = useState(today);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  useEffect(() => amountRef.current?.focus(), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseMoney(amount, { allowZero: false, max: MAX_SPEND_AMOUNT });
    if (value === null) {
      setError(`Enter an amount in dollars, above zero and up to ${formatDollars(MAX_SPEND_AMOUNT)}.`);
      amountRef.current?.focus();
      return;
    }
    const first = earliestDay(now);
    if (day === '') {
      setDateError('Choose a date.');
      return;
    }
    if (day < first || day > today) {
      setDateError(`Pick a day from ${dayText(first)} to today.`);
      return;
    }
    const text = note.trim();
    onAdd({ id: newId(), amount: value, category, at: atFor(day, clock?.() ?? now), ...(text ? { note: text } : {}) });
  };

  const label = 'mb-2 block text-sm font-medium';
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div>
        <label htmlFor={`${ids}-amount`} className={label}>Amount ($)</label>
        <input
          ref={amountRef} id={`${ids}-amount`} type="text" inputMode="decimal" className={INPUT_CLASS} value={amount}
          aria-invalid={error !== ''} aria-describedby={error ? `${ids}-error` : undefined}
          onChange={(e) => { setAmount(e.target.value); setError(''); }}
        />
        {error && <p id={`${ids}-error`} className="mt-2 px-5 text-sm font-semibold text-ink">{error}</p>}
      </div>
      <div>
        <label htmlFor={`${ids}-note`} className={label}>Note (optional)</label>
        <input id={`${ids}-note`} type="text" maxLength={MAX_SPEND_NOTE} className={INPUT_CLASS} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div role="group" aria-label="Category" className="flex flex-wrap gap-2">
        {SPEND_CATEGORIES.map((c) => (
          <PillButton key={c} variant={c === category ? 'primary' : 'surface'} aria-pressed={c === category} onClick={() => setCategory(c)}>
            {CATEGORY_LABELS[c]}
          </PillButton>
        ))}
      </div>
      <div>
        <label htmlFor={`${ids}-date`} className={label}>Date</label>
        <input
          id={`${ids}-date`} type="date" className={INPUT_CLASS} value={day} min={earliestDay(now)} max={today}
          aria-invalid={dateError !== ''} aria-describedby={dateError ? `${ids}-date-error` : undefined}
          onChange={(e) => { setDay(e.target.value); setDateError(''); }}
        />
        {dateError && <p id={`${ids}-date-error`} className="mt-2 px-5 text-sm font-semibold text-ink">{dateError}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PillButton type="submit">Save</PillButton>
        <PillButton variant="text" onClick={onCancel}>Cancel</PillButton>
      </div>
    </form>
  );
}
