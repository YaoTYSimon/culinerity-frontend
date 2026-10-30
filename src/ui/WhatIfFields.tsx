import { useId, type KeyboardEvent } from 'react';
import { INPUT_CLASS } from './formParts';
import { PillButton } from './PillButton';

export interface Option<T extends string> { value: T; label: string }

interface RadioProps<T extends string> {
  /** The accessible name of the group. */
  name: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (next: T) => void;
}

/** Round pills as a radio group: one tab stop, arrows move and choose (wrapping). */
export function PillRadio<T extends string>({ name, options, value, onChange }: RadioProps<T>) {
  const index = options.findIndex((o) => o.value === value);
  const stop = index < 0 ? 0 : index;
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    onChange(options[next].value);
    e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o, i) => (
        <PillButton
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === stop ? 0 : -1}
          variant={o.value === value ? 'primary' : 'surface'}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
        </PillButton>
      ))}
    </div>
  );
}

interface TextProps {
  label: string;
  hint: string;
  value: string;
  error?: string;
  onChange: (next: string) => void;
}

/** A labelled text field with a hint and, when refused, a plain-words message (not colour alone). */
export function TextField({ label, hint, value, error, onChange }: TextProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
      <input
        id={id} type="text" inputMode="decimal" autoComplete="off" className={INPUT_CLASS} value={value}
        aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={`${id}-hint`} className="mt-1 px-2 text-sm text-pretty text-muted">{hint}</p>
      {error && <p id={`${id}-error`} className="mt-1 px-2 text-sm font-semibold text-pretty text-ink">{error}</p>}
    </div>
  );
}

/** Example percentages: labelled as examples, not as a claim about what is likely. */
export function TryRow({ label, onPick }: { label: string; onPick: (text: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="text-sm text-muted">{label}</span>
      {['5', '10', '15'].map((n) => (
        <PillButton key={n} variant="surface" className="px-4" onClick={() => onPick(n)}>{n}%</PillButton>
      ))}
    </div>
  );
}
