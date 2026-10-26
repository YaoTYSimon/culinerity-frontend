import type { ReactNode } from 'react';

/**
 * The one edge every text field wears: 2px solid in the muted token, which is >= 3:1 against both the page
 * ground and the surface tone in all four themes (WCAG 1.4.11; scripts/contrast.mjs checks it). Borders sit
 * inside the box (border-box), so field sizes do not change.
 */
export const FIELD_EDGE = 'border-2 border-solid border-muted';

/** Round, surface-toned text input with the shared edge (16px so phones don't zoom on focus). */
export const INPUT_CLASS = `focus-ring h-12 min-w-0 w-full rounded-full bg-surface px-5 text-base text-ink placeholder:text-muted ${FIELD_EDGE}`;

/** The one live region of a screen. Always rendered so announcements reach screen readers. */
export function Live({ children, mode = 'assertive' }: { children?: ReactNode; mode?: 'assertive' | 'off' }) {
  return (
    <div aria-live={mode} aria-atomic="true" className="empty:sr-only text-base font-semibold text-pretty text-ink">
      {children}
    </div>
  );
}
