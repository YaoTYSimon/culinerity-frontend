import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { THEME_IDS, THEME_NAMES, validateName, validatePasscode, type ThemeId } from '@culinerity/core';
import { supportsPasscode } from '../auth/uuid';
import { useAuth } from '../auth/useAuth';
import { LocalProfileStore } from '../storage/localProfileStore';
import { THEME_TOKENS } from '../theme/tokens';
import { Avatar } from './Avatar';
import { FocusHeading } from './FocusHeading';
import { INPUT_CLASS, Live } from './formParts';
import { PillButton } from './PillButton';

interface Props {
  /** Called once the profile exists and is signed in. */
  onDone: () => void;
  /** Shows a Cancel button and handles Escape. Omit where there is nothing to go back to. */
  onCancel?: () => void;
  /** Reads the guest profile to decide whether to offer the data choice. Defaults to the device's guest key. */
  readGuestProfile?: () => Record<string, unknown>;
}

const NAME_HELP = 'A first name or nickname is plenty. It stays on this device.';
const PASSCODE_HELP = "Optional. If you forget it, we can't reset it, but you can start a new profile.";

const defaultReadGuest = (): Record<string, unknown> => ({ ...new LocalProfileStore().load() });

/** Only a guest who has saved something (more than having seen the welcome page) gets the data choice. */
const hasGuestData = (p: Record<string, unknown>): boolean => Object.keys(p).some((k) => k !== 'welcomeSeen');

/** Name, optional passcode, avatar colour, and (only if there is guest data) where to start from. */
export function CreateProfile({ onDone, onCancel, readGuestProfile = defaultReadGuest }: Props) {
  const { create, signIn } = useAuth();
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [again, setAgain] = useState('');
  const [colour, setColour] = useState<ThemeId>(THEME_IDS[0]);
  const [useCurrent, setUseCurrent] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const busyRef = useRef(false);
  const canLock = useMemo(supportsPasscode, []);
  const guestHasData = useMemo(() => {
    try {
      return hasGuestData(readGuestProfile());
    } catch {
      return false;
    }
  }, [readGuestProfile]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current || created) return;
    const n = validateName(name);
    if (!n.ok) return setMessage(n.reason ?? 'Please enter a name.');
    const wantsLock = canLock && (passcode !== '' || again !== '');
    if (wantsLock) {
      const p = validatePasscode(passcode);
      if (!p.ok) return setMessage(p.reason ?? 'Use 4 to 8 digits.');
      if (passcode !== again) return setMessage("Those didn't match.");
    }
    const code = wantsLock ? passcode : undefined;
    busyRef.current = true;
    setBusy(true);
    setMessage('');
    try {
      const r = await create({
        name: n.value,
        colour,
        passcode: code,
        migrateGuestData: guestHasData && useCurrent,
      });
      if (!r.ok) {
        setMessage(r.message);
        return;
      }
      // The passcode is not kept past this call, in state or anywhere else.
      setPasscode('');
      setAgain('');
      const s = await signIn(r.account.id, code);
      if (s.ok) {
        onDone();
      } else {
        setCreated(true);
        setMessage('Your profile is saved, but we could not sign you in just now. You can choose it from the sign-in screen.');
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && onCancel) onCancel();
  };

  return (
    <form onSubmit={submit} onKeyDown={onKeyDown} className="grid gap-6 pb-4 pt-2" noValidate>
      <FocusHeading>Create a profile.</FocusHeading>

      <div className="grid gap-2">
        <label htmlFor="create-name" className="text-base font-semibold">
          Name
        </label>
        <input
          id="create-name"
          name="culinerity-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          aria-describedby="create-name-help"
          className={INPUT_CLASS}
        />
        <p id="create-name-help" className="px-2 text-[13px] text-pretty text-muted">
          {NAME_HELP}
        </p>
      </div>

      <div role="group" aria-labelledby="create-colour" className="grid gap-3">
        <p id="create-colour" className="text-base font-semibold">
          Avatar colour
        </p>
        <div className="flex justify-between gap-1">
          {THEME_IDS.map((id) => {
            const on = id === colour;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                aria-label={THEME_NAMES[id]}
                onClick={() => setColour(id)}
                className="group flex min-h-11 w-16 flex-col items-center gap-1.5 outline-none"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-12 items-center justify-center rounded-full ring-offset-2 ring-offset-bg group-focus-visible:ring-2 group-focus-visible:ring-ink ${on ? 'ring-2 ring-ink' : ''}`}
                  style={{ backgroundColor: THEME_TOKENS[id].accent, color: THEME_TOKENS[id]['accent-ink'] }}
                >
                  {on && (
                    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                    </svg>
                  )}
                </span>
                <span className={`text-[13px] ${on ? 'font-extrabold' : 'font-semibold'}`}>{THEME_NAMES[id]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-muted">
          <Avatar name={name} colour={colour} size={40} />
          <span className="text-[13px]">How you will look on the sign-in screen.</span>
        </div>
      </div>

      {canLock ? (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="create-passcode" className="text-base font-semibold">
              Passcode
            </label>
            <div className="flex items-center gap-2">
              <input
                id="create-passcode"
                name="culinerity-lock"
                type={showPasscode ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={8}
                spellCheck={false}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                aria-describedby="create-passcode-help"
                className={INPUT_CLASS}
              />
              <PillButton
                variant={showPasscode ? 'primary' : 'surface'}
                aria-pressed={showPasscode}
                onClick={() => setShowPasscode((s) => !s)}
              >
                Show
              </PillButton>
            </div>
            <p id="create-passcode-help" className="px-2 text-[13px] text-pretty text-muted">
              {PASSCODE_HELP}
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="create-passcode-again" className="text-base font-semibold">
              Confirm passcode
            </label>
            <input
              id="create-passcode-again"
              name="culinerity-lock-again"
              type={showPasscode ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={8}
              spellCheck={false}
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ) : (
        <p className="text-base text-pretty text-muted">
          This browser can&apos;t protect profiles with a passcode. You can still make a profile without one.
        </p>
      )}

      {guestHasData && (
        <div role="group" aria-labelledby="create-start" className="grid gap-3">
          <p id="create-start" className="text-base font-semibold">
            Where should this profile start?
          </p>
          <div className="grid gap-2">
            <PillButton variant={useCurrent ? 'primary' : 'surface'} aria-pressed={useCurrent} onClick={() => setUseCurrent(true)}>
              Start from my current data
            </PillButton>
            <PillButton variant={useCurrent ? 'surface' : 'primary'} aria-pressed={!useCurrent} onClick={() => setUseCurrent(false)}>
              Start fresh
            </PillButton>
          </div>
          <p className="px-2 text-[13px] text-pretty text-muted">
            Starting from your current data moves what is saved on this device so far into this profile.
          </p>
        </div>
      )}

      <Live>{message}</Live>

      <div className="grid justify-items-center gap-2">
        {created ? (
          <PillButton onClick={onDone} className="w-full">
            Done
          </PillButton>
        ) : (
          <PillButton type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating…' : 'Create profile'}
          </PillButton>
        )}
        {onCancel && (
          <PillButton variant="text" onClick={onCancel}>
            Cancel
          </PillButton>
        )}
      </div>
    </form>
  );
}
