import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Welcome } from './Welcome';

describe('Welcome', () => {
  it('shows the headline, the exact supporting sentence and an empty plate', () => {
    render(<Welcome onFindNumber={() => {}} onSkip={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'How much is food on your mind?' })).toBeInTheDocument();
    expect(screen.getByText('Two minutes, one number out of 100. 100 is secure, 0 is critical. It stays on your phone.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /no food security score yet/i })).toBeInTheDocument();
  });

  it('has decorative round photos', () => {
    const { container } = render(<Welcome onFindNumber={() => {}} onSkip={() => {}} />);
    const photos = container.querySelectorAll('img');
    expect(photos).toHaveLength(3);
    photos.forEach((p) => expect(p).toHaveAttribute('alt', ''));
  });

  it('calls the two actions', () => {
    const onFindNumber = vi.fn();
    const onSkip = vi.fn();
    render(<Welcome onFindNumber={onFindNumber} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find my number' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip to cheaper swaps' }));
    expect(onFindNumber).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
