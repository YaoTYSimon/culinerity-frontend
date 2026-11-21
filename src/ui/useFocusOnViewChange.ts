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
    const el = main.current;
    if (!el) return;
    const focusHeading = () => (el.querySelector<HTMLElement>('[data-lazy-error], h1') ?? el).focus();
    // A lazily loaded view shows a fallback first (the old view stays hidden underneath it), so wait for the
    // fallback to go, then move focus the same way an eager view does.
    if (el.querySelector('[data-lazy-fallback]')) {
      const observer = new MutationObserver(() => {
        if (el.querySelector('[data-lazy-fallback]')) return;
        observer.disconnect();
        focusHeading();
      });
      observer.observe(el, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
    focusHeading();
  }, [view, main]);
}
