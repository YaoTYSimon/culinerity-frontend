import { useState } from 'react';
import { type RankedSwap, healthLabel } from '@culinerity/core';
import { savingVsCraving } from './savings';
import { noBreak } from './noBreak';
import { FoodFitNotes } from './FoodFitNotes';
import { PillButton } from './PillButton';
import { RoundPhoto } from './RoundPhoto';

export interface WeekSwapInput {
  itemId: string;
  name: string;
  saving: number;
}

/** How one swap relates to the person's food setup, keyed by the swap's item id. */
export interface SwapNote {
  fit: 'fits' | 'check';
  kitchen: boolean;
  certifiedMeat: 'halal' | 'kosher' | null;
}

export const RULES_LINE = 'Showing swaps that avoid what you told us to avoid. This is a guide, not a certification. Check labels.';
export const NUTRITION_NOTE = 'Nutrition estimated from public food tables.';

interface Props {
  swaps: RankedSwap[];
  /** Per-swap food notes. Absent means no food setup: nothing extra is shown. */
  notes?: Record<string, SwapNote>;
  /** Any food rule or allergy is on: shows the guide line. */
  rulesOn?: boolean;
  /** Allergy words that could not be checked, each said back once. */
  unmatchedAllergies?: string[];
  /** A cultural item is on show, so the nutrition source note applies. */
  nutritionNote?: boolean;
  /** Health score of the craving itself, used only to pick a relative label. Null hides the indicator. */
  cravingHealth?: number | null;
  /** Cheapest per-serve price of the craving itself, used only for the "Saves" line. Null hides it. */
  cravingCost?: number | null;
  /** Called when a person taps "Add to my week" on a row with a positive saving. */
  onAddToWeek?: (swap: WeekSwapInput) => void;
}

function formatDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return noBreak(d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }));
}

export function SwapResults({ swaps, notes, rulesOn = false, unmatchedAllergies = [], nutritionNote = false, cravingHealth = null, cravingCost = null, onAddToWeek }: Props) {
  const [added, setAdded] = useState<Record<string, number>>({});
  const anySample = swaps.some((s) => s.price?.isSample);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {(rulesOn || unmatchedAllergies.length > 0) && (
        <div className="grid gap-1 text-pretty">
          {rulesOn && <p className="text-sm text-muted">{RULES_LINE}</p>}
          {unmatchedAllergies.map((a) => (
            <p key={a} className="text-sm font-semibold">We could not check "{a}". Read every label.</p>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-5">
        {swaps.map((s) => {
          const { alternative, note } = s.candidate;
          const health = healthLabel(s.health, cravingHealth);
          const date = s.price ? (formatDate(s.price.observedAt) ?? 'date unknown') : null;
          const food = notes?.[alternative.id];
          const saving = s.price ? savingVsCraving(cravingCost, s.cost) : null;
          return (
            <li key={alternative.id} className="flex items-center gap-3">
              <RoundPhoto itemId={alternative.id} size={58} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug text-balance">{alternative.name}</p>
                <p className="text-xs text-muted">{s.price ? `${s.price.store} · per serve` : note}</p>
                {food && <FoodFitNotes note={food} />}
                {saving !== null && <p className="mt-1.5 text-sm font-semibold">Saves ${saving.toFixed(2)}</p>}
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted empty:hidden">
                  {health && <span>{health}</span>}
                  {s.withinBudget !== null && <span>{s.withinBudget ? 'Within budget' : 'Over budget'}</span>}
                </p>
                {date && <p className="text-xs text-muted">Price seen {date}</p>}
                <span role="status" className="block text-xs font-semibold empty:hidden">
                  {added[alternative.id] ? (added[alternative.id] > 1 ? `Added to your week (${added[alternative.id]})` : 'Added to your week') : ''}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {s.cost === null || !s.price ? (
                  <p className="max-w-24 text-right text-sm text-muted">Price unavailable</p>
                ) : (
                  <p className="text-[22px] font-extrabold leading-none tracking-tight">${s.cost.toFixed(2)}</p>
                )}
                {saving !== null && (
                  <PillButton
                    size="icon"
                    aria-label={`Add ${alternative.name} to my week`}
                    onClick={() => {
                      onAddToWeek?.({ itemId: alternative.id, name: alternative.name, saving });
                      setAdded((prev) => ({ ...prev, [alternative.id]: (prev[alternative.id] ?? 0) + 1 }));
                    }}
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 8h10M8 3v10" />
                    </svg>
                  </PillButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {nutritionNote && <p className="text-xs text-muted">{NUTRITION_NOTE}</p>}
      {anySample && (
        <p className="text-xs text-muted">
          <span className="font-semibold text-ink">Sample data</span>
          <span className="ml-2">Prices here are examples, not live shelf prices.</span>
        </p>
      )}
    </div>
  );
}
