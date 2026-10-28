import { useId, useState, type KeyboardEvent } from 'react';
import { cleanText, MAX_TEXT } from '@culinerity/core';
import { INPUT_CLASS } from './formParts';
import { PillButton } from './PillButton';

interface Props {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  hint?: string;
}

/** Free-text tags: add with Enter or "Add", remove with a labelled button. Text is cleaned and duplicates are ignored. */
export function TagInput({ label, values, onChange, max, hint }: Props) {
  const id = useId();
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const full = values.length >= max;

  const add = () => {
    const clean = cleanText(text);
    if (!clean || full) return;
    setText('');
    if (values.some((v) => v.toLowerCase() === clean.toLowerCase())) return;
    onChange([...values, clean]);
    setNote(`Added ${clean}`);
  };
  const remove = (value: string) => {
    onChange(values.filter((v) => v !== value));
    setNote(`Removed ${value}`);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    add();
  };

  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={id} className="text-base font-semibold">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          maxLength={MAX_TEXT}
          autoComplete="off"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={INPUT_CLASS}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <PillButton variant="surface" onClick={add} disabled={full} className="shrink-0">Add</PillButton>
      </div>
      {hint && <p id={`${id}-hint`} className="text-sm text-pretty text-muted">{hint}</p>}
      {values.length > 0 && (
        <ul className="flex min-w-0 flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="flex min-h-11 max-w-full min-w-0 items-center rounded-full bg-surface pl-4">
              <span className="min-w-0 break-words text-base [overflow-wrap:anywhere]">{v}</span>
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => remove(v)}
                className="focus-ring motion-colors inline-flex size-11 shrink-0 items-center justify-center rounded-full"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div role="status" className="sr-only">{note}</div>
    </div>
  );
}
