import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WhatIfPlates } from './WhatIfPlates';

const reduce = (on: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }));

afterEach(() => vi.unstubAllGlobals());

describe('WhatIfPlates', () => {
  it('says both counts in words', () => {
    render(<WhatIfPlates beforeDays={7} afterDays={4} />);
    expect(screen.getByRole('img', { name: 'Before: 7 of 7 days. After: 4 of 7 days.' })).toBeInTheDocument();
  });
  it('handles no change and zero', () => {
    const { unmount } = render(<WhatIfPlates beforeDays={7} afterDays={7} />);
    expect(screen.getByRole('img', { name: 'Before: 7 of 7 days. After: 7 of 7 days.' })).toBeInTheDocument();
    unmount();
    render(<WhatIfPlates beforeDays={0} afterDays={0} />);
    expect(screen.getByRole('img', { name: 'Before: 0 of 7 days. After: 0 of 7 days.' })).toBeInTheDocument();
  });
  it('renders nothing when either count is unknown', () => {
    const { container } = render(<WhatIfPlates beforeDays={null} afterDays={3} />);
    expect(container).toBeEmptyDOMElement();
    const b = render(<WhatIfPlates beforeDays={null} afterDays={null} />);
    expect(b.container).toBeEmptyDOMElement();
  });
  it('animates the rim normally and not under reduced motion', () => {
    reduce(false);
    const a = render(<WhatIfPlates beforeDays={7} afterDays={4} />);
    expect(a.container.querySelector('.plate-rim-animate')).not.toBeNull();
    a.unmount();
    reduce(true);
    const b = render(<WhatIfPlates beforeDays={7} afterDays={4} />);
    expect(b.container.querySelector('[data-rim]')).not.toBeNull();
    expect(b.container.querySelector('.plate-rim-animate')).toBeNull();
  });
});
