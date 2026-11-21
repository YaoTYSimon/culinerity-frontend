import { createElement } from 'react';
import { bulkKindLabel, bulkRowNotes, formatDistance, type RankedBulk } from '@culinerity/core';
import { REPORT_PROBLEM_CONTACT, reportProblemHref } from '../content/reportProblem';
import { NearbyMapsLink } from './NearbyMapsLink';

/** One not-checked place: only what the source gave (name, category, address, postcode). No price band, no hours, no claims. */
export function NearbyBulkRow({ item, reportContact = REPORT_PROBLEM_CONTACT, level = 3 }: { item: RankedBulk; reportContact?: string; level?: 3 | 4 }) {
  const { place: p, distanceM } = item;
  const report = reportProblemHref(p, reportContact);
  const notes = bulkRowNotes(p.kind);
  const where = [p.address, p.postcode].filter(Boolean).join(' ');
  return (
    <li className="grid justify-items-start gap-1.5">
      {createElement(`h${level}`, { className: 'text-base font-semibold text-pretty break-words' }, p.name)}
      <p className="text-sm text-muted">{bulkKindLabel(p.kind)} · {where} · {formatDistance(distanceM).replace(/ /g, '\u00A0')}</p>
      {notes.price && <p className="text-sm font-semibold">{notes.price}</p>}
      <p className="text-sm text-muted">{notes.hours}</p>
      <NearbyMapsLink name={p.name} address={p.address} />
      {report && (
        <a href={report} className="focus-ring motion-colors inline-flex min-h-11 items-center text-sm font-semibold text-ink underline underline-offset-4">
          Report a problem
        </a>
      )}
    </li>
  );
}
