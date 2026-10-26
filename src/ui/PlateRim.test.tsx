import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlateRim } from './PlateRim';

const rim = (fill: number | null, animate?: boolean) => {
  const { container } = render(<svg><PlateRim fill={fill} animate={animate} /></svg>);
  return container;
};

describe('PlateRim', () => {
  it('fills the rim to the given share of 100', () => {
    expect(rim(33).querySelector('[data-rim]')).toHaveAttribute('stroke-dasharray', '33 100');
  });
  it('clamps above 100 and draws no rim at 0', () => {
    expect(rim(140).querySelector('[data-rim]')).toHaveAttribute('stroke-dasharray', '100 100');
    expect(rim(0).querySelector('[data-rim]')).toBeNull();
  });
  it('draws the dotted rim when unknown', () => {
    const c = rim(null);
    expect(c.querySelector('[data-rim]')).toBeNull();
    expect(c.querySelector('circle[stroke-dasharray="2 12"]')).not.toBeNull();
  });
  it('animates only when asked', () => {
    expect(rim(50).querySelector('[data-rim]')).toHaveClass('plate-rim-animate');
    expect(rim(50, false).querySelector('[data-rim]')).not.toHaveClass('plate-rim-animate');
  });
});
