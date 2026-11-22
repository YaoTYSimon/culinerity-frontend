import { activeNotices, formatDistance, priceLabel, type PlaceFit, type PlaceKind, type RankedPlace } from '@culinerity/core';
import { NearbyMapsLink } from './NearbyMapsLink';

export const KIND: Record<PlaceKind, string> = {
  market: 'Market',
  grocer: 'Grocer',
  'social-supermarket': 'Social supermarket',
  'community-meal': 'Community meal',
  'food-relief': 'Food relief',
  'co-op': 'Food co-op',
};
const FIT: Record<PlaceFit, string> = { fresh: 'Fresh produce', packaged: 'Packaged', meals: 'Meals' };
const ACCESS = { open: '', referral: 'Referral needed', membership: 'Membership' } as const;

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

/** One place: the facts the source gave, in plain words. The Maps link names the place only, never the person. */
export function NearbyPlaceRow({ item, today, level = 2 }: { item: RankedPlace; today?: string; level?: 2 | 3 }) {
  const Heading = level === 3 ? 'h3' : 'h2';
  const { place: p, metres } = item;
  const notices = activeNotices(p, today ?? melbourneToday());
  const access = ACCESS[p.access];
  return (
    <li id={nearbyRowId(p.id)} tabIndex={-1} className="grid justify-items-start gap-1.5 outline-none">
      <Heading className="text-base font-semibold text-pretty break-words">{p.name}</Heading>
      <p className="text-sm text-muted">{KIND[p.kind]} · {p.suburb} · {formatDistance(metres)}</p>
      <p className="text-sm font-semibold">
        <span>{priceLabel(p)}</span>
        {p.fit.length > 0 && <span className="font-normal"> · {p.fit.map((f) => FIT[f]).join(', ')}</span>}
      </p>
      {access && <p className="text-sm font-semibold">{access}</p>}
      {p.note && <p className="text-sm text-pretty">{p.note}</p>}
      {notices.map((n) => (
        <p key={n.text} className="text-sm text-pretty">
          <span className="font-bold">Until {checkedOn(n.until)}: </span>
          <span className="font-semibold">{n.text}</span>
        </p>
      ))}
      {p.hours ? (
        <div className="grid gap-0.5 text-sm text-pretty">
          <p className="font-semibold">Hours <span className="font-normal text-muted">(check before you go)</span></p>
          {hourLines(p.hours).map((line) => <p key={line}>{line}</p>)}
        </div>
      ) : (
        <p className="text-sm text-muted">Hours not listed</p>
      )}
      <NearbyMapsLink name={p.name} address={p.address} />
      <p className="text-xs text-muted">Last checked {checkedOn(p.checked)}</p>
    </li>
  );
}
