/** Joins the words of a short date ("Tue 10 Nov 2026") with non-breaking spaces so it never wraps mid-date. */
export const noBreak = (s: string): string => s.replace(/ /g, ' ');
