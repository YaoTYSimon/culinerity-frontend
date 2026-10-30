import { useState } from 'react';
import { formatCents, type WhatIfResult } from '@culinerity/core';
import { PillRadio, type Option } from './WhatIfFields';

type Ok = Extract<WhatIfResult, { status: 'ok' }>;
type View = 'each' | 'four';
const VIEWS: Option<View>[] = [{ value: 'each', label: 'Each week' }, { value: 'four', label: 'Four weeks' }];

const left = (c: number): string => (c < 0 ? `short by ${formatCents(-c)}` : `${formatCents(c)} left`);
const dayLabel = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
};

/** What is left after costs, week by week or over the four weeks. Whole-cent sums, so nothing is rounded. */
export function WhatIfWeeks({ result }: { result: Ok }) {
  const [view, setView] = useState<View>('each');
  if (result.before.leftAfterCosts === null) return null;
  const change = result.change4.leftAfterCosts;
  return (
    <div className="grid gap-3">
      <PillRadio name="Show the result" options={VIEWS} value={view} onChange={setView} compact />
      {view === 'each' ? (
        <ul className="grid">
          {result.weeks.map((w, i) => (
            <li key={result.weekStarts[i]} className="flex items-baseline justify-between gap-3 px-4 py-2 text-base odd:bg-surface">
              <span>Week of {dayLabel(result.weekStarts[i])}</span>
              <span className="font-semibold">{w.leftAfterCosts === null ? 'Not known' : left(w.leftAfterCosts)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid">
          <li className="flex items-baseline justify-between gap-3 px-4 py-2 text-base odd:bg-surface"><span>Now, over four weeks</span><span className="font-semibold">{result.before4.leftAfterCosts === null ? 'Not known' : left(result.before4.leftAfterCosts)}</span></li>
          <li className="flex items-baseline justify-between gap-3 px-4 py-2 text-base odd:bg-surface"><span>With the change</span><span className="font-semibold">{result.after4.leftAfterCosts === null ? 'Not known' : left(result.after4.leftAfterCosts)}</span></li>
          {change !== null && (
            <li className="flex items-baseline justify-between gap-3 px-4 py-2 text-base odd:bg-surface"><span>Change from now</span><span className="font-semibold">{change === 0 ? 'No change' : `${formatCents(Math.abs(change))} ${change < 0 ? 'less' : 'more'}`}</span></li>
          )}
        </ul>
      )}
    </div>
  );
}
