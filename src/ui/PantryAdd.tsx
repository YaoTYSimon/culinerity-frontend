import { useId, useState, type KeyboardEvent } from 'react';
import { cleanName, searchIngredients, type IngredientRow } from '@culinerity/core';
import { INPUT_CLASS } from './formParts';
import { PillButton } from './PillButton';
import { STARTERS_LABEL } from './pantryCopy';

interface Props {
  ingredients: IngredientRow[];
  /** Starter ids (already limited to ones in the table). */
  starters: readonly string[];
  isOn: (ingredientId: string) => boolean;
  /** Returns true when the item was added, so the field can clear. */
  onAdd: (entry: { ingredientId?: string; name: string }) => boolean;
  onToggleStarter: (ingredientId: string, name: string, on: boolean) => void;
}

/** The add field with its suggestions, and the starter pills. */
export function PantryAdd({ ingredients, starters, isOn, onAdd, onToggleStarter }: Props) {
  const id = useId();
  const [text, setText] = useState('');
  const [active, setActive] = useState(-1);
  const found = searchIngredients(text, ingredients, 8);
  const clean = cleanName(text);
  const add = (entry: { ingredientId?: string; name: string }) => {
    if (onAdd(entry)) {
      setText('');
      setActive(-1);
    }
  };
  const pick = (row: IngredientRow) => add({ ingredientId: row.id, name: row.name });
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (found.length === 0) return;
      e.preventDefault();
      setActive((a) => (e.key === 'ArrowDown' ? Math.min(found.length - 1, a + 1) : Math.max(0, a - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = found[Math.max(0, active)];
      if (row) pick(row);
      else if (clean === '') onAdd({ name: '' });
    } else if (e.key === 'Escape') {
      setActive(-1);
    }
  };
  const ingredientName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid gap-2">
        <label htmlFor={`${id}-q`} className="text-base font-semibold">Add something you have</label>
        <input
          id={`${id}-q`} type="text" role="combobox" autoComplete="off" maxLength={500} className={INPUT_CLASS} value={text}
          aria-expanded={found.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={active >= 0 && found[active] ? `${id}-o${active}` : undefined}
          onChange={(e) => { setText(e.target.value); setActive(-1); }} onKeyDown={onKeyDown}
        />
        <div aria-live="polite" className="sr-only">{text && found.length > 0 ? `${found.length} ${found.length === 1 ? 'match' : 'matches'}` : ''}</div>
        <div id={`${id}-list`} role="listbox" aria-label="Matches" hidden={found.length === 0} className="grid gap-1">
          {found.map((row, i) => (
            <div
              key={row.id} id={`${id}-o${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} onClick={() => pick(row)}
              className="motion-colors flex min-h-11 cursor-pointer items-center rounded-full bg-surface px-5 text-base aria-selected:bg-accent aria-selected:text-accent-ink"
            >
              {row.name}
            </div>
          ))}
        </div>
        {found.length === 0 && clean !== '' && (
          <div>
            <PillButton variant="surface" className="max-w-full break-words" onClick={() => add({ name: clean })}>{`Add "${clean}" anyway`}</PillButton>
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <h2 id={`${id}-starters`} className="text-base font-semibold">{STARTERS_LABEL}</h2>
        <div role="group" aria-labelledby={`${id}-starters`} className="flex flex-wrap gap-2">
          {starters.map((sid) => {
            const on = isOn(sid);
            return (
              <PillButton key={sid} variant={on ? 'primary' : 'surface'} aria-pressed={on} onClick={() => onToggleStarter(sid, ingredientName(sid), !on)}>
                {ingredientName(sid)}
              </PillButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
