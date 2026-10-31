import { useEffect, useRef, useState } from 'react';
import { addMeal, culturalWeek, labelFor, removeMeal, restoreMeal, type CulturalMeal } from '@culinerity/core';
import { AddMeal, MealDetails, withText } from './AddMeal';
import { defaultId, instantDayText as dayText } from './AddSpend';
import { noBreak } from './noBreak';
import { Disclosure } from './Disclosure';
import { EmptyPlate } from './illustrations/EmptyPlate';
import { PageHeader } from './PageHeader';
import { PillButton } from './PillButton';
import { WeekRing } from './WeekRing';

interface Props {
  meals: CulturalMeal[] | undefined;
  /** The person's traditions: starter ids or their own text. */
  traditions: string[];
  now: Date;
  /** Called with the whole updated list of meals. */
  onChange: (next: CulturalMeal[]) => void;
  onSetUpFood: () => void;
  /** Reads the real time when a meal is saved (defaults to `now`). */
  clock?: () => Date;
  /** Injected in tests. */
  newId?: () => string;
}

const STATUS_MS = 6000;
type Added = { id: string; text: string; detailed: boolean };

/** The same "Wed 4 Nov" form My food uses, in the person's own time zone. */
const mealName = (m: CulturalMeal): string => m.dish ?? labelFor(m.tradition);
const mealNote = (m: CulturalMeal): string =>
  [m.dish ? labelFor(m.tradition) : null, noBreak(dayText(m.at)), m.with ? withText(m.with) : null].filter(Boolean).join(' · ');

function MealRows({ label, meals, onRemove }: { label: string; meals: CulturalMeal[]; onRemove: (m: CulturalMeal) => void }) {
  return (
    <ul aria-label={label} className="grid">
      {meals.map((m) => (
        <li key={m.id} className="flex min-h-11 items-center gap-2 py-1">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-base font-semibold">{mealName(m)}</span>
            <span className="block text-sm text-muted">{mealNote(m)}</span>
          </span>
          <PillButton variant="text" data-remove-id={m.id} className="shrink-0 text-sm" aria-label={`Remove ${mealName(m)}, ${dayText(m.at)}`} onClick={() => onRemove(m)}>
            Remove
          </PillButton>
        </li>
      ))}
    </ul>
  );
}

