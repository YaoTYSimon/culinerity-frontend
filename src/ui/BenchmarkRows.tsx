import { isOlderData, StaticBenchmarkSource, verificationLabel, type BenchmarkSource, type Indicator, type Source } from '@culinerity/core';

interface Props {
  now: Date;
  source?: BenchmarkSource;
}

const DEFAULT_SOURCE = new StaticBenchmarkSource();

/** The rows shown by default, in this order, chosen by id; every other budget figure sits under "More figures". */
export const HEADLINE_IDS = ['b-cpi-food-melbourne', 'b-cpi-food-australia', 'b-hes-food-share-low-income', 'b-poverty-line-single'];

/** The figure exactly as sourced, split so the number can be large and its unit small. */
export function figureParts(i: Indicator): { main: string; unit: string } {
  if (i.display) return { main: i.display, unit: i.unit.replace(/^%\s*/, '') };
  const v = String(i.value);
  if (i.unit.startsWith('AUD')) return { main: `$${v}`, unit: i.unit.slice('AUD'.length).trim() };
  if (i.unit.startsWith('%')) return { main: `${v}%`, unit: i.unit.slice(1).trim() };
  return { main: v, unit: i.unit };
}

function Row({ indicator, source, now }: { indicator: Indicator; source?: Source; now: Date }) {
  const figure = figureParts(indicator);
  return (
    <li className="grid gap-1 py-3">
      <p className="text-base font-semibold text-pretty">{indicator.label}</p>
      <p className="break-words">
        <span className="font-display text-[34px]">{figure.main}</span>
        {figure.unit && <span className="block text-base font-semibold text-pretty">{figure.unit}</span>}
      </p>
      <p className="text-sm text-pretty text-muted">
        {indicator.scope}. {indicator.period}.
        {indicator.measure ? ` ${indicator.measure}.` : ''}
      </p>
      {indicator.note && <p className="text-sm text-pretty text-muted">{indicator.note}</p>}
      <p className="text-sm text-pretty text-muted">
        {verificationLabel(indicator.verification)}
        {isOlderData(indicator, now) && <strong className="font-semibold text-ink">{' · Older data'}</strong>}
      </p>
      {source && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex min-h-11 w-fit max-w-full items-center rounded-full text-sm font-semibold text-ink underline underline-offset-4"
        >
          <span className="min-w-0 break-words">{source.publisher}<span className="sr-only"> (opens the source in a new tab)</span></span>
        </a>
      )}
    </li>
  );
}

/** Sourced context for a food budget. Values, links and labels come from the dataset; nothing is typed in here. */
export function BenchmarkRows({ now, source = DEFAULT_SOURCE }: Props) {
  const sources = source.sources();
  const all = source.indicators('budget');
  const headline = HEADLINE_IDS.flatMap((id) => all.find((i) => i.id === id) ?? []);
  const more = all.filter((i) => !HEADLINE_IDS.includes(i.id));
  const gaps = source.notFound('budget');
  const rows = (list: Indicator[]) => (
    <ul className="grid">
      {list.map((i) => (
        <Row key={i.id} indicator={i} source={sources.find((s) => s.id === i.sourceId)} now={now} />
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="compares" className="grid gap-3">
      <h2 id="compares" className="font-display text-[24px]">How this compares</h2>
      <p className="text-sm text-pretty text-muted">
        Official and published figures, shown as their sources give them. They measure different things, so they are not added together.
      </p>
      {rows(headline)}
      <p className="text-sm text-pretty">These are lines for total income, not food budgets.</p>
      {more.length > 0 && (
        <details className="group">
          <summary className="focus-ring flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-full text-base font-semibold [&::-webkit-details-marker]:hidden">
            <span>More figures</span>
            <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
              <svg viewBox="0 0 16 16" className="size-4 motion-safe:transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 6l4.5 4.5L12.5 6" />
              </svg>
            </span>
          </summary>
          {rows(more)}
        </details>
      )}
      {gaps.length > 0 && (
        <div className="grid gap-1">
          <h3 className="text-base font-semibold">Not found</h3>
          <p className="text-sm text-muted">We looked and could not find these, so we show no number for them.</p>
          <ul className="grid list-disc gap-1 pl-5 text-sm text-pretty text-muted">
            {gaps.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </div>
      )}
      <p className="text-sm text-muted">General information, not financial advice.</p>
    </section>
  );
}
