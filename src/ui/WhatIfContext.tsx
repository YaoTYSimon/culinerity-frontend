import { contextIds, StaticBenchmarkSource, type BenchmarkSource, type Indicator, type Scenario } from '@culinerity/core';
import { BenchmarkRow } from './BenchmarkRows';
import { WHATIF_COPY } from './whatIfCopy';

const DEFAULT_SOURCE = new StaticBenchmarkSource();

/** Sourced figures beside a result, per kind of change. Context only; none is used in the sums. */
export function WhatIfContext({ scenario, now, source = DEFAULT_SOURCE }: { scenario: Scenario; now: Date; source?: BenchmarkSource }) {
  const ids = contextIds(scenario);
  const sources = source.sources();
  // Explicit groups: the what-if rows live apart from the budget figures that a few ids borrow.
  const all = [...source.indicators('whatif'), ...source.indicators('budget')];
  const rows = ids.flatMap((id) => all.find((i) => i.id === id) ?? []);
  const hasBill = scenario.kind === 'one-off-bill' || (scenario.kind === 'combined' && scenario.steps.some((s) => s.kind === 'one-off-bill'));
  if (rows.length === 0 && !hasBill) return null;
  return (
    <section aria-labelledby="whatif-context" data-context className="grid gap-2">
      <h3 id="whatif-context" className="text-lg font-semibold">{WHATIF_COPY.contextHeading}</h3>
      <p className="text-sm text-pretty text-muted">{WHATIF_COPY.contextIntro}</p>
      {rows.length > 0 && (
        <ul className="grid">
          {rows.map((i: Indicator) => <BenchmarkRow key={i.id} indicator={i} source={sources.find((s) => s.id === i.sourceId)} now={now} />)}
        </ul>
      )}
      {hasBill && <p className="text-sm text-pretty text-muted">{WHATIF_COPY.noBillContext}</p>}
    </section>
  );
}
