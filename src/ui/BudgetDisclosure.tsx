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
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 8h10" />
            <path d="M8 3v10" className="group-open:hidden" />
          </svg>
        </span>
      </summary>
      <div className="pt-2">
        <FinanceForm value={value} onChange={onChange} />
      </div>
    </details>
  );
}
