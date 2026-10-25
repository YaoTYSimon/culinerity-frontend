import { useEffect, useRef, type RefObject } from 'react';
import type { View } from './views';

/**
 * When the view changes (not on first render), moves focus to that view's h1, or to <main> when it has none,
 * so keyboard and screen-reader users get a cue. Re-renders within the same view never move focus.
 */
export function useFocusOnViewChange(view: View, main: RefObject<HTMLElement | null>) {
  const previous = useRef(view);
  useEffect(() => {
    if (previous.current === view) return;
    previous.current = view;
    const target = main.current?.querySelector<HTMLElement>('h1') ?? main.current;
    target?.focus();
  }, [view, main]);
}
