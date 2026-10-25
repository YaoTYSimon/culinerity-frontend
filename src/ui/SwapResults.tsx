import { type RankedSwap, healthLabel, type HealthLabel } from '@culinerity/core';

interface Props {
  swaps: RankedSwap[];
  /** Health score of the craving itself, used only to pick a relative label. Null hides the indicator. */
  cravingHealth?: number | null;
}

const HEALTH_STYLE: Record<HealthLabel, string> = {
  Healthier: 'border-success/30 bg-success/10 text-success',
  Similar: 'border-border bg-card text-muted-foreground',
  'Less healthy': 'border-border bg-card text-foreground',
};

function formatDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const chip = 'inline-block rounded border px-2 py-0.5 text-xs';

export function SwapResults({ swaps, cravingHealth = null }: Props) {
  return (
    <ul className="grid gap-3">
      {swaps.map((s) => {
        const { alternative, note } = s.candidate;
        const health = healthLabel(s.health, cravingHealth);
        const date = s.price ? (formatDate(s.price.observedAt) ?? 'date unknown') : null;
        return (
          <li key={alternative.id} className="rounded border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold">{alternative.name}</p>
              <div className="shrink-0 text-right">
                {s.cost === null || !s.price ? (
                  <p className="text-sm text-muted-foreground">Price unavailable</p>
                ) : (
                  <>
                    <p className="font-mono text-sm font-medium">${s.cost.toFixed(2)} per serve</p>
                    <p className="text-xs text-muted-foreground">at {s.price.store}</p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.price?.isSample && <span className={`${chip} border-border bg-card font-mono`}>Sample data</span>}
              {health && <span className={`${chip} ${HEALTH_STYLE[health]}`}>{health}</span>}
              {s.withinBudget !== null && (
                <span className={`${chip} ${s.withinBudget ? 'border-success/30 bg-success/10 text-success' : 'border-accent text-foreground'}`}>
                  {s.withinBudget ? 'Within budget' : 'Over budget'}
                </span>
              )}
            </div>
            {date && <p className="mt-2 text-xs text-muted-foreground">Price seen {date}</p>}
            <p className="mt-2 text-sm text-muted-foreground">{note}</p>
          </li>
        );
      })}
    </ul>
  );
}
