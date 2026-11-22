import type { ReactNode } from 'react';

export type NearbyMode = 'list' | 'map';

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className: 'size-5 shrink-0' } as const;

const OPTIONS: { value: NearbyMode; label: string; icon: ReactNode }[] = [
  { value: 'list', label: 'List', icon: <svg viewBox="0 0 24 24" {...ICON}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg> },
  { value: 'map', label: 'Map', icon: <svg viewBox="0 0 24 24" {...ICON}><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg> },
];

/** List | Map as two round pills: a native radio pair, so the arrow keys and a screen reader's "1 of 2" come free. */
export function NearbyViewSwitch({ value, onChange }: { value: NearbyMode; onChange: (v: NearbyMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Show results as" className="flex gap-2">
      {OPTIONS.map((o) => (
        <label
          key={o.value}
          className={`motion-colors inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-5 font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${value === o.value ? 'bg-accent text-accent-ink' : 'bg-surface text-ink'}`}
        >
          <input type="radio" name="nearby-view" value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.icon}
          {o.label}
        </label>
      ))}
    </div>
  );
}
