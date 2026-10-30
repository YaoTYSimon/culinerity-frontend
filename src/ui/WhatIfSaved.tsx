import { useEffect, useId, useRef, useState } from 'react';
import { MAX_SAVED_WHATIFS, MAX_WHATIF_NAME, type SavedWhatIf } from '@culinerity/core';
import { INPUT_CLASS } from './formParts';
import { PillButton } from './PillButton';
import { WHATIF_COPY } from './whatIfCopy';

interface Props {
  list: SavedWhatIf[];
  canSave: boolean;
  draftName: string;
  onSave: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onOpen: (item: SavedWhatIf) => void;
  onClear: () => void;
}

/** Why a name can't be used, in plain words, or null. */
function nameProblem(name: string): string | null {
  const t = name.trim();
  if (t === '') return WHATIF_COPY.nameEmpty;
  return t.length > MAX_WHATIF_NAME ? WHATIF_COPY.nameTooLong : null;
}

function NameField({ label, value, error, onChange, inputRef }: {
  label: string; value: string; error: string | null; onChange: (v: string) => void; inputRef?: React.Ref<HTMLInputElement>;
}) {
  const id = `${useId()}-field`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
      <input
        id={id} ref={inputRef} type="text" autoComplete="off" className={INPUT_CLASS} value={value}
        aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p id={`${id}-error`} className="mt-1 px-2 text-sm font-semibold text-pretty text-ink">{error}</p>}
    </div>
  );
}

function Row({ item, onRename, onRemove, onOpen }: { item: SavedWhatIf } & Pick<Props, 'onRename' | 'onRemove' | 'onOpen'>) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const renameButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) input.current?.focus();
    else if (wasEditing.current) renameButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (editing) {
    return (
      <form
        noValidate className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const problem = nameProblem(name);
          setError(problem);
          if (problem) return;
          onRename(item.id, name.trim());
          setEditing(false);
        }}
      >
        <NameField label={WHATIF_COPY.newName} value={name} error={error} inputRef={input} onChange={(v) => { setName(v); setError(null); }} />
        <div className="flex flex-wrap items-center gap-3">
          <PillButton type="submit">{WHATIF_COPY.saveName}</PillButton>
          <PillButton variant="text" onClick={() => { setEditing(false); setName(item.name); setError(null); }}>{WHATIF_COPY.cancel}</PillButton>
        </div>
      </form>
    );
  }
  return (
    <>
      <p data-name className="text-base font-semibold text-pretty break-words">{item.name}</p>
      <div className="-ml-3 flex flex-wrap items-center">
        <PillButton variant="text" data-open-id={item.id} aria-label={`Open ${item.name}`} onClick={() => onOpen(item)}>Open</PillButton>
        <PillButton ref={renameButton} variant="text" aria-label={`Rename ${item.name}`} onClick={() => { setName(item.name); setEditing(true); }}>Rename</PillButton>
        <PillButton variant="text" data-remove-id={item.id} aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}>Remove</PillButton>
      </div>
    </>
  );
}

/** Save the change just tried, and keep, open, rename or remove saved ones. Only the inputs are kept. */
export function WhatIfSaved({ list, canSave, draftName, onSave, onRename, onRemove, onOpen, onClear }: Props) {
  const [name, setName] = useState(draftName);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setName(draftName); setError(null); }, [draftName]);

  const submit = () => {
    const problem = nameProblem(name) ?? (list.length >= MAX_SAVED_WHATIFS ? WHATIF_COPY.listFull : null);
    setError(problem);
    if (problem) return;
    onSave(name.trim());
  };

  return (
    <section aria-labelledby="whatif-saved" className="grid gap-4" data-saved-section>
      <h2 id="whatif-saved" tabIndex={-1} data-saved-heading className="font-display text-[24px] outline-none">{WHATIF_COPY.savedHeading}</h2>
      <p className="text-base text-pretty text-muted">{WHATIF_COPY.savedIntro}</p>
      {canSave && (
        <form noValidate className="grid gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <NameField label={WHATIF_COPY.nameLabel} value={name} error={error} onChange={(v) => { setName(v); setError(null); }} />
          <div><PillButton type="submit">{WHATIF_COPY.saveThis}</PillButton></div>
        </form>
      )}
      {list.length === 0 ? (
        <p className="text-base text-pretty">{WHATIF_COPY.empty}</p>
      ) : (
        <>
          <ul data-saved-list className="grid gap-4">
            {list.map((item) => (
              <li key={item.id} className="grid gap-1">
                <Row item={item} onRename={onRename} onRemove={onRemove} onOpen={onOpen} />
              </li>
            ))}
          </ul>
          <div className="-ml-3"><PillButton variant="text" onClick={onClear}>{WHATIF_COPY.clearAll}</PillButton></div>
        </>
      )}
    </section>
  );
}
