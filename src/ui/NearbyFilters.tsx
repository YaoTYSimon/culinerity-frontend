import { useRef, type ReactNode } from 'react';
import { FILTER_GROUPS, hasActiveFilters, toggleFilter, type FilterGroupId, type PlaceFilters } from '@culinerity/core';
import { PillButton } from './PillButton';

interface Props {
  value: PlaceFilters;
  onChange: (next: PlaceFilters) => void;
  onClear: () => void;
  /** The result count; sits beside the Clear pill. */
  status: ReactNode;
}

const isOn = (f: PlaceFilters, group: FilterGroupId, value: string): boolean => {
  switch (group) {
    case 'type': return (f.type as string[]).includes(value);
    case 'cost': return (f.cost as string[]).includes(value);
    case 'food': return (f.food as string[]).includes(value);
    case 'access': return (f.access as string[]).includes(value);
    case 'checked': return f.checkedOnly;
  }
};

/**
 * Groups of toggle pills. Each is a native checkbox (Space toggles) drawn as a round pill; a pill that is on also gets a check
 * and bolder text. Picks within a group are OR, groups are AND, and a group with nothing picked limits nothing.
 */
export function NearbyFilters({ value, onChange, onClear, status }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const active = hasActiveFilters(value);
  const clear = () => {
    onClear();
    queueMicrotask(() => root.current?.querySelector('input')?.focus());
  };
  return (
    <div ref={root} className="grid gap-4">
      {FILTER_GROUPS.map((g) => (
        <fieldset key={g.id} className="m-0 grid min-w-0 gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-semibold text-muted">{g.label}</legend>
          <div className="flex flex-wrap gap-2">
            {g.options.map((o) => {
              const on = isOn(value, g.id, o.value);
              return (
                <label
                  key={o.value}
                  className="motion-colors relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-5 text-base font-medium text-ink has-checked:bg-accent has-checked:font-bold has-checked:text-accent-ink has-focus-visible:ring-2 has-focus-visible:ring-ink"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onChange(toggleFilter(value, g.id, o.value))}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                  {on && (
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.2 3L13 4.5" />
                    </svg>
                  )}
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {status}
        {active && <PillButton variant="surface" onClick={clear}>Clear</PillButton>}
      </div>
    </div>
  );
}
