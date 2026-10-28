import type { ActiveOccasion } from '@culinerity/core';
import { dayLabel, MOON_CAVEAT } from './foodCopy';
import { PillButton } from './PillButton';

interface Props {
  active: ActiveOccasion | undefined;
  onSeeSwaps: () => void;
  onBudget: () => void;
  onDismiss: (key: string) => void;
}

/** "Ramadan starts about Mon 8 Feb.", "Passover starts Thu 22 Apr (from the evening before).", or "Lent is on now." */
export function occasionSentence(o: ActiveOccasion): string {
  if (o.phase === 'now') return `${o.label} is on now.`;
  const evening = o.evening ? ' (from the evening before)' : '';
  return `${o.label} starts ${o.approx ? 'about ' : ''}${dayLabel(o.start)}${evening}.`;
}

/** One quiet line for the nearest chosen occasion. Plain text and text buttons: no alerts, badges or counters. */
export function OccasionLine({ active, onSeeSwaps, onBudget, onDismiss }: Props) {
  if (!active) return null;
  return (
    <section aria-label="Coming up" className="grid min-w-0 gap-1 text-ink">
      <p className="text-base text-pretty">
        {occasionSentence(active)}
        {active.approx && active.phase === 'soon' && ` ${MOON_CAVEAT}`}
      </p>
      {active.gathering && <p className="text-base text-pretty text-muted">Gatherings can cost more. Here is your budget.</p>}
      <div className="-ml-3 flex flex-wrap items-center">
        <PillButton variant="text" onClick={onSeeSwaps}>See swaps that fit</PillButton>
        {active.gathering && <PillButton variant="text" onClick={onBudget}>Look at your budget</PillButton>}
        <PillButton variant="text" onClick={() => onDismiss(active.key)}>Not now</PillButton>
      </div>
    </section>
  );
}
