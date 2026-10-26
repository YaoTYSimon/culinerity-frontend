import { seifaPosition, SEIFA_SCALE, type Area } from '@culinerity/core';

const fmt = (n: number): string => n.toLocaleString('en-AU');

interface Props {
  /** Already in the order to show. */
  areas: Area[];
}

/** Each area's score as a dot on a labelled scale, with a marker at the Australian average. Scores are whole numbers. */
export function ScaleRows({ areas }: Props) {
  const average = seifaPosition(SEIFA_SCALE.average);
  return (
    <div className="grid gap-2">
      <div aria-hidden="true" className="relative mx-2 h-9 text-sm text-muted">
        <span className="absolute left-0 top-0">{fmt(SEIFA_SCALE.min)}</span>
        <span className="absolute top-0 -translate-x-1/2 text-center text-ink" style={{ left: `${average}%` }}>
          Australian average
          <span className="block">{fmt(SEIFA_SCALE.average)}</span>
        </span>
        <span className="absolute right-0 top-0">{fmt(SEIFA_SCALE.max)}</span>
      </div>
      <ul className="grid gap-3">
        {areas.map((a) => {
          const score = Math.round(a.seifaIrsdScore);
          return (
            <li key={a.name} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-base font-semibold text-pretty">{a.name}</p>
                <span data-figure className="font-display shrink-0 text-[24px]"><span>{fmt(score)}</span></span>
              </div>
              <div
                role="img"
                aria-label={`${a.name}: score ${fmt(score)} on a scale from ${fmt(SEIFA_SCALE.min)} to ${fmt(SEIFA_SCALE.max)}; the Australian average is ${fmt(SEIFA_SCALE.average)}`}
                className="relative mx-2 h-5"
              >
                <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface" />
                <div className="absolute top-0 h-5 w-[3px] -translate-x-1/2 rounded-full bg-muted" style={{ left: `${average}%` }} />
                <div className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${seifaPosition(score)}%` }} />
              </div>
              {a.seifaDecileVic !== null && <p className="text-sm text-muted">Victorian decile {a.seifaDecileVic}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
