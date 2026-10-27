import type { ReactNode } from 'react';

/** A plain link to a source: opens in a new tab, 44px tall, with the new-tab note for screen readers. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring inline-flex min-h-11 w-fit max-w-full items-center rounded-full text-sm font-semibold text-ink underline underline-offset-4"
    >
      <span className="min-w-0 break-words">{children}<span className="sr-only"> (opens the source in a new tab)</span></span>
    </a>
  );
}
