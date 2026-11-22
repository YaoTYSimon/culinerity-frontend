import { useState, type ReactNode } from 'react';
import { photoUrl } from '../assets/photos';
import { CreateProfile } from '../ui/CreateProfile';
import { FocusHeading } from '../ui/FocusHeading';
import { PillButton } from '../ui/PillButton';
import { RoundPhoto } from '../ui/RoundPhoto';
import { SignIn } from '../ui/SignIn';
import { useAuth } from './useAuth';

interface Props {
  /** The visitor chose to look around without a profile. */
  onGuest: () => void;
}

const ICON = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const SignInIcon = () => (
  <svg {...ICON}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);
const CreateIcon = () => (
  <svg {...ICON}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const GuestIcon = () => (
  <svg {...ICON}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
);

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-bg text-ink">
        <p className="px-4 py-3 text-base font-extrabold tracking-tight">Culinerity</p>
        <main id="main" className="flex-1 px-4 py-4">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * The first thing a new visitor sees: sign in (only when profiles exist), create a profile, or browse as a
 * guest. It shows no profile data and never mounts the profile services; the Gate decides when it appears.
 */
export function StartScreen({ onGuest }: Props) {
  const { accounts } = useAuth();
  const [mode, setMode] = useState<'start' | 'signin' | 'create'>('start');

  if (mode === 'signin' && accounts.length > 0) {
    return (
      <Shell>
        <SignIn onGuest={onGuest} />
      </Shell>
    );
  }
  if (mode === 'create') {
    return (
      <Shell>
        <CreateProfile onDone={() => setMode('start')} onCancel={() => setMode('start')} />
      </Shell>
    );
  }
  const actions: { label: string; icon: ReactNode; variant: 'primary' | 'surface'; run: () => void }[] = [];
  if (accounts.length > 0) actions.push({ label: 'Sign in', icon: <SignInIcon />, variant: 'surface', run: () => setMode('signin') });
  actions.push({ label: 'Create a profile', icon: <CreateIcon />, variant: 'primary', run: () => setMode('create') });
  actions.push({ label: 'Browse as a guest', icon: <GuestIcon />, variant: 'surface', run: onGuest });
  return (
    <Shell>
      <div className="grid justify-items-center gap-6 pb-4 pt-2 text-center">
        <RoundPhoto src={photoUrl('welcome-soup')} size={160} eager />
        <div className="grid gap-2">
          <FocusHeading>Welcome to Culinerity.</FocusHeading>
          <p className="text-base text-pretty text-muted">Profiles stay on this device.</p>
        </div>
        <div className="grid w-full gap-3">
          {actions.map((a) => (
            <PillButton key={a.label} variant={a.variant} onClick={a.run} className="min-h-14 w-full gap-3 text-lg">
              {a.icon}
              {a.label}
            </PillButton>
          ))}
        </div>
      </div>
    </Shell>
  );
}
