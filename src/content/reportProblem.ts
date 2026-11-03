import type { BulkPlace } from '@culinerity/core';

/**
 * Where "Report a problem" goes (Ruling D6). The owner must set this to a monitored address before the link appears;
 * until then it is empty and nothing is shown. Do not put a personal address here.
 */
export const REPORT_PROBLEM_CONTACT = '';

/** A prefilled mailto the person sends themselves. It carries the place id and name only: no position, nothing about the person. */
export function reportProblemHref(place: Pick<BulkPlace, 'id' | 'name'>, contact: string = REPORT_PROBLEM_CONTACT): string | null {
  if (!contact) return null;
  const subject = `Place problem: ${place.id}`;
  const body = `Place id: ${place.id}\nName: ${place.name}\nWhat is wrong (closed, moved, wrong, other): `;
  return `mailto:${contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
