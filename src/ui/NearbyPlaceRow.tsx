import { useId, useState } from 'react';
import { activeNotices, endsSoon, formatDistance, hoursSummary, noticeHeadline, priceLabel, type PlaceFit, type PlaceKind, type PlaceSourceRecord, type RankedPlace } from '@culinerity/core';
import { ExternalLink } from './ExternalLink';
import { NearbyMapsLink } from './NearbyMapsLink';
import { AccessGlyph, Chevron, ClockGlyph, FitGlyph, KindGlyph, PriceDots, WarnGlyph } from './placeIcons';

export const KIND: Record<PlaceKind, string> = {
  market: 'Market',
  grocer: 'Grocer',
  'social-supermarket': 'Social supermarket',
  'community-meal': 'Community meal',
  'food-relief': 'Food relief',
  'co-op': 'Food co-op',
  takeaway: 'Takeaway',
  'cafe-restaurant': 'Cafe or restaurant',
};
const FIT: Record<PlaceFit, string> = { fresh: 'Fresh', packaged: 'Packaged', meals: 'Meals' };
const ACCESS = { open: 'Walk in', referral: 'Referral', membership: 'Member' } as const;

/** A stable id for a checked place's row, so the map can move focus to it. */
export const nearbyRowId = (placeId: string) => `nearby-place-${placeId}`;

/** Today's date in Melbourne as YYYY-MM-DD, so a dated notice ends on Melbourne's calendar. */
export function melbourneToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const checkedOn = (iso: string) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00Z`));

/** Splits dense hours text at top-level semicolons (not those inside brackets) so each pattern gets its own short line. */
export function hourLines(hours: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of hours) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

/**
 * One place, short by default: name, one meta line, price, food and access as icon plus one word, one hours line,
 * and a round Maps button. Details opens the note, full hours, notices, the check date and the source.
 * The Maps link names the place only, never the person.
 */
export function NearbyPlaceRow({ item, today, level = 2, source }: { item: RankedPlace; today?: string; level?: 2 | 3; source?: PlaceSourceRecord }) {
  const Heading = level === 3 ? 'h3' : 'h2';
  const { place: p, metres } = item;
  const now = today ?? melbourneToday();
  const notices = activeNotices(p, now);
  const soon = notices.find((n) => endsSoon(n, now));
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <li id={nearbyRowId(p.id)} tabIndex={-1} className="grid gap-1.5 outline-none">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <Heading className="line-clamp-2 text-base font-semibold text-pretty break-words">{p.name}</Heading>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <KindGlyph kind={p.kind} />
            <span><span className="sr-only">{KIND[p.kind]}, </span>{p.suburb} · {formatDistance(metres)}</span>
          </p>
        </div>
        <NearbyMapsLink name={p.name} address={p.address} compact />
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
        <span className="inline-flex items-center gap-1.5"><PriceDots band={p.priceBand} />{priceLabel(p)}</span>
        {p.fit.map((f) => <span key={f} className="inline-flex items-center gap-1"><FitGlyph fit={f} />{FIT[f]}</span>)}
        <span className="inline-flex items-center gap-1"><AccessGlyph access={p.access} />{ACCESS[p.access]}</span>
      </p>
      <p className="flex items-center gap-1.5 text-sm">
        <ClockGlyph />
        {p.hours ? <span><span className="sr-only">Hours, check before you go: </span>{hoursSummary(p.hours)}</span> : <span className="text-muted">Hours not listed</span>}
      </p>
      {soon && (
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <WarnGlyph />
          <span><span className="sr-only">Notice: </span>{noticeHeadline(soon.text)}</span>
        </p>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={`Details for ${p.name}`}
        onClick={() => setOpen((o) => !o)}
        className="focus-ring motion-colors inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full text-sm font-semibold"
      >
        Details
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-surface"><Chevron open={open} /></span>
      </button>
      <div id={detailsId} hidden={!open}>
        <div className="grid justify-items-start gap-2 pb-2 text-sm text-pretty">
          {p.note && <p>{p.note}</p>}
          {notices.map((n) => (
            <p key={n.text}>
              <span className="font-bold">Until {checkedOn(n.until)}: </span>
              <span className="font-semibold">{n.text}</span>
            </p>
          ))}
          {p.hours && (
            <div className="grid gap-0.5">
              <p className="font-semibold">Hours <span className="font-normal text-muted">(check before you go)</span></p>
              {hourLines(p.hours).map((line) => <p key={line}>{line}</p>)}
            </div>
          )}
          <p className="text-xs text-muted">Last checked {checkedOn(p.checked)}</p>
          {source && <ExternalLink href={source.url}>{source.publisher}</ExternalLink>}
        </div>
      </div>
    </li>
  );
}
