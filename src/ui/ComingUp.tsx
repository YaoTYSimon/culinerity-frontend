import { calendar, upcomingOccasions, type FoodProfile, type UpcomingOccasion } from '@culinerity/core';
import { dayLabel, MOON_CAVEAT } from './foodCopy';
import { HebcalCredit } from './HebcalCredit';

/** "about Mon 8 Feb to Mon 8 Mar 2027", "Tue 9 Mar 2027" for one day. The year is the end's. */
function range(o: UpcomingOccasion): string {
  const about = o.approx ? 'about ' : '';
  const year = o.end.slice(0, 4);
  return o.start === o.end ? `${about}${dayLabel(o.end)} ${year}` : `${about}${dayLabel(o.start)} to ${dayLabel(o.end)} ${year}`;
}

function line(o: UpcomingOccasion): string {
  return `${o.label}: ${range(o)}${o.evening ? ' (from the evening before)' : ''}.`;
}

const hebcalIds = new Set(calendar().filter((r) => r.method === 'hebcal').map((r) => r.occasion));

/** The chosen occasions in the next twelve months, as plain lines. Nothing here is a reminder or a notification. */
export function ComingUp({ food, now }: { food: FoodProfile | undefined; now: Date }) {
  const items = food ? upcomingOccasions(calendar(), food.occasions, now) : [];
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="coming-up-h" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <h2 id="coming-up-h" className="text-base font-semibold">Coming up</h2>
      <ul className="grid gap-2">
        {items.map((o) => (
          <li key={o.key} className="text-base text-pretty">{line(o)}</li>
        ))}
      </ul>
      {items.some((o) => hebcalIds.has(o.id)) && <HebcalCredit className="text-sm text-pretty text-muted" />}
      {items.some((o) => o.approx) && <p className="text-sm text-pretty text-muted">{MOON_CAVEAT}</p>}
    </section>
  );
}
