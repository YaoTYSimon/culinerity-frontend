import { describe, expect, it } from 'vitest';
import { REPORT_PROBLEM_CONTACT, reportProblemHref } from './reportProblem';

describe('reportProblemHref', () => {
  it('ships with no contact set, so no link is shown and no personal address is in the repo', () => {
    expect(REPORT_PROBLEM_CONTACT).toBe('');
    expect(reportProblemHref({ id: 'ovt-1', name: 'X' })).toBeNull();
  });
  it('is a mailto carrying only id, name and the question, no position', () => {
    const h = decodeURIComponent(reportProblemHref({ id: 'ovt-1', name: 'Corner & Co' }, 'reports@example.test')!);
    expect(h).toMatch(/^mailto:reports@example\.test\?/);
    expect(h).toContain('Place id: ovt-1');
    expect(h).toContain('Corner & Co');
    expect(h).not.toMatch(/lat|lng|-37|144\./i);
  });
});
