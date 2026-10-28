import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { culturalSources } from '@culinerity/core';
import { ComingUp } from './ComingUp';
import { HebcalCredit } from './HebcalCredit';

describe('HebcalCredit', () => {
  it('credits Hebcal.com with the licence and safe links, from the source record', () => {
    const rec = culturalSources().find((s) => s.id === 'hebcal-api')!;
    expect(rec.licence).toContain('CC BY 4.0');
    const { container } = render(<HebcalCredit />);
    expect(container.textContent).toBe('Jewish festival dates: Hebcal.com, CC BY 4.0.');
    const links = [...container.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([rec.url, 'https://creativecommons.org/licenses/by/4.0/']);
    for (const a of links) {
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('aria-label', expect.stringContaining('opens in a new tab'));
    }
  });
});

describe('Coming up credit', () => {
  const food = (occasions: string[]) => ({ traditions: [], rules: [], allergies: [], occasions, dismissed: [] }) as any;
  const now = new Date(2026, 10, 1, 12);
  it('shows the Hebcal credit only when a Hebcal-dated occasion is listed', () => {
    const jewish = render(<ComingUp food={food(['hanukkah', 'passover'])} now={now} />);
    expect(jewish.container.textContent).toContain('Hebcal.com');
    jewish.unmount();
    const other = render(<ComingUp food={food(['diwali', 'christmas'])} now={now} />);
    expect(other.container.textContent).toContain('Diwali');
    expect(other.container.textContent).not.toContain('Hebcal');
  });
});
