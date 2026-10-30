import { useEffect, useRef, useState } from 'react';
import {
  budgetSummary,
  entriesThisWeek,
  MAX_SPEND_AMOUNT,
  parseMoney,
  removeSpend,
  restoreSpend,
  addSpend,
  savedThisWeek,
  shareOfIncome,
  weeklyTotals,
  type Pace,
  type Profile,
  type SpendEntry,
} from '@culinerity/core';
import { AddSpend, categoryLabel } from './AddSpend';
import { BenchmarkRows } from './BenchmarkRows';
import { BudgetDisclosure } from './BudgetDisclosure';
import { Disclosure } from './Disclosure';
import { BudgetPlate } from './BudgetPlate';
import { EmptyPlate } from './illustrations/EmptyPlate';
import { INPUT_CLASS } from './formParts';
import { formatDollars } from './money';
import { PageHeader } from './PageHeader';
import { noBreak } from './noBreak';
import { PillButton } from './PillButton';

interface Props {
  profile: Profile;
  now: Date;
  /** Called with the whole updated profile. */
  onChange: (next: Profile) => void;
  /** Reads the real time when an entry is saved (defaults to `now`). */
  clock?: () => Date;
  /** Which profile this is; changing it resets the view's own short-lived state. */
  profileId?: string;
  onSeeSwaps?: () => void;
  onOpenWeek?: () => void;
  onOpenWhatIf?: () => void;
}

const UNDO_MS = 6000;
const ADDED_MS = 4000;
const PAST_WEEKS = 12;

const PACE_TEXT: Record<Exclude<Pace, 'no-budget'>, string> = {
  'on-track': "You're on track.",
  'a-bit-fast': "You're spending a bit faster than the week.",
  over: "You've passed this week's budget. That's okay: here are cheaper swaps.",
};

