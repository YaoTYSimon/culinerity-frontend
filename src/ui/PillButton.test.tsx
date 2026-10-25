import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PillButton } from './PillButton';

describe('PillButton', () => {
  it('is activatable with Enter and Space', async () => {
    const onClick = vi.fn();
    render(<PillButton onClick={onClick}>Find my number</PillButton>);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Find my number' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('defaults to type=button and is at least 44px tall and fully round', () => {
    render(<PillButton>Go</PillButton>);
    const b = screen.getByRole('button');
    expect(b).toHaveAttribute('type', 'button');
    expect(b.className).toMatch(/min-h-11/);
    expect(b.className).toMatch(/rounded-full/);
    expect(b.className).toMatch(/focus-ring/);
  });

  it.each(['primary', 'surface', 'text'] as const)('renders the %s variant', (variant) => {
    render(<PillButton variant={variant}>V</PillButton>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
  });
});
