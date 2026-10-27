import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeOneWeekSwap, type WeekSwap } from '@culinerity/core';
import { headlineAmount, WeekCard } from './WeekCard';

const NOW = '2026-10-26T12:00:00.000Z';
const at = (daysAgo: number) => new Date(Date.parse(NOW) - daysAgo * 86400000).toISOString();
const WEEK: WeekSwap[] = [
  { itemId: 'burger', name: 'Home smash burger', saving: 4.3, at: at(1) },
  { itemId: 'falafel', name: 'Falafel wrap', saving: 4.9, at: at(2) },
  { itemId: 'falafel', name: 'Falafel wrap', saving: 4.9, at: at(1) },
  { itemId: 'old', name: 'Ancient pie', saving: 50, at: at(8) },
];

const setup = (week: WeekSwap[] = WEEK, extra: Partial<Parameters<typeof WeekCard>[0]> = {}) => {
  const props = { week, now: NOW, onRemoveOne: vi.fn(), onClear: vi.fn(), onSeeSwaps: vi.fn(), ...extra };
  render(<WeekCard {...props} />);
  return props;
};

const setNav = (v: Record<string, unknown>) => {
  for (const [k, val] of Object.entries(v)) Object.defineProperty(navigator, k, { value: val, configurable: true });
};

afterEach(() => {
  setNav({ share: undefined, clipboard: undefined });
});

describe('headlineAmount', () => {
  it('floors to whole dollars, shows cents only under a dollar', () => {
    expect(headlineAmount(27.5)).toBe('$27');
    expect(headlineAmount(27)).toBe('$27');
    expect(headlineAmount(0.6)).toBe('$0.60');
    expect(headlineAmount(0)).toBe('$0');
  });
});

describe('WeekCard', () => {
  it('shows the headline, a grouped ×2 line and excludes 8-day-old swaps', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('I saved $14 on food in the last 7 days.');
    expect(screen.getByText('Falafel wrap ×2')).toBeInTheDocument();
    expect(screen.getByText('$9.80')).toBeInTheDocument();
    expect(screen.getByText('$4.30')).toBeInTheDocument();
    expect(screen.queryByText(/Ancient pie/)).not.toBeInTheDocument();
    expect(screen.getByText('Made with Culinerity. Savings only: no score, no name.')).toBeInTheDocument();
  });

  it('Remove one calls onRemoveOne with the item id; decrementing then drops the line', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Falafel wrap' }));
    expect(props.onRemoveOne).toHaveBeenCalledWith('falafel');
    const after = removeOneWeekSwap(removeOneWeekSwap(WEEK, 'falafel'), 'falafel');
    expect(after.filter((w) => w.itemId === 'falafel')).toHaveLength(0);
  });

  it('re-renders with one fewer, then no line at zero', () => {
    const { rerender } = render(<WeekCard week={WEEK} now={NOW} onRemoveOne={vi.fn()} onClear={vi.fn()} onSeeSwaps={vi.fn()} />);
    const one = removeOneWeekSwap(WEEK, 'falafel');
    rerender(<WeekCard week={one} now={NOW} onRemoveOne={vi.fn()} onClear={vi.fn()} onSeeSwaps={vi.fn()} />);
    expect(screen.getByText('Falafel wrap')).toBeInTheDocument();
    expect(screen.queryByText('Falafel wrap ×2')).not.toBeInTheDocument();
    rerender(<WeekCard week={removeOneWeekSwap(one, 'falafel')} now={NOW} onRemoveOne={vi.fn()} onClear={vi.fn()} onSeeSwaps={vi.fn()} />);
    expect(screen.queryByText(/Falafel/)).not.toBeInTheDocument();
  });

  it('Clear week calls onClear', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Clear week' }));
    expect(props.onClear).toHaveBeenCalledTimes(1);
  });

  it('Share uses navigator.share with savings-only text', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNav({ share });
    setup();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share' })));
    expect(share).toHaveBeenCalledTimes(1);
    const text: string = share.mock.calls[0][0].text;
    expect(text).toContain('Falafel wrap ×2: $9.80');
    expect(text).toContain('Saved in the last 7 days: $14.10');
    expect(text).not.toMatch(/score|answer|budget|income|suburb|rent|Alex/i);
  });

  it('falls back to the clipboard and announces Copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav({ share: undefined, clipboard: { writeText } });
    setup();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share' })));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Saved in the last 7 days: $14.10'));
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });

  it('clears the Copied notice when the week changes', async () => {
    setNav({ share: undefined, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const props = { now: NOW, onRemoveOne: vi.fn(), onClear: vi.fn(), onSeeSwaps: vi.fn() };
    const { rerender } = render(<WeekCard week={WEEK} {...props} />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share' })));
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
    rerender(<WeekCard week={removeOneWeekSwap(WEEK, WEEK[0].itemId)} {...props} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('never throws when sharing fails: calm message and the text to copy by hand', async () => {
    setNav({ share: vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError')) });
    setup();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share' })));
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't share. You can copy it by hand.");
    expect((screen.getByLabelText('Text to copy') as HTMLTextAreaElement).value).toContain('Saved in the last 7 days');
  });

  it('shows the fallback when there is no share and no clipboard', async () => {
    setNav({ share: undefined, clipboard: undefined });
    setup();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share' })));
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't share");
    expect(screen.getByLabelText('Text to copy')).toBeInTheDocument();
  });

  it('a cancelled share is quiet', async () => {
    setNav({ share: vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')) });
    setup();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share' })));
    expect(screen.getByRole('status')).not.toHaveTextContent("Couldn't");
  });

  it('empty week shows a friendly state with See swaps', () => {
    const props = setup([]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nothing in your week yet.');
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See swaps' }));
    expect(props.onSeeSwaps).toHaveBeenCalledTimes(1);
  });

  it('a week of only expired swaps is empty', () => {
    setup([WEEK[3]]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nothing in your week yet.');
  });
});
