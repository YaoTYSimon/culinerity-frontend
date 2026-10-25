import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FinanceForm } from './FinanceForm';

describe('FinanceForm', () => {
  it.each(['abc', '-3', ''])('gives undefined budget for %j', (text) => {
    const onChange = vi.fn();
    render(<FinanceForm value={{ foodBudgetWeekly: 50 }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/weekly food budget/i), { target: { value: text } });
    expect(onChange).toHaveBeenLastCalledWith({ foodBudgetWeekly: undefined });
  });

  it('passes valid numbers and suburb through', () => {
    const onChange = vi.fn();
    render(<FinanceForm value={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/weekly food budget/i), { target: { value: '85.5' } });
    expect(onChange).toHaveBeenLastCalledWith({ foodBudgetWeekly: 85.5 });
    const income = screen.getByLabelText(/weekly income/i);
    fireEvent.change(income, { target: { value: '20' } });
    fireEvent.change(income, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ incomeWeekly: undefined });
    fireEvent.change(screen.getByLabelText(/suburb/i), { target: { value: 'Carlton' } });
    expect(onChange).toHaveBeenLastCalledWith({ suburb: 'Carlton' });
  });
});

describe('FinanceForm feedback and sync', () => {
  it('flags invalid money text with a linked hint, clears when valid or blank', () => {
    render(<FinanceForm value={{}} onChange={vi.fn()} />);
    const budget = screen.getByLabelText(/weekly food budget/i);
    expect(budget).not.toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(budget, { target: { value: '-3' } });
    expect(budget).toHaveAttribute('aria-invalid', 'true');
    expect(budget).toHaveAccessibleDescription(/0 or more/);
    fireEvent.change(budget, { target: { value: '12' } });
    expect(budget).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(/0 or more/)).not.toBeInTheDocument();
    fireEvent.change(budget, { target: { value: '' } });
    expect(screen.queryByText(/0 or more/)).not.toBeInTheDocument();
  });

  it('re-syncs fields when the parent resets value', () => {
    function Host() {
      const [v, setV] = useState({ foodBudgetWeekly: 40, suburb: 'Carlton' });
      return (
        <>
          <button onClick={() => setV({} as typeof v)}>reset</button>
          <FinanceForm value={v} onChange={(p) => setV(p as typeof v)} />
        </>
      );
    }
    render(<Host />);
    expect(screen.getByLabelText(/weekly food budget/i)).toHaveValue('40');
    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByLabelText(/weekly food budget/i)).toHaveValue('');
    expect(screen.getByLabelText(/suburb/i)).toHaveValue('');
  });
});
