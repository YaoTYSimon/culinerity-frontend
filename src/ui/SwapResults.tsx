import { useState } from 'react';
import { type RankedSwap, healthLabel } from '@culinerity/core';
import { savingVsCraving } from './savings';
import { PillButton } from './PillButton';
import { RoundPhoto } from './RoundPhoto';

export interface WeekSwapInput {
  itemId: string;
  name: string;
  saving: number;
}

interface Props {
  swaps: RankedSwap[];
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
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function SwapResults({ swaps, cravingHealth = null, cravingCost = null, onAddToWeek }: Props) {
  const [added, setAdded] = useState<Record<string, number>>({});
  const anySample = swaps.some((s) => s.price?.isSample);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-5">
        {swaps.map((s) => {
          const { alternative, note } = s.candidate;
          const health = healthLabel(s.health, cravingHealth);
          const date = s.price ? (formatDate(s.price.observedAt) ?? 'date unknown') : null;
          const saving = s.price ? savingVsCraving(cravingCost, s.cost) : null;
          return (
            <li key={alternative.id} className="flex items-center gap-3">
              <RoundPhoto itemId={alternative.id} size={58} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug text-balance">{alternative.name}</p>
                <p className="text-xs text-muted">{s.price ? `${s.price.store} · per serve` : note}</p>
                {saving !== null && <p className="mt-0.5 text-sm font-semibold">Saves ${saving.toFixed(2)}</p>}
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
                  {health && <span>{health}</span>}
                  {s.withinBudget !== null && <span>{s.withinBudget ? 'Within budget' : 'Over budget'}</span>}
                  {date && <span>Price seen {date}</span>}
                </p>
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
      {anySample && (
        <p className="text-xs text-muted">
          <span className="font-semibold text-ink">Sample data</span>
          <span className="ml-2">Prices here are examples, not live shelf prices.</span>
        </p>
      )}
    </div>
  );
}
