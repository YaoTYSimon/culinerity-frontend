import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  summary: ReactNode;
  children: ReactNode;
  /** Opens when the page is printed (and closes again afterwards), so nothing is hidden on paper. Default true. */
  printOpen?: boolean;
  className?: string;
  /** Starts open. Default false. */
  defaultOpen?: boolean;
}

/** A plain details/summary: one round chevron, a 44px summary, the same look wherever it is used. */
export function Disclosure({ summary, children, printOpen = true, className = '', defaultOpen = false }: Props) {
  const el = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!printOpen) return;
    let wasClosed = false;
    const before = () => {
      wasClosed = el.current !== null && !el.current.open;
      if (el.current) el.current.open = true;
    };
    const after = () => {
      if (el.current && wasClosed) el.current.open = false;
      wasClosed = false;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [printOpen]);
  return (
    <details ref={el} open={defaultOpen || undefined} className={`group ${className}`}>
      <summary className="focus-ring flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-full text-base font-semibold [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
          <svg viewBox="0 0 16 16" className="size-4 motion-safe:transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 6l4.5 4.5L12.5 6" />
          </svg>
        </span>
      </summary>
      {children}
    </details>
  );
}
