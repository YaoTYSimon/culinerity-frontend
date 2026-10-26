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
import { BudgetPlate } from './BudgetPlate';
import { INPUT_CLASS } from './formParts';
import { formatDollars } from './money';
import { PillButton } from './PillButton';

interface Props {
  profile: Profile;
  now: Date;
  /** Called with the whole updated profile. */
  onChange: (next: Profile) => void;
  onSeeSwaps?: () => void;
  onOpenWeek?: () => void;
}

const UNDO_MS = 6000;
const PAST_WEEKS = 12;

const PACE_TEXT: Record<Exclude<Pace, 'no-budget'>, string> = {
  'on-track': "You're on track.",
  'a-bit-fast': "You're spending a bit faster than the week.",
  over: "You've passed this week's budget. That's okay: here are cheaper swaps.",
};

const dayText = (d: Date): string => d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
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

/** What was spent on food this week, how the week is going, and sourced context. Everything stays on this device. */
export function BudgetView({ profile, now, onChange, onSeeSwaps, onOpenWeek }: Props) {
  const [adding, setAdding] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [undo, setUndo] = useState<SpendEntry | null>(null);
  const [added, setAdded] = useState('');
  const addButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

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
  const closeForm = () => setAdding(false);
  const onAdd = (entry: SpendEntry) => {
    const next = addSpend(profile.spendEntries, entry, now);
    if (next === profile.spendEntries) return;
    onChange({ ...profile, spendEntries: next });
    setAdded(`Added ${formatDollars(entry.amount)}.`);
    setUndo(null);
    closeForm();
  };
  const onRemove = (entry: SpendEntry) => {
    const { entries, removed } = removeSpend(profile.spendEntries, entry.id);
    if (!removed) return;
    onChange({ ...profile, spendEntries: entries });
    setAdded('');
    setUndo(removed);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };
  const onUndo = () => {
    if (!undo) return;
    clearTimeout(timer.current);
    onChange({ ...profile, spendEntries: restoreSpend(profile.spendEntries, undo) });
    setUndo(null);
  };

  const entryName = (e: SpendEntry) => e.note ?? categoryLabel(e.category);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <h1 tabIndex={-1} className="font-display text-[30px] text-balance outline-none">This week's food.</h1>

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
            <p className="text-base font-semibold">Removed {formatDollars(undo.amount)} ({entryName(undo)}).</p>
            <PillButton variant="text" onClick={onUndo}>Undo</PillButton>
          </div>
        )}
      </div>

      {adding ? (
        <AddSpend now={now} onAdd={onAdd} onCancel={closeForm} />
      ) : (
        <div>
          <PillButton ref={addButton} onClick={() => setAdding(true)} className="min-w-32">Add</PillButton>
        </div>
      )}

      <section aria-labelledby="week-list" className="grid gap-2">
        <h2 id="week-list" className="font-display text-[24px]">Logged this week</h2>
        {rows.length === 0 ? (
          <p className="text-base text-muted">Nothing logged yet this week.</p>
        ) : (
          <ul aria-label="This week's spending" className="grid">
            {rows.map((e) => (
              <li key={e.id} className="flex min-h-11 items-center gap-2 py-1">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-base font-semibold">{entryName(e)}</span>
                  <span className="block text-sm text-muted">{note(e)}</span>
                </span>
                <span className="shrink-0 text-base font-extrabold">{formatDollars(e.amount)}</span>
                <PillButton variant="text" className="shrink-0 text-sm" aria-label={`Remove ${entryName(e)}, ${formatDollars(e.amount)}`} onClick={() => onRemove(e)}>
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
          {onOpenWeek && <PillButton variant="text" onClick={onOpenWeek}>My week</PillButton>}
        </div>
      )}

      {share !== null && summary.spent > 0 && (
        <p className="text-base text-pretty">
          You've logged {formatDollars(summary.spent)} of food spending, which is {share}% of your weekly income of {formatDollars(profile.incomeWeekly as number)}.
        </p>
      )}

      <details className="group">
        <summary className="focus-ring flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-full text-base font-semibold [&::-webkit-details-marker]:hidden">
          <span>Past weeks</span>
          <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
            <svg viewBox="0 0 16 16" className="size-4 motion-safe:transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 6l4.5 4.5L12.5 6" />
            </svg>
          </span>
        </summary>
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
      </details>

      {!asking && <BudgetDisclosure value={profile} onChange={onChange} />}

      <BenchmarkRows now={now} />
    </div>
  );
}

function note(e: SpendEntry): string {
  const when = dayText(new Date(e.at));
  return e.note ? `${categoryLabel(e.category)} · ${when}` : when;
}
