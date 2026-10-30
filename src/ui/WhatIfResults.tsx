import type { Ref } from 'react';
import { formatCents, type Baseline, type Explanation, type ExplanationRow, type RowKey, type Scenario, type WhatIfResult } from '@culinerity/core';
import { Disclosure } from './Disclosure';
import { WhatIfPlates } from './WhatIfPlates';
import { WhatIfWeeks } from './WhatIfWeeks';
import { WhatIfContext } from './WhatIfContext';
import { WhatIfHelp } from './WhatIfHelp';
import { needsSentence, WHATIF_COPY } from './whatIfCopy';

type Help = Parameters<typeof WhatIfHelp>[0];

interface Props {
  scenario: Scenario;
  result: WhatIfResult;
  explanation: Explanation | null;
  now: Date;
  headingRef: Ref<HTMLHeadingElement>;
  help: Help;
}

const LEFT_ROWS: RowKey[] = ['leftAfterCosts', 'leftAfterFood'];
const abs = (c: number): string => formatCents(Math.abs(c));

/** A figure as words: negative amounts left over read "short by", never a bare minus. */
function figure(row: ExplanationRow, c: number | null): string {
  if (c === null) return 'Not known';
  return LEFT_ROWS.includes(row.key) && c < 0 ? `short by ${abs(c)}` : formatCents(c);
}
const changeText = (c: number | null): string => (c === null ? '' : c === 0 ? 'No change' : `${abs(c)} ${c < 0 ? 'less' : 'more'}`);

const shown = (r: ExplanationRow, hasBill: boolean): boolean =>
  (r.before !== null || r.after !== null) && (r.key !== 'oneOff' || hasBill);

function weekLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

function Cell({ label, children }: { label: string; children: string }) {
  return (
    <td role="cell" className="px-4 py-2 text-base sm:table-cell">
      <span aria-hidden="true" className="block text-sm text-muted sm:hidden">{label}</span>
      {children}
    </td>
  );
}

function Table({ rows, weekStart }: { rows: ExplanationRow[]; weekStart: string }) {
  return (
    <table role="table" className="w-full border-collapse text-left">
      <caption className="mb-2 text-left text-sm text-pretty text-muted">Before and after, for the week starting {weekLabel(weekStart)}</caption>
      <thead role="rowgroup" className="sr-only sm:not-sr-only">
        <tr role="row" className="sm:table-row">
          <th role="columnheader" scope="col" className="w-1/4" />
          {['Before', 'After', 'Change'].map((h) => <th key={h} role="columnheader" scope="col" className="px-4 py-2 text-sm font-semibold text-muted">{h}</th>)}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((r) => (
          <tr key={r.key} role="row" className="grid grid-cols-3 odd:bg-surface sm:table-row">
            <th role="rowheader" scope="row" className="col-span-3 px-4 pt-2 text-base font-semibold sm:table-cell sm:py-2">{r.label}</th>
            <Cell label="Before">{r.before === null ? 'Not entered' : figure(r, r.before)}</Cell>
            <Cell label="After">{r.before === null ? 'Not known' : figure(r, r.after)}</Cell>
            <Cell label="Change">{changeText(r.change)}</Cell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function List({ items }: { items: string[] }) {
  return <ul className="grid list-disc gap-1 pl-5 text-base text-pretty">{items.map((t) => <li key={t}>{t}</li>)}</ul>;
}

/** The answer: headline, before and after, how it was worked out, context and help. Help comes first when the sums fall short. */
export function WhatIfResults({ scenario, result, explanation, now, headingRef, help }: Props) {
  const rentPercent = (s: Scenario) => (s.kind === 'combined' ? s.steps : [s]).some((x) => x.kind === 'rent-change' && x.by.mode === 'percent');
  const hasBill = (scenario.kind === 'combined' ? scenario.steps : [scenario]).some((x) => x.kind === 'one-off-bill');
  return (
    <section aria-labelledby="whatif-results" className="grid gap-4">
      <h2 id="whatif-results" ref={headingRef} tabIndex={-1} className="font-display text-[24px] outline-none">{WHATIF_COPY.resultsHeading}</h2>
      {result.status === 'needs' && <p className="text-base text-pretty">{needsSentence(result.missing, rentPercent(scenario) && result.missing.includes('housingWeekly'))}</p>}
      {result.status === 'invalid' && <p className="text-base text-pretty">{WHATIF_COPY.invalidForm}</p>}
      {result.status === 'ok' && explanation && (
        <>
          <p className="text-lg font-semibold text-pretty">{explanation.headline}</p>
          <WhatIfPlates beforeDays={result.before.foodDays} afterDays={result.weeks[result.firstAffectedWeek - 1].foodDays} />
          {explanation.shortfall && (
            <div className="grid gap-2">
              <p className="text-base text-pretty">{WHATIF_COPY.shortfall}</p>
              <WhatIfHelp {...help} />
            </div>
          )}
          <Table rows={explanation.rows.filter((r) => shown(r, hasBill))} weekStart={result.weekStarts[result.firstAffectedWeek - 1]} />
          <WhatIfWeeks result={result} />
          {result.before.leftAfterCosts === null && <p className="text-base text-pretty">{WHATIF_COPY.addIncome}</p>}
          <div className="grid gap-2">
            <h3 className="text-lg font-semibold">{WHATIF_COPY.howHeading}</h3>
            <List items={explanation.how} />
          </div>
          <Disclosure summary={WHATIF_COPY.assumedHeading}><div className="pb-2"><List items={explanation.assumed} /></div></Disclosure>
          <Disclosure summary={WHATIF_COPY.unknownHeading}><div className="pb-2"><List items={explanation.unknown} /></div></Disclosure>
          <WhatIfContext scenario={scenario} now={now} />
          {!explanation.shortfall && (
            <div className="grid gap-2">
              <h3 className="text-lg font-semibold">{WHATIF_COPY.helpHeading}</h3>
              <WhatIfHelp {...help} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
