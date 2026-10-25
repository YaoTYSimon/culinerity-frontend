import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DOMAINS, FIES_QUESTIONS, FREQUENCIES } from '@culinerity/core';
import { Questionnaire } from './Questionnaire';

const DOMAIN_QS = Object.values(DOMAINS).flat();
const TOTAL = FIES_QUESTIONS.length + DOMAIN_QS.length;

const pick = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function answerAll(fies: string, freq: string) {
  for (let i = 0; i < FIES_QUESTIONS.length; i++) pick(fies);
  for (let i = 0; i < DOMAIN_QS.length; i++) pick(freq);
}

describe('Questionnaire', () => {
  it('shows one question at a time as the single h1, with the privacy line', () => {
    render(<Questionnaire onComplete={vi.fn()} onSkip={vi.fn()} />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(FIES_QUESTIONS[0]);
    expect(screen.queryByText(FIES_QUESTIONS[1])).not.toBeInTheDocument();
    expect(screen.getByText('Answers stay on this phone')).toBeInTheDocument();
  });

  it('calls onComplete(100) when everything is answered best', () => {
    const onComplete = vi.fn();
    render(<Questionnaire onComplete={onComplete} onSkip={vi.fn()} />);
    answerAll('No', 'Never');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(100);
  });

  it('calls onComplete(0) when everything is answered worst', () => {
    const onComplete = vi.fn();
    render(<Questionnaire onComplete={onComplete} onSkip={vi.fn()} />);
    answerAll('Yes', FREQUENCIES[4]);
    expect(onComplete).toHaveBeenCalledWith(0);
  });

  it('shows Yes/No for the first questions then the frequency pills', () => {
    render(<Questionnaire onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    for (let i = 0; i < FIES_QUESTIONS.length; i++) pick('No');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(DOMAIN_QS[0]);
    FREQUENCIES.forEach((f) => expect(screen.getByRole('button', { name: f })).toBeInTheDocument());
  });

  it('never completes before the last question is answered', () => {
    const onComplete = vi.fn();
    render(<Questionnaire onComplete={onComplete} onSkip={vi.fn()} />);
    for (let i = 0; i < TOTAL - 1; i++) pick(i < FIES_QUESTIONS.length ? 'No' : 'Never');
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(DOMAIN_QS[DOMAIN_QS.length - 1]);
    pick('Never');
    expect(onComplete).toHaveBeenCalledWith(100);
  });

  it('shows the progress as "N of M"', () => {
    render(<Questionnaire onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument();
    pick('No');
    pick('No');
    expect(screen.getByText(`3 of ${TOTAL}`)).toBeInTheDocument();
  });

  it('has a progress bar that follows the current question', () => {
    render(<Questionnaire onComplete={vi.fn()} onSkip={vi.fn()} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '1');
    expect(bar).toHaveAttribute('aria-valuemax', String(TOTAL));
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    pick('No');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
  });

  it('Back on the first question does nothing', () => {
    render(<Questionnaire onComplete={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(FIES_QUESTIONS[0]);
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument();
  });

  it('Back shows the previous question with its answer selected', () => {
    render(<Questionnaire onComplete={vi.fn()} onSkip={vi.fn()} />);
    pick('Yes');
    pick('No');
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(FIES_QUESTIONS[1]);
    expect(screen.getByRole('button', { name: 'No' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('announces each question politely and moves focus to the heading', () => {
    render(<Questionnaire onComplete={vi.fn()} onSkip={vi.fn()} />);
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent(FIES_QUESTIONS[0]);
    pick('No');
    expect(live).toHaveTextContent(FIES_QUESTIONS[1]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('skips at the start and part way, and never completes', () => {
    const onSkip = vi.fn();
    const onComplete = vi.fn();
    render(<Questionnaire onComplete={onComplete} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
    pick('No');
    pick('No');
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onSkip).toHaveBeenCalledTimes(2);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
