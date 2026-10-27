import { activeNotices, formatDistance, priceLabel, type PlaceFit, type PlaceKind, type RankedPlace } from '@culinerity/core';

const KIND: Record<PlaceKind, string> = {
  market: 'Market',
  grocer: 'Grocer',
  'social-supermarket': 'Social supermarket',
  'community-meal': 'Community meal',
  'food-relief': 'Food relief',
  'co-op': 'Food co-op',
};
const FIT: Record<PlaceFit, string> = { fresh: 'Fresh produce', packaged: 'Packaged', meals: 'Meals' };
const ACCESS = { open: '', referral: 'Referral needed', membership: 'Membership' } as const;

/** Today's date in Melbourne as YYYY-MM-DD, so a dated notice ends on Melbourne's calendar. */
export function melbourneToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const checkedOn = (iso: string) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00Z`));

const mapsUrl = (name: string, address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;

/** One place: the facts the source gave, in plain words. The Maps link names the place only, never the person. */
export function NearbyPlaceRow({ item, today }: { item: RankedPlace; today?: string }) {
  const { place: p, metres } = item;
  const notices = activeNotices(p, today ?? melbourneToday());
  const access = ACCESS[p.access];
  return (
    <li className="grid justify-items-start gap-1">
      <h2 className="text-base font-semibold text-pretty break-words">{p.name}</h2>
      <p className="text-sm text-muted">{KIND[p.kind]} · {p.suburb} · {formatDistance(metres)}</p>
      <p className="text-sm font-semibold">
        <span>{priceLabel(p)}</span>
        {p.fit.length > 0 && <span className="font-normal"> · {p.fit.map((f) => FIT[f]).join(', ')}</span>}
      </p>
      {access && <p className="text-sm font-semibold">{access}</p>}
      {p.note && <p className="text-sm text-pretty">{p.note}</p>}
      {notices.map((n) => (
        <p key={n.text} className="text-sm font-semibold text-pretty">{n.text}</p>
      ))}
      <p className="text-sm text-pretty">{p.hours ? <>Hours (check before you go): {p.hours}</> : 'Hours not listed'}</p>
      <a
        href={mapsUrl(p.name, p.address)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${p.name} in Maps`}
        className="focus-ring motion-colors mt-1 inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-6 text-center font-semibold text-ink"
      >
        Open in Maps
      </a>
      <p className="text-xs text-muted">Last checked {checkedOn(p.checked)}</p>
    </li>
  );
}