/** "Thu 29 Oct", the same shape as every other day in the app (no comma after the weekday). */
const dayText = (d: Date): string => d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
const weekOfText = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return `Week of ${new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
};

/** A single field asking for the weekly budget; Skip lets the tracker run on spending alone. */
function AskBudget({ onSave, onSkip }: { onSave: (n: number) => void; onSkip: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseMoney(text, { allowZero: false, max: MAX_SPEND_AMOUNT });
        if (n === null) setError(true);
        else onSave(n);
      }}
    >
      <p className="text-base text-pretty text-muted">Set a weekly food budget to see how the week is going. You can skip this.</p>
      <div>
        <label htmlFor="ask-budget" className="mb-2 block text-sm font-medium">Weekly food budget ($)</label>
        <input
          id="ask-budget" type="text" inputMode="decimal" className={INPUT_CLASS} value={text}
          aria-invalid={error} aria-describedby={error ? 'ask-budget-error' : undefined}
          onChange={(e) => { setText(e.target.value); setError(false); }}
        />
        {error && (
          <p id="ask-budget-error" className="mt-2 px-5 text-sm font-semibold">
            Enter an amount in dollars, above zero and up to {formatDollars(MAX_SPEND_AMOUNT)}.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PillButton type="submit">Save budget</PillButton>
        <PillButton variant="text" onClick={onSkip}>Skip</PillButton>
      </div>
    </form>
  );
}

/** The tracker for one profile: remounted when the profile changes, so no undo, note or skip carries over. */
export function BudgetView({ profileId, ...props }: Props) {
  return <BudgetViewFor key={profileId ?? 'guest'} {...props} />;
}

/** What was spent on food this week, how the week is going, and sourced context. Everything stays on this device. */
function BudgetViewFor({ profile, now, clock, onChange, onSeeSwaps, onOpenWeek, onOpenWhatIf }: Omit<Props, 'profileId'>) {
  const [adding, setAdding] = useState(false);
  const [skipped, setSkipped] = useState(false);
  /** Removed rows that can still be undone, latest last. */
  const [undos, setUndos] = useState<SpendEntry[]>([]);
  const [added, setAdded] = useState('');
  const addButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const focusAfter = useRef<{ id: string | null } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => { clearTimeout(undoTimer.current); clearTimeout(addedTimer.current); }, []);
  const current = () => clock?.() ?? now;

  const budget = profile.foodBudgetWeekly;
  const hasBudget = typeof budget === 'number' && budget > 0;
  const summary = budgetSummary(profile.spendEntries, budget, now);
  const rows = entriesThisWeek(profile.spendEntries, now).slice().reverse();
  const saved = savedThisWeek(profile.weekSwaps, now);
  const share = shareOfIncome(summary.spent, profile.incomeWeekly);
  const past = weeklyTotals(profile.spendEntries, now, PAST_WEEKS + 1).slice(1).filter((w) => w.total > 0);
  const asking = !hasBudget && !skipped;

  // Closing the form hands focus back to the Add button.
  const wasAdding = useRef(false);
  useEffect(() => {
    if (wasAdding.current && !adding) addButton.current?.focus();
    wasAdding.current = adding;
  }, [adding]);
  // After a row is removed, focus lands on a neighbouring Remove button, or the list heading.
  useEffect(() => {
    const pending = focusAfter.current;
    if (!pending) return;
    focusAfter.current = null;
    const target = pending.id ? list.current?.querySelector<HTMLElement>(`[data-remove-id="${CSS.escape(pending.id)}"]`) : null;
    (target ?? heading.current)?.focus();
  }, [profile.spendEntries]);

  const closeForm = () => setAdding(false);
  const startUndoTimer = () => {
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndos([]), UNDO_MS);
  };
  const onAdd = (entry: SpendEntry) => {
    const next = addSpend(profile.spendEntries, entry, current());
    if (next === profile.spendEntries) return;
    onChange({ ...profile, spendEntries: next });
    setAdded(`Added ${formatDollars(entry.amount)}.`);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(''), ADDED_MS);
    closeForm();
  };
  const onRemove = (entry: SpendEntry) => {
    const { entries, removed } = removeSpend(profile.spendEntries, entry.id);
    if (!removed) return;
    const at = rows.findIndex((r) => r.id === entry.id);
    focusAfter.current = { id: (rows[at + 1] ?? rows[at - 1])?.id ?? null };
    onChange({ ...profile, spendEntries: entries });
    clearTimeout(addedTimer.current);
    setAdded('');
    setUndos((u) => [...u, removed]);
    startUndoTimer();
  };
  const onUndo = () => {
    const last = undos[undos.length - 1];
    if (!last) return;
    onChange({ ...profile, spendEntries: restoreSpend(profile.spendEntries, last) });
    const rest = undos.slice(0, -1);
    setUndos(rest);
    if (rest.length > 0) startUndoTimer();
    else clearTimeout(undoTimer.current);
  };
  const undo = undos[undos.length - 1];

  const entryName = (e: SpendEntry) => e.note ?? categoryLabel(e.category);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <PageHeader photo="budget-harvest">
        <h1 tabIndex={-1} className="font-display text-[30px] text-balance outline-none">This week's food.</h1>
      </PageHeader>

      {asking ? (
        <AskBudget onSave={(n) => onChange({ ...profile, foodBudgetWeekly: n })} onSkip={() => setSkipped(true)} />
      ) : (
        <>
          <div className="grid justify-items-center gap-2 text-center">
            <BudgetPlate summary={summary} budget={hasBudget ? budget : undefined} />
            <p className="text-base text-muted">
              {hasBudget
                ? `of ${formatDollars(budget)} · ${summary.daysLeft} ${summary.daysLeft === 1 ? 'day' : 'days'} left`
                : `${summary.daysLeft} ${summary.daysLeft === 1 ? 'day' : 'days'} left in the week`}
            </p>
          </div>
          {summary.pace !== 'no-budget' && (
            <div className="grid justify-items-start gap-2">
              <p className="text-lg font-semibold text-pretty">{PACE_TEXT[summary.pace]}</p>
              {summary.pace === 'over' && onSeeSwaps && <PillButton variant="surface" onClick={onSeeSwaps}>See cheaper swaps</PillButton>}
              {summary.perDayLeft !== null && (
                <p className="text-base text-pretty text-muted">About {formatDollars(summary.perDayLeft)} a day for the rest of the week.</p>
              )}
            </div>
          )}
          {!hasBudget && (
            <div>
              <PillButton variant="text" className="-ml-3" onClick={() => setSkipped(false)}>Set a weekly budget</PillButton>
            </div>
          )}
        </>
      )}

      <div role="status" aria-live="polite" className="grid justify-items-start gap-1 empty:hidden">
        {added && <p className="text-base font-semibold">{added}</p>}
        {undo && (
          <div className="flex flex-wrap items-center gap-1">
            <p className="text-base font-semibold">
              Removed {formatDollars(undo.amount)} ({entryName(undo)}).
              {undos.length > 1 && ' An earlier removal can also be undone.'}
            </p>
            <PillButton variant="text" onClick={onUndo}>Undo</PillButton>
          </div>
        )}
      </div>

      {adding ? (
        <AddSpend now={now} clock={clock} onAdd={onAdd} onCancel={closeForm} />
      ) : (
        <div>
          <PillButton ref={addButton} onClick={() => setAdding(true)} className="min-w-32">Add</PillButton>
        </div>
      )}

      <section aria-labelledby="week-list" className="grid gap-2">
        <h2 id="week-list" ref={heading} tabIndex={-1} className="font-display text-[24px] outline-none">Logged this week</h2>
        {rows.length === 0 ? (
          <div className="flex items-center gap-4 py-1">
            <EmptyPlate size={72} />
            <p className="min-w-0 text-base text-pretty text-muted">Nothing logged yet this week.</p>
          </div>
        ) : (
          <ul ref={list} aria-label="This week's spending" className="grid">
            {rows.map((e) => (
              <li key={e.id} className="flex min-h-11 items-center gap-2 py-1">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-base font-semibold">{entryName(e)}</span>
                  <span className="block text-sm text-muted">{note(e)}</span>
                </span>
                <span className="shrink-0 text-base font-extrabold">{formatDollars(e.amount)}</span>
                <PillButton variant="text" data-remove-id={e.id} className="shrink-0 text-sm" aria-label={`Remove ${entryName(e)}, ${formatDollars(e.amount)}`} onClick={() => onRemove(e)}>
                  Remove
                </PillButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {saved > 0 && (
        <div className="flex flex-wrap items-center gap-x-2">
          <p className="text-base">Saved with swaps this week: {formatDollars(saved)}</p>
          {onOpenWeek && <PillButton variant="text" className="-ml-3" onClick={onOpenWeek}>My week</PillButton>}
        </div>
      )}

      {onOpenWhatIf && (
        <div>
          <PillButton variant="text" className="-ml-3" onClick={onOpenWhatIf}>Try a what if</PillButton>
        </div>
      )}

      {share !== null && summary.spent > 0 && (
        <p className="text-base text-pretty">
          You've logged {formatDollars(summary.spent)} of food spending, which is {share}% of your weekly income of {formatDollars(profile.incomeWeekly as number)}.
        </p>
      )}

      <Disclosure summary="Past weeks">
        {past.length === 0 ? (
          <p className="pt-2 text-base text-muted">Nothing logged in earlier weeks.</p>
        ) : (
          <ul className="grid pt-2">
            {past.map((w) => (
              <li key={w.weekStart} className="flex min-h-11 items-center justify-between gap-2">
                <span className="text-base">{weekOfText(w.weekStart)}</span>
                <span className="text-base font-extrabold">{formatDollars(w.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Disclosure>

      {!asking && <BudgetDisclosure value={profile} onChange={onChange} />}

      <BenchmarkRows now={now} />
    </div>
  );
}

function note(e: SpendEntry): string {
  const when = noBreak(dayText(new Date(e.at)));
  return e.note ? `${categoryLabel(e.category)} · ${when}` : when;
}
