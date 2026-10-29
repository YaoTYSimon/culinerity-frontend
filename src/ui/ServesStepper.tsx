import { MAX_SERVES, MIN_SERVES } from '@culinerity/core';
import { PillButton } from './PillButton';

const glyph = (d: string) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={d} /></svg>
);

/** Serves, 1 to 8, with two 44px round buttons. */
export function ServesStepper({ serves, onChange }: { serves: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <PillButton size="icon" variant="surface" aria-label="Fewer serves" disabled={serves <= MIN_SERVES} onClick={() => onChange(serves - 1)}>{glyph('M3 8h10')}</PillButton>
      <p className="min-w-16 text-center text-base font-semibold">{`Serves ${serves}`}</p>
      <PillButton size="icon" variant="surface" aria-label="More serves" disabled={serves >= MAX_SERVES} onClick={() => onChange(serves + 1)}>{glyph('M3 8h10M8 3v10')}</PillButton>
    </div>
  );
}
