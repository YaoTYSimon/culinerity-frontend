import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TagInput } from './TagInput';

function Harness({ start = [], max = 12 }: { start?: string[]; max?: number }) {
  const [values, setValues] = useState<string[]>(start);
  return <TagInput label="Add your own" values={values} onChange={setValues} max={max} hint="Up to 12." />;
}

const field = () => screen.getByLabelText('Add your own');
const type = (text: string) => fireEvent.change(field(), { target: { value: text } });

describe('TagInput', () => {
  it('adds on Enter, clears the field and shows the tag as text', () => {
    render(<Harness />);
    type('<b>x</b>');
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(screen.getByText('<b>x</b>')).toBeInTheDocument();
    expect(document.querySelector('b')).toBeNull();
    expect(field()).toHaveValue('');
  });

  it('adds with the Add button', () => {
    render(<Harness />);
    type('Peanuts');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Peanuts')).toBeInTheDocument();
  });

  it('ignores duplicates case-insensitively and blank text', () => {
    render(<Harness start={['Peanuts']} />);
    type('peanuts');
    fireEvent.keyDown(field(), { key: 'Enter' });
    type('   ');
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
  });

  it('removes with a labelled button', () => {
    render(<Harness start={['Peanuts', 'Egg']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Peanuts' }));
    expect(screen.queryByText('Peanuts')).not.toBeInTheDocument();
    expect(screen.getByText('Egg')).toBeInTheDocument();
  });

  it('stops at max', () => {
    render(<Harness start={['a', 'b']} max={2} />);
    type('c');
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(screen.queryByText('c')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('limits text to 40 characters and wraps long tags', () => {
    render(<Harness />);
    expect(field()).toHaveAttribute('maxlength', '40');
    const long = 'x'.repeat(40);
    type(long);
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(screen.getByText(long).className).toMatch(/break-words|\[overflow-wrap:anywhere\]/);
  });
});
