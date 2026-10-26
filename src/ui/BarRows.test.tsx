import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarRows } from './BarRows';

const bars = [
  { id: 'a', label: 'Renters', value: 48, text: '48%', of: 'of renting households', details: ['Earlier: 40%, 2024.'] },
  { id: 'b', label: 'High income', value: 20, text: '20.5%', of: 'of such households' },
];

describe('BarRows', () => {
  it('draws each bar as wide as its value, with a text alternative', () => {
    render(<BarRows title="Group" caption="Caption" bars={bars} />);
    const a = screen.getByRole('img', { name: '48% of renting households' });
    expect(a.style.width).toBe('48%');
    expect(screen.getByRole('img', { name: '20.5% of such households' }).style.width).toBe('20%');
  });
  it('clamps a bar to 0-100 and names the group by its title', () => {
    render(<BarRows title="Group" caption="Caption" bars={[{ id: 'x', label: 'X', value: 140, text: '140', of: 'of y' }]} />);
    expect(screen.getByRole('img', { name: '140 of y' }).style.width).toBe('100%');
    expect(screen.getByRole('group', { name: 'Group' })).toHaveTextContent('Caption');
  });
  it('writes the value and details beside each bar', () => {
    render(<BarRows title="Group" caption="Caption" bars={bars} />);
    const item = screen.getByText('Renters').closest('li')!;
    expect(within(item).getByText('48%')).toBeInTheDocument();
    expect(item).toHaveTextContent('Earlier: 40%, 2024.');
  });
  it('gives two groups with the same title different heading ids', () => {
    const { container } = render(<><BarRows title="Same" caption="a" bars={bars} /><BarRows title="Same" caption="b" bars={bars} /></>);
    const ids = [...container.querySelectorAll('h3')].map((h) => h.id);
    expect(new Set(ids).size).toBe(2);
  });
});
