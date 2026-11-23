import { useId, useMemo, useState } from 'react';
import { BULK_TIER_LABEL, NO_FILTERS, whereToGet, type RankedBulk } from '@culinerity/core';
import { useBulkSource } from '../location/BulkContext';
import { GroupNote } from './NearbyBulk';
import { NearbyBulkRow } from './NearbyBulkRow';
import { melbourneToday } from './NearbyPlaceRow';
import { OriginControls } from './OriginControls';
import { PillButton } from './PillButton';
import { BulkKindGlyph, Chevron, PinGlyph } from './placeIcons';
import { bulkView } from './bulkView';
import { useBulkPlaces } from './useBulkPlaces';
import { useOrigin } from './useOrigin';

export const WHERE_LABEL = 'Where to get it';
const NONE_NEARBY = 'Nothing close by';

function Group({ title, kind, rows }: { title: string; kind: 'supermarket' | 'takeaway'; rows: RankedBulk[] }) {
  const id = useId();
  if (rows.length === 0) return null;
  return (
    <div className="grid gap-3">
      <h3 id={id} className="flex items-center gap-2 text-base font-semibold"><BulkKindGlyph kind={kind} />{title}</h3>
      <ul aria-labelledby={id} className="grid gap-4">
        {rows.map((r) => <NearbyBulkRow key={r.place.id} item={r} level={4} />)}
      </ul>
    </div>
  );
}

/**
 * A collapsed "Where to get it" under a craving's swaps: the nearest supermarket of each brand and, for ready-made cravings,
 * the nearest takeaways, all from the "Not checked by us" list. Nothing loads until it is opened and a place is chosen;
 * the position stays on the device and shows as distance only once the person has chosen it.
 */
export function WhereToGet({ cravingId, profileSuburb, today }: { cravingId: string; profileSuburb?: string; today?: string }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const o = useOrigin(profileSuburb);
  const { origin } = o;
  const bulkState = useBulkPlaces(open ? origin : null, useBulkSource());
  const view = useMemo(
    () => (origin ? bulkView(bulkState, origin, NO_FILTERS, today ?? melbourneToday()) : ({ mode: 'none' } as const)),
    [bulkState, origin, today],
  );
  const found = useMemo(() => (view.mode === 'shown' ? whereToGet(view.ranked, cravingId) : null), [view, cravingId]);
  const any = found !== null && (found.supermarkets.length > 0 || found.eateries.length > 0);
  return (
    <section aria-label={WHERE_LABEL} className="grid gap-4">
      <PillButton
        variant="surface"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        className="min-h-12 justify-between gap-3 justify-self-start"
      >
        <span className="inline-flex items-center gap-2"><PinGlyph />{WHERE_LABEL}</span>
        <Chevron open={open} />
      </PillButton>
      <div id={panel} hidden={!open} className="grid gap-4">
        {open && (
          <>
            <OriginControls state={o} idPrefix={`where-${cravingId}`} profileSuburb={profileSuburb} />
            {origin?.label && <p className="text-sm text-muted">from the middle of {origin.label}</p>}
            {found && (
              <div className="grid gap-5">
                <GroupNote text={BULK_TIER_LABEL} />
                {any ? (
                  <>
                    <Group title="Supermarkets" kind="supermarket" rows={found.supermarkets} />
                    <Group title="Takeaway" kind="takeaway" rows={found.eateries} />
                  </>
                ) : (
                  <p className="text-base font-semibold">{NONE_NEARBY}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
