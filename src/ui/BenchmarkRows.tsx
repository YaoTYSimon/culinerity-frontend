import { Disclosure } from './Disclosure';
import { ExternalLink } from './ExternalLink';
import { isOlderData, StaticBenchmarkSource, verificationLabel, type BenchmarkSource, type Indicator, type Source } from '@culinerity/core';

interface Props {
  now: Date;
  source?: BenchmarkSource;
}

const DEFAULT_SOURCE = new StaticBenchmarkSource();

/** The rows shown by default, in this order, chosen by id; every other budget figure sits under "More figures". */
/** Said wherever poverty lines are shown. */
export const POVERTY_LINE_NOTE = 'These are lines for total income, not food budgets.';

export const HEADLINE_IDS = ['b-cpi-food-melbourne', 'b-cpi-food-australia', 'b-hes-food-share-low-income', 'b-poverty-line-single'];

/** The figure exactly as sourced, split so the number can be large and its unit small. */
export function figureParts(i: Indicator): { main: string; unit: string } {
  if (i.display) return { main: i.display, unit: i.unit.replace(/^%\s*/, '') };
  const v = typeof i.value === 'number' ? i.value.toLocaleString('en-AU', { minimumFractionDigits: i.decimals ?? 0, maximumFractionDigits: Math.max(i.decimals ?? 0, 20) }) : String(i.value);
  if (i.unit.startsWith('AUD')) return { main: `$${v}`, unit: i.unit.slice('AUD'.length).trim() };
  if (i.unit.startsWith('%')) return { main: `${v}%`, unit: i.unit.slice(1).trim() };
  return { main: v, unit: i.unit };
}

/** The period as a sentence: capitalised, and "Period not stated" when the source gives none. */
export function periodText(i: Indicator): string {
  return /^not stated/i.test(i.period) ? 'Period not stated' : i.period.charAt(0).toUpperCase() + i.period.slice(1);
}

/** The earlier figure as sourced, for example "4%, 2020". */
export function previousText(i: Indicator): string | null {
  if (!i.previous) return null;
  const { main } = figureParts({ ...i, value: i.previous.value, display: undefined });
  return `${main}, ${i.previous.period}`;
}

/** One sourced figure: label, number, scope, notes, how it was read and a link. `figure={false}` leaves the number to a dial. */
export function BenchmarkRow({ indicator, source, now, figure: showFigure = true }: { indicator: Indicator; source?: Source; now: Date; figure?: boolean }) {
  const figure = figureParts(indicator);
  const earlier = previousText(indicator);
  return (
    <li className="grid gap-1 py-3">
      <p className="text-base font-semibold text-pretty">{indicator.label}</p>
      {showFigure && (
        <p className="break-words" data-figure>
          <span className="font-display text-[34px]">{figure.main}</span>
          {figure.unit && <span className="block text-base font-semibold text-pretty">{figure.unit}</span>}
        </p>
      )}
      {isOlderData(indicator, now) && <p className="text-sm font-semibold text-pretty">Older data</p>}
      <Disclosure summary="About this figure">
        <div className="grid gap-1 pb-2 text-sm text-pretty text-muted">
          {earlier && <p>Earlier: {earlier}.</p>}
          <p>
            {indicator.scope}. {periodText(indicator)}.
            {indicator.measure ? ` ${indicator.measure}.` : ''}
          </p>
          {indicator.note && <p>{indicator.note}</p>}
          <p>{verificationLabel(indicator.verification)}</p>
        </div>
      </Disclosure>
      {source && <ExternalLink href={source.url}>{source.publisher}</ExternalLink>}
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
        <BenchmarkRow key={i.id} indicator={i} source={sources.find((s) => s.id === i.sourceId)} now={now} />
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="compares" className="grid gap-3">
      <h2 id="compares" className="font-display text-[24px]">How this compares</h2>
      <Disclosure summary="Show published figures">
      <div className="grid gap-3 pt-1">
      <p className="text-sm text-pretty text-muted">Published figures. Not added together.</p>
      {rows(headline)}
      <p className="text-sm text-pretty">{POVERTY_LINE_NOTE}</p>
      {more.length > 0 && (
        <Disclosure summary="More figures">
          {rows(more)}
        </Disclosure>
      )}
      {gaps.length > 0 && (
        <Disclosure summary="Not found">
          <div className="grid gap-1">
            <p className="text-sm text-muted">No number is shown for these.</p>
            <ul className="grid list-disc gap-1 pl-5 text-sm text-pretty text-muted">
              {gaps.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </div>
        </Disclosure>
      )}
      <p className="text-sm text-muted">General information, not financial advice.</p>
      </div>
      </Disclosure>
    </section>
  );
}
