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
  'min-h-11 w-full rounded border border-input bg-card px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-accent';

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

  const bad = (t: string) => t.trim() !== '' && parseMoney(t) === undefined;
  const hint = (id: string, t: string) =>
    bad(t) ? (
      <p id={id} className="mt-1 text-xs text-foreground">Enter an amount of 0 or more, using numbers only.</p>
    ) : null;

  return (
    <form className="mx-auto grid w-full max-w-md gap-4 px-4 py-6" onSubmit={(e) => e.preventDefault()}>
      <p className="text-sm text-muted-foreground">
        These help us suggest swaps that fit your week. Everything is optional and stays on this device.
      </p>
      <div>
        <label htmlFor="fin-budget" className="mb-1 block text-sm font-medium">Weekly food budget ($)</label>
        <input
          id="fin-budget" type="text" inputMode="decimal" className={input} value={budget}
          aria-invalid={bad(budget)} aria-describedby={bad(budget) ? 'fin-budget-hint' : undefined}
          onChange={(e) => { setBudget(e.target.value); onChange({ ...value, foodBudgetWeekly: parseMoney(e.target.value) }); }}
        />
        {hint('fin-budget-hint', budget)}
      </div>
      <div>
        <label htmlFor="fin-income" className="mb-1 block text-sm font-medium">Weekly income ($, optional)</label>
        <input
          id="fin-income" type="text" inputMode="decimal" className={input} value={income}
          aria-invalid={bad(income)} aria-describedby={bad(income) ? 'fin-income-hint' : undefined}
          onChange={(e) => { setIncome(e.target.value); onChange({ ...value, incomeWeekly: parseMoney(e.target.value) }); }}
        />
        {hint('fin-income-hint', income)}
      </div>
      <div>
        <label htmlFor="fin-suburb" className="mb-1 block text-sm font-medium">Suburb (optional)</label>
        <input
          id="fin-suburb" type="text" autoComplete="address-level2" className={input} value={suburb}
          onChange={(e) => { setSuburb(e.target.value); onChange({ ...value, suburb: e.target.value.trim() === '' ? undefined : e.target.value }); }}
        />
      </div>
    </form>
  );
}
