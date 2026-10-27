import { useId } from 'react';
import type { PlaceFilter } from '@culinerity/core';

const OPTIONS: { value: PlaceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fresh', label: 'Fresh produce' },
  { value: 'free', label: 'Free' },
  { value: 'low-cost', label: 'Low cost' },
];

interface Props {
  value: PlaceFilter;
  onChange: (v: PlaceFilter) => void;
}

/** A native radio group (arrows move within it) drawn as round pills; the chosen one also gets a check and bolder text. */
export function NearbyFilters({ value, onChange }: Props) {
  const name = useId();
  return (
    <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold text-muted">Show</legend>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="motion-colors relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-5 text-base font-medium text-ink has-checked:bg-accent has-checked:font-bold has-checked:text-accent-ink has-focus-visible:ring-2 has-focus-visible:ring-ink"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
            {value === o.value && (
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8.5l3.2 3L13 4.5" />
              </svg>
            )}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
