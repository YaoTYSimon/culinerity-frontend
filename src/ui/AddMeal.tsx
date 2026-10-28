import { useEffect, useId, useRef, useState } from 'react';
import { cleanText, labelFor, MAX_TEXT, type CulturalMeal } from '@culinerity/core';
import { atFor, dayText, earliestDay, localDay } from './AddSpend';
import { INPUT_CLASS } from './formParts';
import { PillButton } from './PillButton';

/** The tradition saved when none of the person's own fits. */
export const OTHER_TRADITION = 'Other';

type With = NonNullable<CulturalMeal['with']>;
const WITH_OPTIONS: { value: With; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
  { value: 'community', label: 'Community' },
  { value: 'alone', label: 'Alone' },
];

interface AddProps {
  now: Date;
  /** Reads the real time when saving, so a meal logged today is stamped with that moment. */
  clock?: () => Date;
  /** The person's traditions (starter ids or their own text). */
  traditions: string[];
  /** Saves at once. `dayLabel` is how the day reads in the status line. */
  onPick: (tradition: string, at: string, dayLabel: string) => void;
  onSetUpFood: () => void;
  onCancel: () => void;
}

/** Tap a tradition to save: the day defaults to today and can be changed first. */
export function AddMeal({ now, clock, traditions, onPick, onSetUpFood, onCancel }: AddProps) {
  const ids = useId();
  const today = localDay(now);
  const [day, setDay] = useState(today);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const dayRef = useRef<HTMLInputElement>(null);
  const first = earliestDay(now);

  useEffect(() => {
    if (changing) dayRef.current?.focus();
  }, [changing]);

  const pick = (tradition: string) => {
    if (day === '') return setError('Choose a day.');
    if (day < first || day > today) return setError(`Pick a day from ${dayText(first)} to today.`);
    setError('');
    onPick(tradition, atFor(day, clock?.() ?? now), day === today ? 'today' : dayText(day));
  };

  const options = traditions.includes(OTHER_TRADITION) ? traditions : [...traditions, OTHER_TRADITION];
  return (
    <section aria-label="Add a meal" className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-2">
        <p className="text-base font-semibold">{day === today ? 'Today' : dayText(day)}</p>
        <PillButton variant="text" aria-expanded={changing} onClick={() => setChanging((c) => !c)}>Change day</PillButton>
      </div>
      {changing && (
        <div>
          <label htmlFor={`${ids}-day`} className="mb-2 block text-sm font-medium">Day</label>
          <input
            ref={dayRef} id={`${ids}-day`} type="date" className={INPUT_CLASS} value={day} min={first} max={today}
            aria-invalid={error !== ''} aria-describedby={error ? `${ids}-error` : undefined}
            onChange={(e) => { setDay(e.target.value); setError(''); }}
          />
        </div>
      )}
      {error && <p id={`${ids}-error`} className="px-5 text-sm font-semibold">{error}</p>}
      <div role="group" aria-label="Tradition" className="flex flex-wrap gap-2">
        {options.map((t) => (
          <PillButton key={t} variant="surface" onClick={() => pick(t)}>{labelFor(t)}</PillButton>
        ))}
      </div>
      {traditions.length === 0 && (
        <div>
          <PillButton variant="text" className="-ml-3" onClick={onSetUpFood}>Set up My food</PillButton>
        </div>
      )}
      <div>
        <PillButton variant="text" className="-ml-3" onClick={onCancel}>Cancel</PillButton>
      </div>
    </section>
  );
}

interface DetailsProps {
  onSave: (details: { dish?: string; with?: With }) => void;
  onSkip: () => void;
}

/** The optional dish name and who it was shared with. */
export function MealDetails({ onSave, onSkip }: DetailsProps) {
  const ids = useId();
  const dishRef = useRef<HTMLInputElement>(null);
  const [dish, setDish] = useState('');
  const [who, setWho] = useState<With | undefined>();
  useEffect(() => dishRef.current?.focus(), []);

  const save = () => {
    const text = cleanText(dish).trim();
    onSave({ ...(text ? { dish: text } : {}), ...(who ? { with: who } : {}) });
  };
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div>
        <label htmlFor={`${ids}-dish`} className="mb-2 block text-sm font-medium">Dish (optional)</label>
        <input ref={dishRef} id={`${ids}-dish`} type="text" maxLength={MAX_TEXT} className={INPUT_CLASS} value={dish} onChange={(e) => setDish(e.target.value)} />
      </div>
      <div role="group" aria-label="Who with (optional)" className="flex flex-wrap gap-2">
        {WITH_OPTIONS.map((o) => (
          <PillButton key={o.value} variant={who === o.value ? 'primary' : 'surface'} aria-pressed={who === o.value} onClick={() => setWho(who === o.value ? undefined : o.value)}>
            {o.label}
          </PillButton>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PillButton type="submit">Save details</PillButton>
        <PillButton variant="text" onClick={onSkip}>Skip</PillButton>
      </div>
    </form>
  );
}

export const withText = (w: With): string => (w === 'alone' ? 'on my own' : `with ${w}`);
