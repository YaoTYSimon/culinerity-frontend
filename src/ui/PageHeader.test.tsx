import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';
import { EmptyPlate } from './illustrations/EmptyPlate';

describe('PageHeader', () => {
  it('shows the heading with one decorative round photo of a fixed size', () => {
    const { container } = render(<PageHeader photo="budget-harvest"><h1>Hello</h1></PageHeader>);
    expect(screen.getByRole('heading', { level: 1, name: 'Hello' })).toBeInTheDocument();
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '96');
    expect(img).toHaveAttribute('height', '96');
    expect(img.getAttribute('src')).toMatch(/budget-harvest.*\.jpg/);
    expect(img).toHaveClass('rounded-full');
  });
});

describe('EmptyPlate', () => {
  it('is a decorative drawing', () => {
    const { container } = render(<EmptyPlate size={72} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '72');
  });
});
