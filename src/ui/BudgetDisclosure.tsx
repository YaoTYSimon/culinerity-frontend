import type { Profile } from '@culinerity/core';
import { FinanceForm } from './FinanceForm';

interface Props {
  value: Profile;
  onChange: (p: Profile) => void;
}

/** The shared "Your budget" disclosure: a labelled row with a round plus/minus, 44px tall, over the finance form. */
export function BudgetDisclosure({ value, onChange }: Props) {
  return (
    <details className="group">
      <summary className="focus-ring flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-full text-base font-semibold [&::-webkit-details-marker]:hidden">
        <span>Your budget</span>
        <span data-affordance aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
          <svg viewBox="0 0 16 16" className="size-4 motion-safe:transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 6l4.5 4.5L12.5 6" />
          </svg>
        </span>
      </summary>
      <div className="pt-2">
        <FinanceForm value={value} onChange={onChange} />
      </div>
    </details>
  );
}
