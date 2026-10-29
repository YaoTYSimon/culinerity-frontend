import { useId, useState, type FormEvent } from 'react';
import { dateStatus, parseGrams, type AddItemError, type DateKind, type DateStatus, type ItemEdit, type PantryItem } from '@culinerity/core';
import { Disclosure } from './Disclosure';
import { INPUT_CLASS } from './formParts';
import { ADD_ERRORS, BAD_AMOUNT, NO_DETAILS, SHOW_FIRST } from './pantryCopy';
import { PillButton } from './PillButton';

interface Props {
  items: PantryItem[];
  now: Date;
  highRisk: ReadonlySet<string>;
  /** `neighbour` is the row that sits next to the removed one, for focus. */
  onRemove: (item: PantryItem, neighbour: string | null) => void;
  /** Returns an error code when the edit was refused. */
  onEdit: (id: string, edit: ItemEdit) => AddItemError | undefined;
}

type Group = 'soon' | 'have' | 'aside';
const GROUPS: { key: Group; label: string }[] = [
  { key: 'soon', label: 'Use soon' },
  { key: 'have', label: 'In your pantry' },
  { key: 'aside', label: 'Set aside' },
];
interface Row { item: PantryItem; status: DateStatus }

const groupOf = (s: DateStatus): Group => (!s.usable ? 'aside' : s.status === 'soon' || s.status === 'today' ? 'soon' : 'have');

export const formatGrams = (g: number): string => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);
const KINDS: { kind: DateKind; label: string }[] = [
  { kind: 'use-by', label: 'Use by' },
  { kind: 'best-before', label: 'Best before' },
  { kind: 'cooked', label: 'Cooked on' },
  { kind: 'opened', label: 'Opened on' },
];

function EditForm({ item, onEdit }: { item: PantryItem; onEdit: Props['onEdit'] }) {
  const ids = useId();
  const [amount, setAmount] = useState(item.grams ? formatGrams(item.grams) : '');
  const [kind, setKind] = useState<DateKind | undefined>(item.dateKind);
  const [day, setDay] = useState(item.date ?? '');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const grams = amount.trim() === '' ? null : parseGrams(amount);
    if (grams === null && amount.trim() !== '') return setError(BAD_AMOUNT);
    if (day !== '' && !kind) return setError('Choose what the date is first.');
    if (day === '' && kind) return setError('Pick a date, or turn the date type off.');
    const refused = onEdit(item.id, { grams, date: kind && day ? { kind, day } : null });
    setError(refused ? ADD_ERRORS[refused] : '');
  };
  return (
    <form onSubmit={submit} className="grid gap-3 pb-2 pt-1">
      <div>
        <label htmlFor={`${ids}-g`} className="mb-2 block text-sm font-medium">Amount</label>
        <input id={`${ids}-g`} type="text" inputMode="decimal" autoComplete="off" className={INPUT_CLASS} value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={error === BAD_AMOUNT} aria-describedby={error ? `${ids}-e` : undefined} />
        <p className="mt-1 px-5 text-sm text-muted">Optional. Leave it blank for "enough".</p>
      </div>
      <div role="group" aria-label="What the date is" className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <PillButton key={k.kind} variant={kind === k.kind ? 'primary' : 'surface'} aria-pressed={kind === k.kind} onClick={() => setKind(kind === k.kind ? undefined : k.kind)}>{k.label}</PillButton>
        ))}
      </div>
      <div>
        <label htmlFor={`${ids}-d`} className="mb-2 block text-sm font-medium">Date</label>
        <input id={`${ids}-d`} type="date" className={INPUT_CLASS} value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      {error && <p id={`${ids}-e`} className="px-5 text-sm font-semibold text-pretty">{error}</p>}
      <div>
        <PillButton type="submit" variant="surface" aria-label={`Save ${item.name}`}>Save</PillButton>
      </div>
    </form>
  );
}

function ItemRow({ row, neighbour, onRemove, onEdit }: { row: Row; neighbour: string | null; onRemove: Props['onRemove']; onEdit: Props['onEdit'] }) {
  const { item, status } = row;
  const note = [item.grams ? formatGrams(item.grams) : '', status.label].filter(Boolean).join(' · ');
  return (
    <li className="grid py-1">
      <div className="flex min-h-11 items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block break-words text-base font-semibold [overflow-wrap:anywhere]">{item.name}</span>
          {note && <span className="block text-sm text-pretty text-muted">{note}</span>}
          {item.ingredientId === undefined && <span className="block text-sm text-pretty text-muted">{NO_DETAILS}</span>}
        </span>
        <PillButton variant="text" data-remove-id={item.id} className="shrink-0 text-sm" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item, neighbour)}>Remove</PillButton>
      </div>
      <Disclosure printOpen={false} summary={<>Edit<span className="sr-only"> {item.name}</span></>}>
        <EditForm item={item} onEdit={onEdit} />
      </Disclosure>
    </li>
  );
}

/** The pantry, grouped by what the dates say: use soon, in your pantry, set aside. The first 50 show until "Show all". */
export function PantryList({ items, now, highRisk, onRemove, onEdit }: Props) {
  const [all, setAll] = useState(false);
  const rows: Row[] = items.map((item) => ({ item, status: dateStatus(item, now, item.ingredientId !== undefined && highRisk.has(item.ingredientId)) }));
  const ordered = GROUPS.flatMap((g) => rows.filter((r) => groupOf(r.status) === g.key));
  const shown = all ? ordered : ordered.slice(0, SHOW_FIRST);
  return (
    <div className="grid gap-4">
      {GROUPS.map((g) => {
        const inGroup = shown.filter((r) => groupOf(r.status) === g.key);
        if (inGroup.length === 0) return null;
        return (
          <div key={g.key} className="grid gap-1">
            <h3 className="text-base font-semibold text-muted">{g.label}</h3>
            <ul aria-label={g.label} className="grid">
              {inGroup.map((r) => {
                const at = shown.indexOf(r);
                return <ItemRow key={r.item.id} row={r} neighbour={(shown[at + 1] ?? shown[at - 1])?.item.id ?? null} onRemove={onRemove} onEdit={onEdit} />;
              })}
            </ul>
          </div>
        );
      })}
      {!all && ordered.length > SHOW_FIRST && (
        <div><PillButton variant="surface" onClick={() => setAll(true)}>{`Show all ${ordered.length}`}</PillButton></div>
      )}
    </div>
  );
}
