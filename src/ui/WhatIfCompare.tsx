import { compare, formatCents, ROW_LABELS, runWhatIf, type Baseline, type Cents, type RowKey, type SavedWhatIf, type Scenario } from '@culinerity/core';
import { PillRadio, type Option } from './WhatIfFields';
import { WhatIfTable } from './WhatIfTable';
import { needsSentence, WHATIF_COPY } from './whatIfCopy';

type Pick = SavedWhatIf | 'draft';

interface Props {
  a: Pick;
  b: Pick;
  baseline: Baseline;
  now: Date;
  /** The change just tried, used when either side is 'draft'. */
  draft?: { scenario: Scenario; name: string } | null;
}

const LEFT: RowKey[] = ['leftAfterCosts', 'leftAfterFood'];
const abs = (c: Cents): string => formatCents(Math.abs(c));

function figure(key: RowKey, c: Cents | null): string {
  if (c === null) return 'Not known';
  return LEFT.includes(key) && c < 0 ? `short by ${abs(c)}` : formatCents(c);
}
const diffText = (c: Cents | null): string => (c === null ? '' : c === 0 ? WHATIF_COPY.compareSame : `${abs(c)} ${c < 0 ? 'less' : 'more'}`);

function resolve(p: Pick, draft: Props['draft']): { scenario: Scenario; name: string } | null {
  if (p === 'draft') return draft ?? null;
  return { scenario: p.scenario, name: p.name };
}

/**
 * Two changes, each worked out with today's numbers, line by line.
 */
export function WhatIfCompare({ a, b, baseline, now, draft }: Props) {
  const ra = resolve(a, draft);
  const rb = resolve(b, draft);
  if (!ra || !rb) return null;
  const results = [ra, rb].map((x) => ({ ...x, result: runWhatIf(baseline, x.scenario, now) }));
  const problems = results.flatMap((x) => {
    if (x.result.status === 'needs') return [WHATIF_COPY.compareNeeds(x.name, needsSentence(x.result.missing, false))];
    if (x.result.status === 'invalid') return [WHATIF_COPY.compareNeeds(x.name, WHATIF_COPY.invalidForm)];
    return [];
  });
  const [x, y] = results;
  if (problems.length > 0 || x.result.status !== 'ok' || y.result.status !== 'ok') {
    return <section aria-labelledby="whatif-compare" className="grid gap-3">
      <h3 id="whatif-compare" className="text-lg font-semibold">{WHATIF_COPY.compareResultHeading}</h3>
      {problems.map((p) => <p key={p} className="text-base text-pretty">{p}</p>)}
    </section>;
  }
  const c = compare(x.result, y.result);
  const rows = c.rows.filter((r) => (r.a !== null || r.b !== null) && (r.key !== 'oneOff' || r.a !== 0 || r.b !== 0));
  return (
    <section aria-labelledby="whatif-compare" className="grid gap-3">
      <h3 id="whatif-compare" className="text-lg font-semibold">{WHATIF_COPY.compareResultHeading}</h3>
      <p className="text-lg font-semibold text-pretty">{c.sentence}</p>
      <p className="text-base text-pretty break-words">{WHATIF_COPY.compareFirst}: {x.name}. {WHATIF_COPY.compareSecond}: {y.name}.</p>
      <WhatIfTable
        caption={WHATIF_COPY.compareCaption}
        headers={[WHATIF_COPY.compareLine, WHATIF_COPY.compareFirst, WHATIF_COPY.compareSecond, WHATIF_COPY.compareDifference]}
        rows={rows.map((r) => ({
          key: r.key,
          label: ROW_LABELS[r.key],
          cells: [
            { label: WHATIF_COPY.compareFirst, text: figure(r.key, r.a) },
            { label: WHATIF_COPY.compareSecond, text: figure(r.key, r.b) },
            { label: WHATIF_COPY.compareDifference, text: diffText(r.diff) },
          ],
        }))}
      />
    </section>
  );
}

/** Choose the two to compare: the saved ones, and the change just tried. */
export function ComparePicker({ options, first, second, onFirst, onSecond }: {
  options: Option<string>[]; first: string | null; second: string | null; onFirst: (v: string) => void; onSecond: (v: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <p className="text-base text-pretty text-muted">{WHATIF_COPY.compareIntro}</p>
      <div className="grid gap-2">
        <span aria-hidden="true" className="text-sm text-muted">{WHATIF_COPY.compareFirst}</span>
        <PillRadio name={WHATIF_COPY.compareFirst} options={options} value={first} onChange={onFirst} />
      </div>
      <div className="grid gap-2">
        <span aria-hidden="true" className="text-sm text-muted">{WHATIF_COPY.compareSecond}</span>
        <PillRadio name={WHATIF_COPY.compareSecond} options={options} value={second} onChange={onSecond} />
      </div>
      {(first === null || second === null) && <p className="text-base text-pretty">{WHATIF_COPY.comparePick}</p>}
    </div>
  );
}
