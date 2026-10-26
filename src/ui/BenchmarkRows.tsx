import { isOlderData, StaticBenchmarkSource, verificationLabel, type BenchmarkSource, type Indicator, type Source } from '@culinerity/core';

interface Props {
  now: Date;
  source?: BenchmarkSource;
}

const DEFAULT_SOURCE = new StaticBenchmarkSource();

/** The research gaps that matter to a food budget (the dataset's gap list is shared with the policy page). */
const BUDGET_GAP = /food spend|food budget|healthy food basket|poverty line|student weekly/i;

/** The figure exactly as sourced: its own display text, else the number with its unit. */
export function figureText(i: Indicator): string {
  if (i.display) return i.display;
  const v = String(i.value);
  if (i.unit.startsWith('AUD')) return `$${v}${i.unit.slice('AUD'.length)}`;
  if (i.unit.startsWith('%')) return `${v}${i.unit}`;
  return `${v} ${i.unit}`;
}

function Row({ indicator, source, now }: { indicator: Indicator; source?: Source; now: Date }) {
  return (
    <li className="grid gap-1 py-3">
      <p className="text-base font-semibold text-pretty">{indicator.label}</p>
      <p className="font-display text-[28px] break-words">{figureText(indicator)}</p>
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
  const gaps = source.notFound().filter((g) => BUDGET_GAP.test(g));
  return (
    <section aria-labelledby="compares" className="grid gap-3">
      <h2 id="compares" className="font-display text-[24px]">How this compares</h2>
      <p className="text-sm text-pretty text-muted">
        Official and published figures, shown as their sources give them. They measure different things, so they are not added together.
      </p>
      <ul className="grid">
        {source.indicators('budget').map((i) => (
          <Row key={i.id} indicator={i} source={sources.find((s) => s.id === i.sourceId)} now={now} />
        ))}
      </ul>
      <p className="text-sm text-pretty">These are lines for total income, not food budgets.</p>
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
