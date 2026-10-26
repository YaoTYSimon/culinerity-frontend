import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The screen's one h1. It takes focus when it mounts, so each screen change (screens render their own
 * FocusHeading) gives keyboard and screen-reader users a cue.
 */
export function FocusHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className="font-display text-[30px] text-balance outline-none">
      {children}
    </h1>
  );
}
