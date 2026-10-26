import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';
import { THEME_TOKENS } from '../theme/tokens';

describe('Avatar', () => {
  it('is a decorative round circle with the upper-cased first letter', () => {
    const { container } = render(<Avatar name="sam" colour="sand" size={64} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.textContent).toBe('S');
    expect(el.className).toMatch(/rounded-full/);
    expect(el.style.width).toBe('64px');
  });

  it('takes its fill from that account colour\'s theme accent, letter in the matching ink', () => {
    const { container } = render(<Avatar name="Alex" colour="cream" size={48} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.backgroundColor).toBe(hex(THEME_TOKENS.cream.accent));
    expect(el.style.color).toBe(hex(THEME_TOKENS.cream['accent-ink']));
  });

  it('accepts an explicit letter and falls back to a neutral mark for an empty name', () => {
    const a = render(<Avatar letter="Z" colour="walnut" size={40} />);
    expect(a.container.textContent).toBe('Z');
    const b = render(<Avatar name="  " colour="walnut" size={40} />);
    expect(b.container.textContent).toBe('?');
  });
});

function hex(h: string): string {
  const n = parseInt(h.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
}
