import type { OriginState } from './useOrigin';
import { INPUT_CLASS } from './formParts';
import { PillButton } from './PillButton';

const MESSAGE = {
  denied: 'Location is off for this site. You can type a suburb instead, or turn it on in your browser settings.',
  unavailable: "We couldn't work out where you are. Type a suburb instead.",
  timeout: 'That took too long. Try again, or type a suburb.',
} as const;

interface Props {
  state: OriginState;
  /** Prefix for the field id, so two copies on a page never share one. */
  idPrefix: string;
  profileSuburb?: string;
}

/** "Use my location", a typed suburb or postcode, and the calm messages for each way it can go wrong. */
export function OriginControls({ state: o, idPrefix, profileSuburb }: Props) {
  const locating = o.phase.kind === 'locating';
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const fieldId = `${idPrefix}-suburb`;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <PillButton ref={o.locateButton} aria-disabled={locating} onClick={o.locate}>Use my location</PillButton>
        {locating && <PillButton variant="surface" onClick={o.stopLocating}>Cancel</PillButton>}
        {o.origin && <PillButton variant="text" className="-ml-3" onClick={o.clear}>Clear my location</PillButton>}
      </div>

      <div aria-live="polite" className="empty:hidden grid justify-items-start gap-3 text-base font-semibold text-pretty">
        {locating && <p>Finding you…</p>}
        {o.phase.kind === 'failed' && (
          <>
            <p>{MESSAGE[o.phase.reason]}{o.phase.reason === 'unavailable' && offline ? ' You also look to be offline; the list still works.' : ''}</p>
            {o.phase.reason === 'timeout' && <PillButton variant="surface" onClick={o.locate}>Try again</PillButton>}
          </>
        )}
      </div>

      <form onSubmit={o.onSubmit} className="grid gap-2">
        <label htmlFor={fieldId} className="text-sm font-semibold text-muted">Type a suburb or postcode</label>
        <div className="flex gap-2">
          <input
            id={fieldId}
            ref={o.field}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={o.typed}
            onChange={(e) => o.setTyped(e.target.value)}
            className={INPUT_CLASS}
          />
          <PillButton type="submit" variant="surface" className="shrink-0">Use this suburb</PillButton>
        </div>
        {o.typed !== '' && o.typed === profileSuburb && !o.used && (
          <p className="text-sm text-muted">Press Use this suburb to see places near it.</p>
        )}
        <div aria-live="polite" className="empty:hidden grid gap-2 text-base text-pretty">
          {o.noMatch && <p className="font-semibold">We don't have that suburb yet. Try one nearby.</p>}
          {o.suggestions.length > 0 && (
            <>
              <p className="font-semibold">Did you mean</p>
              <div className="flex flex-wrap gap-2">
                {o.suggestions.map((s) => (
                  <PillButton key={s} variant="surface" onClick={() => { o.setTyped(s); o.useText(s); }}>{s}</PillButton>
                ))}
              </div>
            </>
          )}
        </div>
      </form>
    </>
  );
}
