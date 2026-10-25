import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DOMAINS } from '../domain/scoring/questionnaire';
import { Questionnaire } from './Questionnaire';

const sectionCount = 1 + Object.keys(DOMAINS).length;

function answerSection(label: string) {
  screen.getAllByRole('radio', { name: label }).forEach((r) => fireEvent.click(r));
}

describe('Questionnaire', () => {
  it('shows the score scale note', () => {
    render(<Questionnaire onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/100 = secure, 0 = critical/)).toBeInTheDocument();
  });

  it('calls onComplete(100) when everything is answered best', () => {
    const onComplete = vi.fn();
    render(<Questionnaire onComplete={onComplete} onSkip={vi.fn()} />);
    answerSection('No');
    for (let i = 1; i < sectionCount; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      answerSection('Never');
    }
    fireEvent.click(screen.getByRole('button', { name: /see my score/i }));
    expect(onComplete).toHaveBeenCalledWith(100);
  });

  it('does not complete with a gap and names what is missing', () => {
    const onComplete = vi.fn();
    render(<Questionnaire onComplete={onComplete} onSkip={vi.fn()} />);
    answerSection('No');
    for (let i = 1; i < sectionCount; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      if (i !== 2) answerSection('Never');
    }
    fireEvent.click(screen.getByRole('button', { name: /see my score/i }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Cost pressure/);
  });

  it('skips', () => {
    const onSkip = vi.fn();
    render(<Questionnaire onComplete={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onSkip).toHaveBeenCalled();
  });
});
