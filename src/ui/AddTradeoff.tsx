import { useEffect, useId, useRef, useState } from 'react';
import { MAX_NOTE, TRADEOFF_CATEGORIES, TRADEOFF_LABELS, type TradeoffCategory } from '@culinerity/core';
import { atFor, earliestDay, localDay } from './AddSpend';
import { dayLabel as dayText } from './foodCopy';
import { FIELD_EDGE, INPUT_CLASS } from './formParts';
import { PillButton } from './PillButton';

interface AddProps {
  now: Date;
  /** Reads the real time when saving, so an entry logged today is stamped with that moment. */
  clock?: () => Date;
  /** Saves at once. `dayLabel` is how the day reads in the status line. */
  onPick: (category: TradeoffCategory, at: string, dayLabel: string) => void;
  onCancel: () => void;
}

/** Tap a category to save: the day defaults to today and can be changed first. */
export function AddTradeoff({ now, clock, onPick, onCancel }: AddProps) {
  const ids = useId();
  const today = localDay(now);
  const first = earliestDay(now);
  const [day, setDay] = useState(today);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const dayRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (changing) dayRef.current?.focus();
  }, [changing]);

  const pick = (category: TradeoffCategory) => {
    if (day === '') return setError('Choose a day.');
    if (day < first || day > today) return setError(`Pick a day from ${dayText(first)} to today.`);
    setError('');
    onPick(category, atFor(day, clock?.() ?? now), day === today ? 'today' : dayText(day));
  };

  return (
    <section aria-label="Add a trade-off" className="grid gap-4">
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
            onChange={(e) => { setDay(e.currentTarget.value); setError(''); }}
          />
        </div>
      )}
      {error && <p id={`${ids}-error`} className="px-5 text-sm font-semibold">{error}</p>}
      <div role="group" aria-label="Add a trade-off" className="flex flex-wrap gap-2">
        {TRADEOFF_CATEGORIES.map((c) => (
          <PillButton key={c} variant="surface" className="py-2" onClick={() => pick(c)}>{TRADEOFF_LABELS[c]}</PillButton>
        ))}
      </div>
      <div>
        <PillButton variant="text" className="-ml-3" onClick={onCancel}>Cancel</PillButton>
      </div>
    </section>
  );
}

const SHOW_COUNT_AFTER = 100;

interface NoteProps {
  /** Return false when the note cannot be saved (the field then explains why). */
  onSave: (note: string) => boolean;
  onSkip: () => void;
}

/** The optional note: up to 140 characters, the count appears once it is long. */
export function NoteForm({ onSave, onSkip }: NoteProps) {
  const ids = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => ref.current?.focus(), []);

  const save = () => {
    if (note.length > MAX_NOTE) return setError(`Keep the note to ${MAX_NOTE} characters or fewer.`);
    if (!onSave(note)) setError('That could not be saved.');
  };
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div>
        <label htmlFor={`${ids}-note`} className="mb-2 block text-sm font-medium">Note (optional)</label>
        <input
          ref={ref} id={`${ids}-note`} type="text" className={`${INPUT_CLASS} ${FIELD_EDGE}`} value={note}
          aria-invalid={error !== ''} aria-describedby={`${ids}-hint`}
          onChange={(e) => { setNote(e.currentTarget.value); setError(''); }}
        />
        <p id={`${ids}-hint`} className="mt-2 px-5 text-sm text-muted empty:hidden">
          {error || (note.length > SHOW_COUNT_AFTER ? `${note.length} of ${MAX_NOTE}` : '')}
          {error && note.length > SHOW_COUNT_AFTER && <span className="block">{`${note.length} of ${MAX_NOTE}`}</span>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PillButton type="submit">Save note</PillButton>
        <PillButton variant="text" onClick={onSkip}>Skip</PillButton>
      </div>
    </form>
  );
}
