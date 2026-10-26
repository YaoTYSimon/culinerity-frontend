import type { ReactNode } from 'react';

export interface Bar {
  id: string;
  label: string;
  /** 0 to 100: the bar's length as a share of the whole. */
  value: number;
  /** The figure as written, shown at the end of the bar. */
  text: string;
  /** What the figure is a share of, for the text alternative. */
  of: string;
  /** Small remarks shown under the bar. */
  details?: string[];
}

interface Props {
  title: string;
  /** Source and instrument for the whole group. */
  caption: ReactNode;
  bars: Bar[];
}

/** Flat, round-ended bars with the value written at the end. Each group has its own caption; bars in one group share a scale of 0 to 100. */
export function BarRows({ title, caption, bars }: Props) {
  const headingId = `bars-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div role="group" aria-labelledby={headingId} className="grid gap-2">
      <h3 id={headingId} className="text-lg font-semibold text-balance">{title}</h3>
      <p className="text-sm text-pretty text-muted">{caption}</p>
      <ul className="grid gap-3">
        {bars.map((b) => (
          <li key={b.id} className="grid gap-1">
            <p className="text-base font-semibold text-pretty">{b.label}</p>
            <div className="flex items-center gap-3">
              <div className="h-4 min-w-0 flex-1 rounded-full bg-surface">
                <div
                  role="img"
                  aria-label={`${b.text} ${b.of}`}
                  className="h-4 rounded-full bg-ink"
                  style={{ width: `${Math.min(100, Math.max(0, b.value))}%`, minWidth: '1rem' }}
                />
              </div>
              <span aria-hidden="true" data-figure className="font-display w-[4.5rem] shrink-0 text-right text-[24px]">
                <span>{b.text}</span>
              </span>
            </div>
            {b.details?.map((d) => <p key={d} className="text-sm text-pretty text-muted">{d}</p>)}
          </li>
        ))}
      </ul>
    </div>
  );
}
