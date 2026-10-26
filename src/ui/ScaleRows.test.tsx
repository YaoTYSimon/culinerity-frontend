import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seifaPosition, SEIFA_SCALE, type Area } from '@culinerity/core';
import { ScaleRows } from './ScaleRows';

const area = (name: string, score: number, decile: number | null): Area => ({ name, seifaIrsdScore: score, seifaDecileVic: decile, release: 'r', sourceId: 's' });

describe('ScaleRows', () => {
  it('labels the scale ends and the Australian average', () => {
    render(<ScaleRows areas={[area('A', 800, 1)]} />);
    expect(screen.getByText('700')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('Australian average')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });
  it('rounds the score to a whole number and places the dot and the average marker on the scale', () => {
    render(<ScaleRows areas={[area('Dandenong - North', 827.56, 1)]} />);
    const row = screen.getByRole('listitem');
    expect(row).toHaveTextContent('828');
    const track = within(row).getByRole('img');
    expect(track).toHaveAccessibleName(/Dandenong - North: score 828 on a scale from 700 to 1,200; the Australian average is 1,000/);
    const lefts = [...track.querySelectorAll<HTMLElement>('[style]')].map((e) => e.style.left);
    expect(lefts).toEqual([`${seifaPosition(SEIFA_SCALE.average)}%`, `${seifaPosition(828)}%`]);
  });
  it('shows the Victorian decile as text, and nothing when it is not known', () => {
    render(<ScaleRows areas={[area('A', 800, 3), area('B', 900, null)]} />);
    const [a, b] = screen.getAllByRole('listitem');
    expect(a).toHaveTextContent('Victorian decile 3');
    expect(b).not.toHaveTextContent('decile');
  });
});
