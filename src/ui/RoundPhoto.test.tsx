import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoundPhoto } from './RoundPhoto';

describe('RoundPhoto', () => {
  it('renders a circular decorative img for a src', () => {
    const { container } = render(<RoundPhoto src="/a.jpg" size={96} />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(img.className).toMatch(/rounded-full/);
    expect(img).toHaveAttribute('width', '96');
  });

  it('falls back to the drawn illustration', () => {
    const { container } = render(<RoundPhoto itemId="no-such-item" size={96} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
