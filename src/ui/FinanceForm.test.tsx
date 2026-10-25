import { fireEvent, render, screen } from '@testing-library/react';
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
