import { createElement, useId, useState } from 'react';
import { bulkKindLabel, formatDistance, type RankedBulk } from '@culinerity/core';
import { REPORT_PROBLEM_CONTACT, reportProblemHref } from '../content/reportProblem';
import { ExternalLink } from './ExternalLink';
import { NearbyMapsLink } from './NearbyMapsLink';
import { BulkKindGlyph, Chevron } from './placeIcons';

/** A site address that is safe to link: http or https only, shown as its host name. */
function siteHost(url: string | undefined): { href: string; host: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? { href: u.href, host: u.hostname.replace(/^www\./, '') } : null;
  } catch {
    return null;
  }
}

/**
 * One not-checked place, short: name, kind icon, postcode and distance, and a round Maps button. The group says once
 * that hours and prices are not checked; the address, website and Report a problem sit behind Details.
 */
export function NearbyBulkRow({ item, reportContact = REPORT_PROBLEM_CONTACT, level = 3, showDetails }: { item: RankedBulk; reportContact?: string; level?: 3 | 4; showDetails?: boolean }) {
  const { place: p, distanceM } = item;
  const report = reportProblemHref(p, reportContact);
  const site = siteHost(p.website);
  const [ownOpen, setOpen] = useState(false);
  /** When the parent passes `showDetails`, it owns the toggle for every row and this row shows none of its own. */
  const controlled = showDetails !== undefined;
  const open = controlled ? showDetails : ownOpen;
  const detailsId = useId();
  const hasDetails = Boolean(p.address || site || report);
  const kind = p.kind === 'food-relief' ? 'Food relief' : bulkKindLabel(p.kind);
  return (
    <li className="grid gap-1">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          {createElement(`h${level}`, { className: 'line-clamp-2 text-base font-semibold text-pretty break-words' }, p.name)}
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <BulkKindGlyph kind={p.kind} />
            <span><span className="sr-only">{kind}, </span>{[p.postcode, formatDistance(distanceM).replace(/ /g, ' ')].filter(Boolean).join(' · ')}</span>
          </p>
        </div>
        <NearbyMapsLink name={p.name} address={p.address} compact />
      </div>
      {hasDetails && (
        <>
          {!controlled && <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={`Details for ${p.name}`}
            onClick={() => setOpen((o) => !o)}
            className="focus-ring motion-colors inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full text-sm font-semibold"
          >
            Details
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-surface"><Chevron open={open} /></span>
          </button>}
          <div id={detailsId} hidden={!open}>
            <div className="grid justify-items-start gap-1 pb-2 text-sm text-pretty">
              <p>{[bulkKindLabel(p.kind), p.address, p.postcode].filter(Boolean).join(' · ')}</p>
              {site && <ExternalLink href={site.href}>{site.host}</ExternalLink>}
              {report && (
                <a href={report} className="focus-ring motion-colors inline-flex min-h-11 items-center text-sm font-semibold text-ink underline underline-offset-4">
                  Report a problem
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </li>
  );
}
