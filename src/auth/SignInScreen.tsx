import { SignIn } from '../ui/SignIn';
import { RemoveNoteBanner } from './RemoveNoteBanner';

/** The sign-in slot of the Gate: the plate shell around the real screen. It shows no profile data. */
export function SignInScreen({ onGuest }: { onGuest?: () => void }) {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-bg text-ink">
        <p className="px-4 py-3 text-base font-extrabold tracking-tight">Culinerity</p>
        <main id="main" className="flex-1 px-4 py-4">
          <div className="mb-4 empty:hidden">
            <RemoveNoteBanner />
          </div>
          <SignIn onGuest={onGuest} />
        </main>
      </div>
    </div>
  );
}
