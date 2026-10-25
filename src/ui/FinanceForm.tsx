import { useEffect, useState } from 'react';
import type { Profile } from '@culinerity/core';

interface Props {
  value: Profile;
  onChange: (p: Profile) => void;
}

/** Blank, non-numeric, negative or non-finite input gives undefined, never NaN. */
function parseMoney(text: string): number | undefined {
  if (text.trim() === '') return undefined;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const input =
  'min-h-11 w-full rounded-full bg-surface px-5 py-2.5 text-sm text-ink focus-ring aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-accent';

/** Text state that follows the parent value, but keeps rejected text visible while the parent value is unchanged. */
function useSynced(external: number | string | undefined, parse: (t: string) => number | string | undefined) {
  const [text, setText] = useState(external === undefined ? '' : String(external));
  useEffect(() => {
    setText((t) => (parse(t) === external ? t : external === undefined ? '' : String(external)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [external]);
  return [text, setText] as const;
}

export function FinanceForm({ value, onChange }: Props) {
  const [budget, setBudget] = useSynced(value.foodBudgetWeekly, parseMoney);
  const [income, setIncome] = useSynced(value.incomeWeekly, parseMoney);
  const [suburb, setSuburb] = useSynced(value.suburb, (t) => (t.trim() === '' ? undefined : t));

  // Open on first render when optional details already exist; after that only the person toggles it.
  const [more, setMore] = useState(() => value.incomeWeekly !== undefined || Boolean(value.suburb));

  const bad = (t: string) => t.trim() !== '' && parseMoney(t) === undefined;
  const hint = (id: string, t: string) =>
    bad(t) ? (
      <p id={id} className="mt-1 px-5 text-xs text-ink">Enter an amount of 0 or more, using numbers only.</p>
    ) : null;

  return (
    <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
      <p className="text-sm text-pretty text-muted-foreground">
        These help us suggest swaps that fit your week. Everything is optional and stays on this device.
      </p>
      <div>
        <label htmlFor="fin-budget" className="mb-2 block text-sm font-medium">Weekly food budget ($)</label>
        <input
          id="fin-budget" type="text" inputMode="decimal" className={input} value={budget}
          aria-invalid={bad(budget)} aria-describedby={bad(budget) ? 'fin-budget-hint' : undefined}
          onChange={(e) => { setBudget(e.target.value); onChange({ ...value, foodBudgetWeekly: parseMoney(e.target.value) }); }}
        />
        {hint('fin-budget-hint', budget)}
      </div>
      <details className="group grid gap-4" open={more} onToggle={(e) => setMore(e.currentTarget.open)}>
        <summary className="focus-ring flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-full text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span>More about your week</span>
          <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 8h10" />
              <path d="M8 3v10" className="group-open:hidden" />
            </svg>
          </span>
        </summary>
        <div>
          <label htmlFor="fin-income" className="mb-2 block text-sm font-medium">Weekly income ($, optional)</label>
          <input
            id="fin-income" type="text" inputMode="decimal" className={input} value={income}
            aria-invalid={bad(income)} aria-describedby={bad(income) ? 'fin-income-hint' : undefined}
            onChange={(e) => { setIncome(e.target.value); onChange({ ...value, incomeWeekly: parseMoney(e.target.value) }); }}
          />
          {hint('fin-income-hint', income)}
        </div>
        <div>
          <label htmlFor="fin-suburb" className="mb-2 block text-sm font-medium">Suburb (optional)</label>
          <input
            id="fin-suburb" type="text" autoComplete="address-level2" className={input} value={suburb}
            onChange={(e) => { setSuburb(e.target.value); onChange({ ...value, suburb: e.target.value.trim() === '' ? undefined : e.target.value }); }}
          />
        </div>
      </details>
    </form>
  );
}
