import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeekRing } from './WeekRing';

const days = (...on: number[]) => Array.from({ length: 7 }, (_, i) => on.includes(i));

describe('WeekRing', () => {
  it('is one image with a text alternative naming the days with meals', () => {
    render(<WeekRing days={days(0, 2, 5)} todayIndex={2} />);
    expect(screen.getByRole('img', { name: 'Monday to Sunday: meals on Monday, Wednesday and Saturday' })).toBeInTheDocument();
  });

  it('gives each empty day a visible outline and leaves filled days unstroked', () => {
    const { container } = render(<WeekRing days={days(1)} todayIndex={0} />);
    const dot = (i: number) => container.querySelector(`[data-day="${i}"]`) as SVGElement;
    expect(dot(1)).not.toHaveClass('stroke-muted');
    for (const i of [0, 2, 3, 4, 5, 6]) {
      expect(dot(i)).toHaveClass('stroke-muted');
      expect(dot(i)).toHaveAttribute('stroke-width', '2.5');
    }
  });

  it('says one day plainly, two with "and", and "no meals yet" when empty', () => {
    const { rerender } = render(<WeekRing days={days(6)} todayIndex={0} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Monday to Sunday: meals on Sunday');
    rerender(<WeekRing days={days(1, 3)} todayIndex={0} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Monday to Sunday: meals on Tuesday and Thursday');
    rerender(<WeekRing days={days()} todayIndex={0} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Monday to Sunday: no meals yet');
  });

  it('draws seven round dots, fills only the days with meals and outlines today', () => {
    const { container } = render(<WeekRing days={days(0, 2, 5)} todayIndex={4} />);
    expect(container.querySelectorAll('[data-day]')).toHaveLength(7);
    const filled = [...container.querySelectorAll('[data-day][data-filled="true"]')].map((d) => d.getAttribute('data-day'));
    expect(filled).toEqual(['0', '2', '5']);
    const today = container.querySelectorAll('[data-today]');
    expect(today).toHaveLength(1);
    expect(today[0]).toHaveAttribute('data-today', '4');
  });

  it('uses no hairline strokes, gradients or shadows, and hides its letters from readers', () => {
    const { container } = render(<WeekRing days={days(1)} todayIndex={1} />);
    expect(container.querySelector('linearGradient, radialGradient, filter')).toBeNull();
    expect(container.querySelector('[data-day] text, text')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
