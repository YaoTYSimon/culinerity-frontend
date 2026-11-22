import { useId, useRef, useState, type ReactNode } from 'react';
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
 * A round Filters pill (with a count of what is on) opens groups of toggle pills in place; closed, the active ones show as removable pills.
 * Groups of toggle pills. Each is a native checkbox (Space toggles) drawn as a round pill; a pill that is on also gets a check
 * and bolder text. Picks within a group are OR, groups are AND, and a group with nothing picked limits nothing.
 */
export function NearbyFilters({ value, onChange, onClear, status }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const active = hasActiveFilters(value);
  const on = FILTER_GROUPS.flatMap((g) => g.options.filter((o) => isOn(value, g.id, o.value)).map((o) => ({ group: g.id, ...o })));
  const clear = () => {
    onClear();
    queueMicrotask(() => (open ? root.current?.querySelector<HTMLElement>('input') : trigger.current)?.focus());
  };
  return (
    <div
      ref={root}
      className="grid gap-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="focus-ring motion-colors inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-5 text-base font-semibold text-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 4.5h12M2 11.5h12" />
            <circle cx="10.5" cy="4.5" r="1.8" fill="var(--color-surface)" />
            <circle cx="5.5" cy="11.5" r="1.8" fill="var(--color-surface)" />
          </svg>
          Filters
          {on.length > 0 && (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">{on.length}</span>
          )}
        </button>
        {status}
        {active && <PillButton variant="surface" onClick={clear}>Clear</PillButton>}
      </div>
      {!open && on.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {on.map((o) => (
            <button
              key={`${o.group}-${o.value}`}
              type="button"
              aria-label={`${o.label}, remove`}
              onClick={() => {
                onChange(toggleFilter(value, o.group, o.value));
                queueMicrotask(() => trigger.current?.focus());
              }}
              className="focus-ring motion-colors inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-base font-bold text-accent-ink"
            >
              {o.label}
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div id={panelId} className="grid gap-3">
          {FILTER_GROUPS.map((g) => (
            <fieldset key={g.id} className="m-0 grid min-w-0 gap-1 border-0 p-0">
              <legend className="mb-1 p-0 text-xs font-semibold text-muted">{g.label}</legend>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const checked = isOn(value, g.id, o.value);
                  return (
                    <label
                      key={o.value}
                      className="motion-colors relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-4 text-base font-medium text-ink has-checked:bg-accent has-checked:font-bold has-checked:text-accent-ink has-focus-visible:ring-2 has-focus-visible:ring-ink"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onChange(toggleFilter(value, g.id, o.value))}
                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                      {checked && (
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
        </div>
      )}
    </div>
  );
}
