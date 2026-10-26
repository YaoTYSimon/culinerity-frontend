import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareDial } from './ShareDial';

describe('ShareDial', () => {
  it('fills the rim to its value, shows the text and has a text alternative', () => {
    const { container } = render(<ShareDial value={13.2} text="13.2%" label="13.2% of households" />);
    expect(container.querySelector('[data-rim]')).toHaveAttribute('stroke-dasharray', '13.2 100');
    expect(screen.getByRole('img', { name: '13.2% of households' })).toHaveTextContent('13.2%');
  });
  it('clamps out-of-range values', () => {
    const { container } = render(<ShareDial value={250} text="x" label="x" />);
    expect(container.querySelector('[data-rim]')).toHaveAttribute('stroke-dasharray', '100 100');
  });
});
