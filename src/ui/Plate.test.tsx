import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Plate } from './Plate';

describe('Plate', () => {
  it('has role img with the exact text alternative for a score', () => {
    render(<Plate score={42} />);
    expect(screen.getByRole('img', { name: 'Food security score 42 out of 100, Strained; 100 is secure, 0 is critical' })).toBeInTheDocument();
  });

  it('shows the number and band', () => {
    render(<Plate score={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/Strained/)).toBeInTheDocument();
  });

  it('uses an explicit band when given', () => {
    render(<Plate score={90} band="Secure" />);
    expect(screen.getByRole('img', { name: /Secure/ })).toBeInTheDocument();
  });

  it('null shows ? and out of 100 with a not-yet-measured alternative', () => {
    render(<Plate score={null} />);
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('out of 100')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /No food security score yet/ })).toBeInTheDocument();
  });

  it('shows the final state at once when animation is off', () => {
    const { container } = render(<Plate score={50} animate={false} />);
    expect(container.querySelector('circle[data-rim]')).not.toHaveClass('plate-rim-animate');
  });
});
