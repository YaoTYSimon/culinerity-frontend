import { SignIn } from '../ui/SignIn';
import { PillButton } from '../ui/PillButton';
import { describeLeftovers } from './removeNotice';
import { useAuth } from './useAuth';

/** The sign-in slot of the Gate: the plate shell around the real screen. It shows no profile data. */
export function SignInScreen() {
  const { removeNotice, dismissRemoveNotice } = useAuth();
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-bg text-ink">
        <p className="px-4 py-3 text-base font-extrabold tracking-tight">Culinerity</p>
        <main id="main" className="flex-1 px-4 py-4">
          {removeNotice && removeNotice.length > 0 && (
            <div role="status" className="mb-4 grid justify-items-start gap-1 rounded-[2rem] bg-surface p-4">
              <p className="text-base text-pretty">{describeLeftovers(removeNotice)}</p>
              <PillButton variant="text" onClick={dismissRemoveNotice}>
                Dismiss
              </PillButton>
            </div>
          )}
          <SignIn />
        </main>
      </div>
    </div>
  );
}
