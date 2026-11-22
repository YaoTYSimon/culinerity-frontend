import type { PlaceNotice } from './types';

/**
 * One short line from a place's hours text: the first sentence, or the first `max` characters cut at a word
 * boundary with an ellipsis. The full text is always kept for the details; this is only the collapsed view.
 */
export function hoursSummary(hours: string, max = 60): string {
  const flat = hours.replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  // End of the first sentence: a full stop, then a space and a capital, outside brackets.
  let depth = 0;
  let end = flat.length;
  for (let i = 0; i < flat.length; i++) {
    const ch = flat[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === '.' && depth === 0 && /^\s+[A-Z]/.test(flat.slice(i + 1, i + 3))) { end = i; break; }
  }
  const first = flat.slice(0, end).replace(/\.$/, '');
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,;:(-]+$/, '')}…`;
}

/** The first `words` words of a notice, with an ellipsis when it was longer. */
export function noticeHeadline(text: string, words = 6): string {
  const all = text.trim().split(/\s+/).filter(Boolean);
  return all.length <= words ? all.join(' ') : `${all.slice(0, words).join(' ')}…`;
}

const DAY_MS = 86_400_000;
const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;

/** True when a dated notice is still on and ends within `days` days of `today` (both YYYY-MM-DD, inclusive). */
export function endsSoon(notice: PlaceNotice, today: string, days = 30): boolean {
  const left = dayNumber(notice.until) - dayNumber(today);
  return left >= 0 && left <= days;
}
