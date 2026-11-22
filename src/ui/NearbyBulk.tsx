import { useEffect, useState } from 'react';
import { BULK_GROUP_TEXT, BULK_RELIEF_NOTE, BULK_TIER_LABEL, bulkSourceLine, splitReliefFirst } from '@culinerity/core';
import { buildDataLicences } from '../content/dataLicences';
import { Disclosure } from './Disclosure';
import { ExternalLink } from './ExternalLink';
import type { BulkView } from './bulkView';
import { NearbyBulkRow } from './NearbyBulkRow';
import { PillButton } from './PillButton';

const PAGE = 12;

/** Said once above a group, not on every row. */
function GroupNote({ text }: { text: string }) {
  return <p className="flex items-center gap-1.5 text-sm text-muted"><span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-muted" />{text}</p>;
}
const RELIEF_PAGE = 5;

export const BULK_RELIEF_HEADING = 'Food relief (listings not checked)';
export const BULK_REST_HEADING = 'Shops, cafes and takeaways';

export const BULK_OLD_TEXT = 'This list may be out of date.';
export const BULK_HIDDEN_TEXT = 'The wider list is being refreshed.';
export const BULK_FAILED_TEXT = 'Some places could not load. Try again later.';
export const BULK_EMPTY_TEXT = 'No places in this list close to here.';

type Shown = Extract<BulkView, { mode: 'shown' }>;

/** The "Not checked by us" tier, drawn after the checked list. Its notes sit in a live region so they are announced. */
export function NearbyBulk({ view, reportContact }: { view: BulkView; reportContact?: string }) {
  if (view.mode === 'none') return null;
  if (view.mode === 'hidden') return <p className="text-base text-pretty">{BULK_HIDDEN_TEXT}</p>;
  return <BulkTier view={view} reportContact={reportContact} />;
}

/** The notes live in a polite region that mounts empty and is filled after mount, so they are announced (same pattern as Nearby's LiveCount). */
function Notes({ old, failed, empty }: { old: boolean; failed: boolean; empty: boolean }) {
  const [on, setOn] = useState({ old: false, failed: false, empty: false });
  useEffect(() => { setOn({ old, failed, empty }); }, [old, failed, empty]);
  return (
    <div aria-live="polite" data-testid="bulk-notes" className="empty:hidden grid gap-2 text-base font-semibold text-pretty">
      {on.old && <p>{BULK_OLD_TEXT}</p>}
      {on.failed && <p>{BULK_FAILED_TEXT}</p>}
      {on.empty && <p>{BULK_EMPTY_TEXT}</p>}
    </div>
  );
}

function BulkTier({ view, reportContact }: { view: Shown; reportContact?: string }) {
  const [shown, setShown] = useState(PAGE);
  const [reliefShown, setReliefShown] = useState(RELIEF_PAGE);
  const { ranked, old, failed, release } = view;
  // Ruling F2: food relief first, nearest first, then everything else by distance. No group, no heading, when there is none.
  const { relief, rest } = splitReliefFirst(ranked);
  const grouped = relief.length > 0;
  const level = grouped ? 4 : 3;
  const visible = rest.slice(0, shown);
  return (
    <section aria-labelledby="nearby-bulk-h" className="grid gap-4">
      <h2 id="nearby-bulk-h" className="font-display text-2xl leading-tight font-bold text-balance">{BULK_TIER_LABEL}</h2>
      <Notes old={old} failed={failed} empty={ranked.length === 0 && !failed} />
      {grouped && (
        <div className="grid gap-4 pb-6" data-testid="bulk-relief">
          <h3 id="nearby-relief-h" className="font-display text-xl leading-tight font-bold text-balance">{BULK_RELIEF_HEADING}</h3>
          <GroupNote text={BULK_RELIEF_NOTE} />
          <ul aria-labelledby="nearby-relief-h" className="grid gap-6">
            {relief.slice(0, reliefShown).map((r) => <NearbyBulkRow key={r.place.id} item={r} reportContact={reportContact} level={4} />)}
          </ul>
          {reliefShown < relief.length && (
            <PillButton variant="surface" onClick={() => setReliefShown((n) => n + RELIEF_PAGE)} className="justify-self-start">Show more food relief</PillButton>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className="grid gap-4">
          {grouped && <h3 id="nearby-rest-h" className="font-display text-xl leading-tight font-bold text-balance">{BULK_REST_HEADING}</h3>}
          <GroupNote text={BULK_GROUP_TEXT} />
          <ul aria-label={`${BULK_TIER_LABEL} places near you`} className="grid gap-6">
            {visible.map((r) => <NearbyBulkRow key={r.place.id} item={r} reportContact={reportContact} level={level} />)}
          </ul>
          {visible.length < rest.length && (
            <PillButton variant="surface" onClick={() => setShown((n) => n + PAGE)} className="justify-self-start">Show more</PillButton>
          )}
        </div>
      )}
      <p className="text-sm text-muted">{bulkSourceLine(release)}</p>
      <Disclosure summary="Data licences">
        <ul className="grid gap-3 pb-2 text-sm text-pretty text-muted">
          {buildDataLicences(release).map((l) => (
            <li key={l.id} className="grid justify-items-start">
              <p><span className="font-semibold text-ink">{l.label}.</span> {l.text}</p>
              <ExternalLink href={l.url}>More about {l.label}</ExternalLink>
            </li>
          ))}
        </ul>
      </Disclosure>
    </section>
  );
}
