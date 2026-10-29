import { PillButton } from './PillButton';

/** What just happened, in a polite live region, with Undo when there is something to put back. */
export function UndoStatus({ text, onUndo }: { text: string | null; onUndo: (() => void) | null }) {
  return (
    <div role="status" aria-live="polite" className="empty:hidden">
      {text && (
        <div className="flex flex-wrap items-center gap-x-1">
          <p className="text-base font-semibold">{text}</p>
          {onUndo && <PillButton variant="text" onClick={onUndo}>Undo</PillButton>}
        </div>
      )}
    </div>
  );
}
