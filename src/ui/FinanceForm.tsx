import type { Profile } from '../domain/types';

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
  'min-h-11 w-full rounded border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export function FinanceForm({ value, onChange }: Props) {
  return (
    <form className="mx-auto grid w-full max-w-md gap-4 px-4 py-6" onSubmit={(e) => e.preventDefault()}>
      <p className="text-sm text-muted-foreground">
        These help us suggest swaps that fit your week. Everything is optional and stays on this device.
      </p>
      <div>
        <label htmlFor="fin-budget" className="mb-1 block text-sm font-medium">Weekly food budget ($)</label>
        <input
          id="fin-budget" type="text" inputMode="decimal" className={input}
          defaultValue={value.foodBudgetWeekly ?? ''}
          onChange={(e) => onChange({ ...value, foodBudgetWeekly: parseMoney(e.target.value) })}
        />
      </div>
      <div>
        <label htmlFor="fin-income" className="mb-1 block text-sm font-medium">Weekly income ($, optional)</label>
        <input
          id="fin-income" type="text" inputMode="decimal" className={input}
          defaultValue={value.incomeWeekly ?? ''}
          onChange={(e) => onChange({ ...value, incomeWeekly: parseMoney(e.target.value) })}
        />
      </div>
      <div>
        <label htmlFor="fin-suburb" className="mb-1 block text-sm font-medium">Suburb (optional)</label>
        <input
          id="fin-suburb" type="text" autoComplete="address-level2" className={input}
          defaultValue={value.suburb ?? ''}
          onChange={(e) => onChange({ ...value, suburb: e.target.value.trim() === '' ? undefined : e.target.value })}
        />
      </div>
    </form>
  );
}
