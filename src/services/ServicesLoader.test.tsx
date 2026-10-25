import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '@culinerity/core';
import { CravingSearch } from '../ui/CravingSearch';
import { ServicesLoader } from './ServicesLoader';

afterEach(() => localStorage.clear());

const burger = { id: 'burger', name: 'Takeaway burger', category: 'Burgers', keywords: ['burger'] };
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

function renderLoader(useBackend: boolean, fetchFn?: FetchLike) {
  return render(
    <ServicesLoader useBackend={useBackend} fetchFn={fetchFn}>
      <CravingSearch profile={{}} />
    </ServicesLoader>,
  );
}

describe('ServicesLoader', () => {
  it('shows the mock cravings straight away on the default path, with no fetch', () => {
    const fetchFn = vi.fn();
    renderLoader(false, fetchFn);
    expect(screen.getByRole('heading', { name: 'Popular cravings' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /burger/i }).length).toBeGreaterThan(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('shows a plain message and Retry, and no empty heading, when the server is unreachable', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('refused');
    });
    renderLoader(true, down);
    expect(await screen.findByText(/can't reach the swap server/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Popular cravings' })).not.toBeInTheDocument();
  });

  it('Retry recovers once the server answers', async () => {
    let up = false;
    const fetchFn: FetchLike = async (url) => {
      if (!up) throw new TypeError('refused');
      return ok(url.endsWith('/popular') ? [burger] : []);
    };
    renderLoader(true, fetchFn);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    up = true;
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Popular cravings' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /takeaway burger/i })).toBeInTheDocument();
    expect(screen.queryByText(/can't reach/i)).not.toBeInTheDocument();
  });

  it('renders the shell before the catalogue resolves', () => {
    renderLoader(true, () => new Promise(() => {}));
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.queryByText(/can't reach/i)).not.toBeInTheDocument();
  });
});
