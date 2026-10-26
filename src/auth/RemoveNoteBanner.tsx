import { PillButton } from '../ui/PillButton';
import { describeLeftovers } from './removeNotice';
import { useAuth } from './useAuth';

/** The calm, dismissible note shown when a delete left something behind (sign-in screen, or the guest app). */
export function RemoveNoteBanner() {
  const { removeNotice, dismissRemoveNotice } = useAuth();
  if (!removeNotice || removeNotice.length === 0) return null;
  return (
    <div role="status" className="grid justify-items-start gap-1 rounded-[2rem] bg-surface p-4">
      <p className="text-base text-pretty">{describeLeftovers(removeNotice)}</p>
      <PillButton variant="text" onClick={dismissRemoveNotice}>
        Dismiss
      </PillButton>
    </div>
  );
}
