import type { ReactNode } from 'react';

/** Round, surface-toned text input (16px so phones don't zoom on focus). */
export const INPUT_CLASS =
  'focus-ring h-12 min-w-0 w-full rounded-full bg-surface px-5 text-base text-ink placeholder:text-muted';

/** The one live region of a screen. Always rendered so announcements reach screen readers. */
export function Live({ children, mode = 'assertive' }: { children?: ReactNode; mode?: 'assertive' | 'off' }) {
  return (
    <div aria-live={mode} aria-atomic="true" className="empty:sr-only text-base font-semibold text-pretty text-ink">
      {children}
    </div>
  );
}
