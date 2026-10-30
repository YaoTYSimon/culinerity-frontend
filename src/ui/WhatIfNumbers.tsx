import { useEffect, useRef, useState } from 'react';
import { formatCents, LIMITS, parseMoney, toCents, toWeeklyCents, type Per, type Profile } from '@culinerity/core';
import { Disclosure } from './Disclosure';
import { PillButton } from './PillButton';
import { PillRadio, TextField, type Option } from './WhatIfFields';
import { WHATIF_COPY } from './whatIfCopy';

type Key = 'incomeWeekly' | 'housingWeekly' | 'otherFixedWeekly' | 'foodBudgetWeekly';

const FIELDS: { key: Key; label: string; limit: number }[] = [
  { key: 'incomeWeekly', label: 'Income', limit: LIMITS.income },
  { key: 'housingWeekly', label: 'Rent or housing', limit: LIMITS.housing },
  { key: 'otherFixedWeekly', label: 'Other regular costs', limit: LIMITS.otherFixed },
  { key: 'foodBudgetWeekly', label: 'Food budget', limit: LIMITS.food },
];
const PER: Option<Per>[] = [{ value: 'week', label: 'per week' }, { value: 'fortnight', label: 'per fortnight' }, { value: 'month', label: 'per month' }];

type Entry = { text: string; per: Per };
const entriesFrom = (p: Profile): Record<Key, Entry> =>
  Object.fromEntries(FIELDS.map(({ key }) => [key, { text: typeof p[key] === 'number' ? String(p[key]) : '', per: 'week' as Per }])) as Record<Key, Entry>;

interface Props {
  profile: Profile;
  onChange: (next: Profile) => void;
  /** Called after a successful save, so the screen can say so once. */
  onSaved: () => void;
}

/** The four figures the sums use. Each is converted once to a weekly amount when saved; blank leaves a figure out. */
export function WhatIfNumbers({ profile, onChange, onSaved }: Props) {
  const [entries, setEntries] = useState(() => entriesFrom(profile));
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [failed, setFailed] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (failed > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [failed]);

  const save = () => {
    const errs: Partial<Record<Key, string>> = {};
    const next: Profile = { ...profile };
    for (const { key, limit } of FIELDS) {
      const { text, per } = entries[key];
      // A prefilled figure left as it was is kept, so an out-of-range one cannot block saving the others.
      if (per === 'week' && typeof profile[key] === 'number' && text === String(profile[key])) continue;
      delete next[key];
      if (text.trim() === '') continue;
      const n = parseMoney(text);
      if (n === null) { errs[key] = WHATIF_COPY.invalidMoney; continue; }
      const weekly = toWeeklyCents({ cents: toCents(n), per });
      if (weekly > limit) { errs[key] = WHATIF_COPY.tooBig(`${formatCents(limit)} a week`); continue; }
      next[key] = weekly / 100;
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setFailed((f) => f + 1); return; }
    onChange(next);
    setEntries(entriesFrom(next));
    onSaved();
  };

  const hasAny = FIELDS.some(({ key }) => typeof profile[key] === 'number');
  return (
    <form ref={form} noValidate className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <h2 className="font-display text-[24px]">{WHATIF_COPY.numbersHeading}</h2>
      <p className="text-base text-pretty text-muted">{WHATIF_COPY.numbersIntro}</p>
      <Disclosure summary={hasAny ? "Change my numbers" : "Add my numbers"} defaultOpen={!hasAny}>
      <div className="grid gap-5 pt-2">
      <p id="whatif-numbers-hint" className="-mt-3 text-sm text-pretty text-muted">{WHATIF_COPY.numbersHint}</p>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-6">
      {FIELDS.map(({ key, label }) => (
        <div key={key} className="grid content-start gap-2">
          <TextField
            label={label} hintId="whatif-numbers-hint" value={entries[key].text} error={errors[key]}
            onChange={(text) => setEntries((e) => ({ ...e, [key]: { ...e[key], text } }))}
          />
          <PillRadio name={`${label}: enter as`} options={PER} value={entries[key].per} compact onChange={(per) => setEntries((e) => ({ ...e, [key]: { ...e[key], per } }))} />
        </div>
      ))}
      </div>
      </div>
      </Disclosure>
      <p className="text-base text-pretty text-muted">{WHATIF_COPY.privacy}</p>
      <div><PillButton type="submit" variant="surface">{WHATIF_COPY.saveNumbers}</PillButton></div>
    </form>
  );
}
