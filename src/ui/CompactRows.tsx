import { isOlderData, verificationLabel, type Indicator, type Source } from '@culinerity/core';
import { figureParts, previousText, periodText } from './BenchmarkRows';
import { Disclosure } from './Disclosure';
import { ExternalLink } from './ExternalLink';

interface Props {
  indicators: Indicator[];
  sources: Source[];
  now: Date;
  /** A row whose number is drawn elsewhere (a dial), so it is left out of the row. */
  hideFigure?: string;
}

/**
 * Shorter rows for a group of figures: label, figure, and what must stay visible ("Older data", "Press report only").
 * Period, measure, notes and how the figure was read sit under "About this figure"; each source is linked once, under the group.
 */
export function CompactRows({ indicators, sources, now, hideFigure }: Props) {
  const used = sources.filter((s) => indicators.some((i) => i.sourceId === s.id));
  // Two sources from one publisher would read as a repeat, so they are told apart by title.
  const samePublisher = new Set(used.map((s) => s.publisher)).size < used.length;
  return (
    <div className="grid gap-1">
      <ul className="grid">
        {indicators.map((i) => {
          const f = figureParts(i);
          const earlier = previousText(i);
          const flags = [i.verification === 'press' ? verificationLabel('press') : null, isOlderData(i, now) ? 'Older data' : null].filter(Boolean);
          return (
            <li key={i.id} className="grid gap-0.5 py-2">
              <p className="text-base font-semibold text-pretty">{i.label}</p>
              {i.id !== hideFigure && (
                <p className="break-words" data-figure>
                  <span className="font-display text-[28px]">{f.main}</span>
                  {f.unit && <span className="text-base font-semibold text-pretty"> {f.unit}</span>}
                </p>
              )}
              {flags.length > 0 && <p className="text-sm font-semibold text-pretty">{flags.join(' · ')}</p>}
              <Disclosure summary="About this figure">
                <div className="grid gap-1 pb-2 text-sm text-pretty text-muted">
                  <p>
                    {i.scope}. {periodText(i)}.{i.measure ? ` ${i.measure}.` : ''}
                  </p>
                  {earlier && <p>Earlier: {earlier}.</p>}
                  {i.note && <p>{i.note}</p>}
                  {i.verification !== 'press' && <p>{verificationLabel(i.verification)}</p>}
                </div>
              </Disclosure>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        {used.length === 1 ? 'Source' : 'Sources'}
      </p>
      <div className="flex flex-wrap gap-x-4">
        {used.map((s) => <ExternalLink key={s.id} href={s.url}>{samePublisher ? `${s.publisher}: ${s.title}` : s.publisher}</ExternalLink>)}
      </div>
    </div>
  );
}
