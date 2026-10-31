import { useEffect, useRef, useState } from 'react';
import {
  addTradeoff, isTradeoffEntry, removeTradeoff, restoreTradeoff, tradeoffLabel, tradeoffWeeks, TRADEOFF_LABELS,
  type TradeoffCategory, type TradeoffEntry,
} from '@culinerity/core';
import { NoteForm, AddTradeoff } from './AddTradeoff';
import { defaultId, instantDayText as dayText, localDay } from './AddSpend';
import { Disclosure } from './Disclosure';
import { EmptyPlate } from './illustrations/EmptyPlate';
import { dayLabel } from './foodCopy';
import { noBreak } from './noBreak';
import { PageHeader } from './PageHeader';
import { PillButton } from './PillButton';
import { HelpDisclosure, SupportCard } from './SupportCard';
import {
  countSentence, DISCLAIMER, EMPTY_WEEK, INTRO, REFLECTION, RETENTION, SHARED_DEVICE, STATUS_CLEARED, STATUS_REMOVED,
  STAYS_WITH_PROFILE, statusAdded, TITLE,
} from './tradeoffCopy';

interface Props {
  entries: TradeoffEntry[] | undefined;
  now: Date;
  /** Called with the whole updated list; `[]` means cleared. */
  onChange: (next: TradeoffEntry[]) => void;
  onOpenBudget: () => void;
  onOpenSupport: () => void;
  /** Reads the real time when an entry is saved (defaults to `now`). */
  clock?: () => Date;
  /** Injected in tests. */
  newId?: () => string;
}

const [CLEARED_BEFORE, CLEARED_AFTER] = STATUS_CLEARED.split(' Undo ');
type Added = { id: string; category: TradeoffCategory; text: string };
/** One thing that can be undone: a single removal, or Clear all. */
type Undo = { entries: TradeoffEntry[]; cleared: boolean };


function Rows({ label, entries, onRemove }: { label: string; entries: TradeoffEntry[]; onRemove: (e: TradeoffEntry) => void }) {
  return (
    <ul aria-label={label} className="grid">
      {entries.map((e) => (
        <li key={e.id} className="flex min-h-11 items-center gap-2 py-1">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-base font-semibold">{tradeoffLabel(e)}</span>
            <span className="block break-words text-sm text-muted">
              {noBreak(dayText(e.at))}
              {e.note && e.category !== 'other' ? ` · ${e.note}` : ''}
            </span>
          </span>
          <PillButton variant="text" data-remove-id={e.id} className="shrink-0 text-sm" aria-label={`Remove ${tradeoffLabel(e)}, ${dayText(e.at)}`} onClick={() => onRemove(e)}>
            Remove
          </PillButton>
        </li>
      ))}
    </ul>
  );
}

