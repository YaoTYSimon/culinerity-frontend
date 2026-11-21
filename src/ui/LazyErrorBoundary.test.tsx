import { Suspense, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LazyErrorBoundary } from './LazyErrorBoundary';
import { lazyWithRetry } from './lazyWithRetry';

const MESSAGE = 'This part did not load. Check your connection and try again.';

describe('LazyErrorBoundary with lazyWithRetry', () => {
  it('shows a calm alert when a chunk fails, then loads the view after Try again', async () => {
    const factory = vi
      .fn<() => Promise<{ default: () => React.JSX.Element }>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValue({ default: () => <p>The view</p> });
    const View = lazyWithRetry(factory);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <LazyErrorBoundary resetKey="a">
        <Suspense fallback={<p>Loading…</p>}>
          <View />
        </Suspense>
      </LazyErrorBoundary>,
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(MESSAGE);
    expect(alert).toHaveFocus();
    const button = screen.getByRole('button', { name: 'Try again' });
    expect(button.className).toMatch(/min-h-11/);
    fireEvent.click(button);
    expect(await screen.findByText('The view')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(factory).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('shows the message again when the retry fails too', async () => {
    const factory = vi.fn(() => Promise.reject(new Error('offline')));
    const View = lazyWithRetry(factory);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <LazyErrorBoundary resetKey="a">
        <Suspense fallback={<p>Loading…</p>}>
          <View />
        </Suspense>
      </LazyErrorBoundary>,
    );
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('alert');
    expect(factory).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('resets when the reset key (the view) changes', async () => {
    const Bad = lazyWithRetry(() => Promise.reject(new Error('offline')));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Host() {
      const [view, setView] = useState('bad');
      return (
        <>
          <button onClick={() => setView('good')}>go</button>
          <LazyErrorBoundary resetKey={view}>
            <Suspense fallback={null}>{view === 'bad' ? <Bad /> : <p>Good view</p>}</Suspense>
          </LazyErrorBoundary>
        </>
      );
    }
    render(<Host />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByText('go'));
    expect(await screen.findByText('Good view')).toBeInTheDocument();
    spy.mockRestore();
  });
});
