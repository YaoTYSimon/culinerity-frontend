import { type RankedSwap, healthLabel, type HealthLabel } from '@culinerity/core';
import { savingVsCraving } from './savings';
import { FoodIllustration } from './illustrations';

interface Props {
  swaps: RankedSwap[];
  /** Health score of the craving itself, used only to pick a relative label. Null hides the indicator. */
  cravingHealth?: number | null;
  /** Cheapest per-serve price of the craving itself, used only for the "saves" chip. Null hides it. */
  cravingCost?: number | null;
}

const HEALTH_STYLE: Record<HealthLabel, string> = {
  Healthier: 'bg-success-soft text-success',
  Similar: 'bg-legacy-muted text-muted-foreground',
  'Less healthy': 'bg-legacy-muted text-foreground',
};

function formatDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const chip = 'inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium';

export function SwapResults({ swaps, cravingHealth = null, cravingCost = null }: Props) {
  const anySample = swaps.some((s) => s.price?.isSample);
  return (
    <div className="grid gap-2">
      <ul className="grid gap-2">
        {swaps.map((s) => {
          const { alternative, note } = s.candidate;
          const health = healthLabel(s.health, cravingHealth);
          const date = s.price ? (formatDate(s.price.observedAt) ?? 'date unknown') : null;
          const saving = savingVsCraving(cravingCost, s.cost);
          return (
            <li
              key={alternative.id}
              className="rounded-card bg-card p-4 motion-colors hover:bg-legacy-muted"
            >
              <div className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-2">
                <div className="size-16 shrink-0 rounded bg-background p-1 sm:row-span-2 sm:size-20 sm:p-1.5">
                  <FoodIllustration id={alternative.id} className="size-full" />
                </div>
                <p className="min-w-0 text-base font-semibold text-balance">{alternative.name}</p>
                <div className="text-right sm:row-span-2">
                  {s.cost === null || !s.price ? (
                    <p className="text-sm text-muted-foreground">Price unavailable</p>
                  ) : (
                    <>
                      <p className="text-2xl font-semibold leading-none">${s.cost.toFixed(2)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">per serve</p>
                    </>
                  )}
                </div>
                <p className="col-span-3 text-sm text-pretty text-muted-foreground sm:col-span-1 sm:col-start-2">{note}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {saving !== null && (
                  <span className={`${chip} bg-success-soft text-success`}>Saves ${saving.toFixed(2)} vs your craving</span>
                )}
                {health && <span className={`${chip} ${HEALTH_STYLE[health]}`}>{health}</span>}
                {s.withinBudget !== null && (
                  <span className={`${chip} ${s.withinBudget ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent'}`}>
                    {s.withinBudget ? 'Within budget' : 'Over budget'}
                  </span>
                )}
              </div>
              {s.price && date && (
                <p className="mt-3 text-xs text-muted-foreground">
                  at {s.price.store} · price seen {date}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {anySample && (
        <p className="text-xs text-muted-foreground">
          <span className="rounded-sm bg-legacy-muted px-2 py-0.5 font-medium text-foreground">Sample data</span>
          <span className="ml-2">Prices here are examples, not live shelf prices.</span>
        </p>
      )}
    </div>
  );
}
