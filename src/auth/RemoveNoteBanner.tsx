import { PillButton } from '../ui/PillButton';
import { describeLeftovers } from './removeNotice';
import { useAuth } from './useAuth';

/** The calm, dismissible note shown after a delete left something behind or a new profile could not sign in. */
export function RemoveNoteBanner() {
  const { removeNotice, dismissRemoveNotice, note, dismissNote } = useAuth();
  const text = removeNotice && removeNotice.length > 0 ? describeLeftovers(removeNotice) : note;
  if (!text) return null;
  return (
    <div role="status" className="grid justify-items-start gap-1 rounded-[2rem] bg-surface p-4">
      <p className="text-base text-pretty">{text}</p>
      <PillButton
        variant="text"
        onClick={() => {
          dismissRemoveNotice();
          dismissNote();
        }}
      >
        Dismiss
      </PillButton>
    </div>
  );
}