/** Meals that felt like home: add in two taps, see the week as a ring, remove with Undo. Everything stays on this device. */
export function MealsView({ meals, traditions, now, onChange, onSetUpFood, clock, newId = defaultId }: Props) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);
  const [detailing, setDetailing] = useState(false);
  /** Removed meals that can still be undone, latest last. */
  const [undos, setUndos] = useState<CulturalMeal[]>([]);
  const addButton = useRef<HTMLButtonElement>(null);
  const detailsButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<{ id: string | null } | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(statusTimer.current), []);
  const current = () => clock?.() ?? now;

  const week = culturalWeek(meals, now);
  const startTimer = () => {
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => { setAdded(null); setUndos([]); }, STATUS_MS);
  };

  // Closing the form hands focus on: to "Add details" when a meal was just saved, else back to Add a meal.
  const wasAdding = useRef(false);
  useEffect(() => {
    if (wasAdding.current && !adding) (detailsButton.current ?? addButton.current)?.focus();
    wasAdding.current = adding;
  }, [adding]);
  // "Add a meal" is hidden while the details form is open, so ask for focus once it is back.
  const refocusAdd = useRef(false);
  useEffect(() => {
    if (!detailing && refocusAdd.current) {
      refocusAdd.current = false;
      addButton.current?.focus();
    }
  });
  // After a row is removed, focus lands on a neighbouring Remove button, or the list heading.
  useEffect(() => {
    const pending = focusAfter.current;
    if (!pending) return;
    focusAfter.current = null;
    const target = pending.id ? list.current?.querySelector<HTMLElement>(`[data-remove-id="${CSS.escape(pending.id)}"]`) : null;
    (target ?? heading.current)?.focus();
  }, [meals]);

  const onPick = (tradition: string, at: string, dayLabel: string) => {
    const meal: CulturalMeal = { id: newId(), at, tradition };
    const next = addMeal(meals, meal, current());
    if (next === (meals ?? [])) return;
    onChange(next);
    setUndos([]);
    setDetailing(false);
    setAdded({ id: meal.id, text: `Added: ${labelFor(tradition)}, ${dayLabel}.`, detailed: false });
    startTimer();
    setAdding(false);
  };
  const onSaveDetails = (details: Pick<CulturalMeal, 'dish' | 'with'>) => {
    const target = (meals ?? []).find((m) => m.id === added?.id);
    if (target && added) {
      const { meals: rest } = removeMeal(meals, target.id);
      const restored = restoreMeal(rest, { ...target, ...details });
      onChange(restored.some((m) => m.id === target.id) ? restored : (meals ?? []));
      setAdded({ ...added, detailed: true });
    }
    setDetailing(false);
    startTimer();
    refocusAdd.current = true;
  };
  const onUndoAdded = () => {
    if (!added) return;
    onChange(removeMeal(meals, added.id).meals);
    clearTimeout(statusTimer.current);
    setAdded(null);
    setDetailing(false);
    refocusAdd.current = true;
  };
  const onRemove = (meal: CulturalMeal) => {
    const { meals: next, removed } = removeMeal(meals, meal.id);
    if (!removed) return;
    const at = week.thisWeek.findIndex((m) => m.id === meal.id);
    focusAfter.current = { id: (week.thisWeek[at + 1] ?? week.thisWeek[at - 1])?.id ?? null };
    onChange(next);
    setAdded(null);
    setDetailing(false);
    setUndos((u) => [...u, removed]);
    startTimer();
  };
  const onUndoRemoved = () => {
    const last = undos[undos.length - 1];
    if (!last) return;
    onChange(restoreMeal(meals, last));
    const rest = undos.slice(0, -1);
    setUndos(rest);
    if (rest.length > 0) startTimer();
    else clearTimeout(statusTimer.current);
    heading.current?.focus();
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <PageHeader photo="policy-shared-meal">
        <h1 tabIndex={-1} className="font-display text-[30px] text-balance outline-none">Meals that felt like home</h1>
        <p className="text-base text-pretty text-muted">Add a meal when you like. It stays on this device.</p>
      </PageHeader>

      <div className="grid justify-items-center gap-3 text-center">
        <WeekRing days={week.days} todayIndex={week.todayIndex} />
        <p className="text-lg font-semibold text-pretty">
          {week.count === 0
            ? 'Nothing here yet this week. Add a meal when you like.'
            : `${week.count} ${week.count === 1 ? 'meal' : 'meals'} that felt like home this week`}
        </p>
      </div>

      <div role="status" aria-live="polite" className="grid justify-items-start gap-1 empty:hidden">
        {added && (
          <div className="flex flex-wrap items-center gap-x-1">
            <p className="text-base font-semibold">{added.text}</p>
            {!added.detailed && !detailing && (
              <PillButton ref={detailsButton} variant="text" onClick={() => { clearTimeout(statusTimer.current); setDetailing(true); }}>Add details</PillButton>
            )}
            <PillButton variant="text" onClick={onUndoAdded}>Undo</PillButton>
          </div>
        )}
        {undos.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-1">
            <p className="text-base font-semibold">Removed.{undos.length > 1 && ' An earlier removal can also be undone.'}</p>
            <PillButton variant="text" onClick={onUndoRemoved}>Undo</PillButton>
          </div>
        )}
      </div>

      {detailing && <MealDetails onSave={onSaveDetails} onSkip={() => { setDetailing(false); startTimer(); refocusAdd.current = true; }} />}

      {adding ? (
        <AddMeal now={now} clock={clock} traditions={traditions} onPick={onPick} onSetUpFood={onSetUpFood} onCancel={() => setAdding(false)} />
      ) : (
        !detailing && (
          <div>
            <PillButton ref={addButton} onClick={() => setAdding(true)} className="min-w-40">Add a meal</PillButton>
          </div>
        )
      )}

      <section aria-labelledby="meals-list" className="grid gap-2">
        <h2 id="meals-list" ref={heading} tabIndex={-1} className="font-display text-[24px] outline-none">This week</h2>
        <div ref={list}>
          {week.thisWeek.length === 0 ? (
            <div className="flex items-center gap-4 py-1">
              <EmptyPlate size={72} />
              <p className="min-w-0 text-base text-pretty text-muted">Meals you add will be listed here.</p>
            </div>
          ) : (
            <MealRows label="This week's meals" meals={week.thisWeek} onRemove={onRemove} />
          )}
        </div>
      </section>

      <Disclosure summary="Last week">
        {week.lastWeek.length === 0 ? (
          <p className="pt-2 text-base text-muted">Nothing added for last week.</p>
        ) : (
          <div className="pt-2"><MealRows label="Last week's meals" meals={week.lastWeek} onRemove={onRemove} /></div>
        )}
      </Disclosure>
    </div>
  );
}
