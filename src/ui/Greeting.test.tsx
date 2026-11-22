import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthContext, type AuthState } from '../auth/useAuth';
import { Greeting } from './Greeting';

const withName = (name: string | null) =>
  ({ current: name === null ? null : { id: 'a', name, colour: 'sand', createdAt: '2026-01-01T00:00:00Z' } }) as unknown as AuthState;

function renderWith(name: string | null) {
  return render(<AuthContext.Provider value={withName(name)}><Greeting /></AuthContext.Provider>);
}

describe('Greeting', () => {
  it('says Welcome, NAME for a signed-in profile', () => {
    const { container } = renderWith('Sam');
    expect(container.textContent).toBe('Welcome, Sam');
  });

  it('renders nothing for a guest or without an auth provider', () => {
    expect(renderWith(null).container).toBeEmptyDOMElement();
    expect(render(<Greeting />).container).toBeEmptyDOMElement();
  });

  it('renders markup-looking names as plain text', () => {
    const { container } = renderWith('<b>x</b>');
    expect(container.textContent).toBe('Welcome, <b>x</b>');
    expect(container.querySelector('b')).toBeNull();
  });

  it('keeps the full long name in the text and adds no heading', () => {
    const long = 'A'.repeat(120);
    const { container } = renderWith(long);
    expect(container.textContent).toBe(`Welcome, ${long}`);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
