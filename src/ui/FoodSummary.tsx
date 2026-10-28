import type { FoodProfile } from '@culinerity/core';
import { SHARED_DEVICE_LINE } from './foodCopy';
import { FoodSections, type FoodSection } from './FoodSections';
import { FocusHeading } from './FocusHeading';
import { PillButton } from './PillButton';

/** What the status line is saying: a clear that can be undone, or a plain saved message. */
export type Notice = { kind: 'food' | 'meals' } | { kind: 'saved'; text: string };

interface Props {
  food: FoodProfile | undefined;
  hasMeals: boolean;
  notice: Notice | null;
  onChange: (section: FoodSection) => void;
  onSetUp: () => void;
  onClearFood: () => void;
  onClearMeals: () => void;
  onUndo: () => void;
  onDone: () => void;
}

/** The view once food settings exist: each section with "Change", then the clear controls. */
export function FoodSummary({ food, hasMeals, notice, onChange, onSetUp, onClearFood, onClearMeals, onUndo, onDone }: Props) {
  return (
    <section aria-label="My food" className="grid min-w-0 gap-5 text-ink">
      <div className="grid gap-3">
        <FocusHeading>My food</FocusHeading>
        <p className="text-base text-pretty text-muted">
          What you chose, in your words. We never guess.
        </p>
        <p className="text-sm text-pretty text-muted">These stay with this profile on this device.</p>
      </div>

      <div role="status" className="empty:hidden text-base font-semibold text-pretty">
        {notice?.kind === 'saved' && notice.text}
        {(notice?.kind === 'food' || notice?.kind === 'meals') && (
          <span className="inline-flex flex-wrap items-center gap-x-1">
            Cleared.
            <PillButton variant="text" onClick={onUndo} className="px-2">Undo</PillButton>
          </span>
        )}
      </div>

      {food ? (
        <FoodSections food={food} onChange={onChange} />
      ) : (
        <div className="grid justify-items-start gap-2">
          <p className="text-base text-pretty text-muted">No food settings saved.</p>
          <PillButton onClick={onSetUp}>Set up my food</PillButton>
        </div>
      )}

      <div className="grid justify-items-start gap-1">
        {food && <PillButton variant="surface" onClick={onClearFood}>Clear my food settings</PillButton>}
        {hasMeals && <PillButton variant="surface" onClick={onClearMeals} className="mt-2">Clear my meals</PillButton>}
      </div>

      <p className="text-sm text-pretty text-muted">{SHARED_DEVICE_LINE}</p>
      <PillButton onClick={onDone} className="w-full">Done</PillButton>
    </section>
  );
}