/** What we went without: a private record, added in two taps, removed with Undo. Nothing here is timed. */
export function TradeoffsView({ entries, now, onChange, onOpenBudget, onOpenSupport, clock, newId = defaultId }: Props) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);
  const [noting, setNoting] = useState(false);
  const [support, setSupport] = useState<TradeoffCategory | null>(null);
  const [undos, setUndos] = useState<Undo[]>([]);
  const addButton = useRef<HTMLButtonElement>(null);
  const noteButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const statusLine = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<{ id: string | null } | null>(null);
  const notingRef = useRef(false);
  notingRef.current = noting;
  const current = () => clock?.() ?? now;

  // A stored entry that is not valid (hand-edited storage) never reaches the view.
  const all = (entries ?? []).filter(isTradeoffEntry);
  const week = tradeoffWeeks(all, now);
  const count = week.thisWeek.length;

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  // Closing the form hands focus on: to the note field (it focuses itself), "Add a note", or "Add a trade-off".
  const wasAdding = useRef(false);
  useEffect(() => {
    if (wasAdding.current && !adding && !notingRef.current) (noteButton.current ?? addButton.current)?.focus();
    wasAdding.current = adding;
  }, [adding]);
  const refocusAdd = useRef(false);
  useEffect(() => {
    if (!noting && refocusAdd.current) {
      refocusAdd.current = false;
      addButton.current?.focus();
    }
  });
  // After a row is removed, focus lands on a neighbouring Remove button, or the list heading.
  useEffect(() => {
    const pending = focusAfter.current;
    if (!pending) return;
    focusAfter.current = null;
    const found = pending.id ? list.current?.querySelector<HTMLElement>(`[data-remove-id="${CSS.escape(pending.id)}"]`) : null;
    (found ?? heading.current)?.focus();
  }, [entries]);

  const onPick = (category: TradeoffCategory, at: string, day: string) => {
    const entry: TradeoffEntry = { id: newId(), at, category };
    const next = addTradeoff(entries, entry, current());
    if (!next.some((e) => e.id === entry.id)) return;
    onChange(next);
    setUndos([]);
    setAdded({ id: entry.id, category, text: statusAdded(TRADEOFF_LABELS[category], day) });
    setSupport(category);
    setNoting(category === 'other');
    setAdding(false);
  };
  const onSaveNote = (note: string): boolean => {
    const found = all.find((e) => e.id === added?.id);
    if (!found) return false;
    const { entries: rest } = removeTradeoff(entries, found.id);
    const { note: _old, ...bare } = found;
    const restored = restoreTradeoff(rest, note.trim() ? { ...bare, note } : bare);
    if (!restored.some((e) => e.id === found.id)) return false;
    onChange(restored);
    setNoting(false);
    refocusAdd.current = true;
    return true;
  };
  const onUndoAdded = () => {
    if (!added) return;
    onChange(removeTradeoff(entries, added.id).entries);
    setAdded(null);
    setSupport(null);
    setNoting(false);
    refocusAdd.current = true;
  };
  const onRemove = (e: TradeoffEntry) => {
    const { entries: next, removed } = removeTradeoff(entries, e.id);
    if (!removed) return;
    const group = [week.thisWeek, week.lastWeek, ...week.earlier.map((w) => w.entries)].find((g) => g.some((x) => x.id === e.id)) ?? [];
    const at = group.findIndex((x) => x.id === e.id);
    focusAfter.current = { id: (group[at + 1] ?? group[at - 1])?.id ?? null };
    onChange(next);
    setAdded(null);
    setSupport(null);
    setNoting(false);
    setUndos((u) => [...u, { entries: [removed], cleared: false }]);
  };
  const onClear = () => {
    if (all.length === 0) return;
    focusAfter.current = { id: null };
    onChange([]);
    setAdded(null);
    setSupport(null);
    setNoting(false);
    setUndos((u) => [...u, { entries: all, cleared: true }]);
  };
  const onUndo = () => {
    const last = undos[undos.length - 1];
    if (!last) return;
    onChange(last.entries.reduce<TradeoffEntry[]>((list, e) => restoreTradeoff(list, e), entries ?? []));
    setUndos(undos.slice(0, -1));
    heading.current?.focus();
  };

  const latest = undos[undos.length - 1];
  return (
    <div ref={list} className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <PageHeader photo="signin-cups">
        <h1 ref={heading} tabIndex={-1} className="font-display text-[30px] text-balance outline-none">{TITLE}</h1>
        <p className="text-base text-pretty text-muted">{INTRO}</p>
      </PageHeader>

      <div className="grid gap-2">
        <p className="font-display text-xl text-pretty">{count === 0 ? EMPTY_WEEK : countSentence(count)}</p>
        <p className="text-base text-pretty text-muted">{DISCLAIMER}</p>
        {count > 0 && <p className="text-base text-pretty">{REFLECTION}</p>}
      </div>

      <div ref={statusLine} role="status" aria-live="polite" tabIndex={-1} className="grid justify-items-start gap-1 outline-none empty:hidden">
        {added && (
          <>
            <p className="text-base font-semibold">{added.text}</p>
            <div className="-ml-3 flex flex-wrap items-center gap-x-1">
              {!noting && all.find((e) => e.id === added.id)?.note === undefined && (
                <PillButton ref={noteButton} variant="text" onClick={() => setNoting(true)}>Add a note</PillButton>
              )}
              <PillButton variant="text" onClick={onUndoAdded}>Undo</PillButton>
            </div>
          </>
        )}
        {latest && (
          <div className="flex flex-wrap items-center gap-x-1">
            <p className="text-base font-semibold">{latest.cleared ? CLEARED_BEFORE : STATUS_REMOVED}</p>{' '}
            <PillButton variant="text" onClick={onUndo}>Undo</PillButton>{' '}
            {latest.cleared && <p className="text-base font-semibold">{CLEARED_AFTER}</p>}
            {!latest.cleared && undos.length > 1 && <p className="text-base">An earlier removal can also be undone.</p>}
          </div>
        )}
      </div>

      {added && support && (
        <SupportCard
          category={support}
          onOpenSupport={onOpenSupport}
          onClose={() => { setSupport(null); statusLine.current?.focus(); }}
        />
      )}

      {noting && <NoteForm onSave={onSaveNote} onSkip={() => { setNoting(false); refocusAdd.current = true; }} />}

      {adding ? (
        <AddTradeoff now={now} clock={clock} onPick={onPick} onCancel={() => setAdding(false)} />
      ) : (
        !noting && (
          <div>
            <PillButton ref={addButton} onClick={() => setAdding(true)} className="min-w-40">Add a trade-off</PillButton>
          </div>
        )
      )}

      <section aria-labelledby="tradeoffs-list" className="grid gap-2">
        <h2 id="tradeoffs-list" tabIndex={-1} className="font-display text-[24px] outline-none">This week</h2>
        <div>
          {week.thisWeek.length === 0 ? (
            <div className="flex items-center gap-4 py-1">
              <EmptyPlate size={72} />
              <p className="min-w-0 text-base text-pretty text-muted">What you add will be listed here.</p>
            </div>
          ) : (
            <Rows label="This week's trade-offs" entries={week.thisWeek} onRemove={onRemove} />
          )}
        </div>
      </section>

      <Disclosure summary="Last week">
        {week.lastWeek.length === 0 ? (
          <p className="pt-2 text-base text-muted">Nothing added for last week.</p>
        ) : (
          <div className="pt-2"><Rows label="Last week's trade-offs" entries={week.lastWeek} onRemove={onRemove} /></div>
        )}
      </Disclosure>

      {week.earlier.length > 0 && (
        <Disclosure summary="Earlier">
          <div className="grid gap-4 pt-2">
            {week.earlier.map((w) => {
              const title = `Week of ${dayLabel(localDay(w.start))}`;
              return (
                <section key={w.start.getTime()} aria-label={title} className="grid gap-1">
                  <h3 className="text-base font-semibold">{title}</h3>
                  <Rows label={title} entries={w.entries} onRemove={onRemove} />
                </section>
              );
            })}
          </div>
        </Disclosure>
      )}

      {count > 0 && (
        <div>
          <PillButton variant="text" className="-ml-3" onClick={onOpenBudget}>See my food budget</PillButton>
        </div>
      )}

      <HelpDisclosure onOpenSupport={onOpenSupport} />

      <div className="grid gap-2 text-sm text-muted">
        <p>{SHARED_DEVICE}</p>
        <p>{RETENTION}</p>
        <p>{STAYS_WITH_PROFILE}</p>
      </div>

      {all.length > 0 && (
        <div>
          <PillButton variant="text" className="-ml-3" onClick={onClear}>Clear all my trade-offs</PillButton>
        </div>
      )}
    </div>
  );
}
