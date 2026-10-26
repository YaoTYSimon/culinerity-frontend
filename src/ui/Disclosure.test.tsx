import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Disclosure } from './Disclosure';

const details = () => document.querySelector('details') as HTMLDetailsElement;

describe('Disclosure', () => {
  it('is closed until opened, with its summary as the label', () => {
    render(<Disclosure summary="More">body</Disclosure>);
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(details().open).toBe(false);
  });
  it('opens for printing and goes back afterwards', () => {
    render(<Disclosure summary="More">body</Disclosure>);
    act(() => { window.dispatchEvent(new Event('beforeprint')); });
    expect(details().open).toBe(true);
    act(() => { window.dispatchEvent(new Event('afterprint')); });
    expect(details().open).toBe(false);
  });
  it('leaves one the person opened open after printing', () => {
    render(<Disclosure summary="More">body</Disclosure>);
    details().open = true;
    act(() => { window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint')); });
    expect(details().open).toBe(true);
  });
  it('does not react to printing when printOpen is false', () => {
    render(<Disclosure summary="More" printOpen={false}>body</Disclosure>);
    act(() => { window.dispatchEvent(new Event('beforeprint')); });
    expect(details().open).toBe(false);
  });
});
