import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { AccountRecord, ProfileId, RemoveResult, SignInResult } from '@culinerity/core';
import { useAuth } from '../auth/useAuth';
import { Avatar } from './Avatar';
import { PageHeader } from './PageHeader';
import { CreateProfile } from './CreateProfile';
import { FocusHeading } from './FocusHeading';
import { INPUT_CLASS, Live } from './formParts';
import { PillButton } from './PillButton';

const MAX_SHOWN = 6;

const HONESTY =
  'A password locks this profile on this device. It is not encryption.';

type Mode =
  | { kind: 'choose' }
  | { kind: 'more' }
  | { kind: 'passcode'; id: ProfileId }
  | { kind: 'delete'; id: ProfileId }
  | { kind: 'create' };

interface Props {
  /** Called when the visitor chooses to browse as a guest (the Gate remembers the choice). */
  onGuest?: () => void;
  /** Injected clock (ms) for the pause countdown. */
  now?: () => number;
  /** Calls `cb` about once a second until the returned function is called. Injected in tests. */
  ticker?: (cb: () => void) => () => void;
}

const everySecond = (cb: () => void): (() => void) => {
  const handle = setInterval(cb, 1000);
  return () => clearInterval(handle);
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pauseMessage = (s: number) => `Too many tries. You can try again in ${plural(s, 'second', 'seconds')}.`;

/** "Who is this?": the profile chooser, the password step, and the delete / create side screens. */
export function SignIn({ now = Date.now, ticker = everySecond, onGuest }: Props) {
  const { accounts, signIn, remove, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<Mode>({ kind: 'choose' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  // The pause after too many wrong passwords: when it ends, whole seconds left, and whether it has ticked yet.
  const [pause, setPause] = useState<{ until: number; left: number; ticked: boolean } | null>(null);
  const busyRef = useRef(false);
  const passcodeRef = useRef<HTMLInputElement>(null);

  const go = useCallback((next: Mode, note = '') => {
    setMode(next);
    setMessage(note);
    setShowPasscode(false);
    setConfirmName('');
    setPause(null);
  }, []);

  const byId = (id: ProfileId): AccountRecord | undefined => accounts.find((a) => a.id === id);
  const target = mode.kind === 'passcode' || mode.kind === 'delete' ? byId(mode.id) : undefined;
  // The profile vanished (deleted here or in another tab): fall back to the chooser.
  const vanished = (mode.kind === 'passcode' || mode.kind === 'delete') && !target;
  useEffect(() => {
    if (vanished) go({ kind: 'choose' }, "That profile isn't here any more.");
  }, [vanished, go]);

  // Count the pause down. Only the seconds shown change; nothing animates.
  const pausing = pause !== null;
  const until = pause?.until ?? 0;
  useEffect(() => {
    if (!pausing) return;
    return ticker(() => {
      const left = Math.ceil((until - now()) / 1000);
      if (left > 0) setPause({ until, left, ticked: true });
      else {
        setPause(null);
        setMessage('You can try again now.');
      }
    });
  }, [pausing, until, ticker, now]);

  function explain(r: Extract<SignInResult, { ok: false }>, account: AccountRecord) {
    switch (r.reason) {
      case 'wrong-passcode': {
        const n = r.triesLeft;
        setMessage(
          n === undefined ? "That password didn't match." : `That password didn't match. ${plural(n, 'try', 'tries')} left.`,
        );
        passcodeRef.current?.focus();
        return;
      }
      case 'too-many-attempts': {
        const s = Math.max(1, Math.ceil(r.retryInSeconds ?? 30));
        setPause({ until: now() + s * 1000, left: s, ticked: false });
        setMessage('');
        return;
      }
      case 'unknown-profile':
        go({ kind: 'choose' }, "That profile isn't here any more.");
        return;
      case 'needs-passcode':
        go({ kind: 'passcode', id: account.id });
        return;
      default:
        setMessage("This browser can't keep you signed in. Try again, or continue as a guest.");
    }
  }

  async function attempt(account: AccountRecord, passcode?: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const r = await signIn(account.id, passcode);
      if (!r.ok) explain(r, account);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function choose(account: AccountRecord) {
    if (busyRef.current) return;
    if (account.verifier) go({ kind: 'passcode', id: account.id });
    else {
      setMessage('');
      void attempt(account);
    }
  }

  function submitPasscode(e: FormEvent) {
    e.preventDefault();
    if (!target || busyRef.current || (pause && pause.left > 0)) return;
    // Read once, then clear at once: the password lives in this local only, never in state or the page.
    const value = passcodeRef.current?.value ?? '';
    if (passcodeRef.current) passcodeRef.current.value = '';
    if (!value) {
      setMessage('Please enter your password.');
      return;
    }
    setMessage('');
    void attempt(target, value);
  }

  async function submitDelete(e: FormEvent) {
    e.preventDefault();
    if (!target || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    let r: RemoveResult;
    try {
      r = await remove(target.id, confirmName);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
    if (r.ok) return go({ kind: 'choose' });
    if (r.reason === 'name-mismatch') {
      setMessage("That isn't quite the name. Type it exactly as shown, then try again.");
    } else if (r.reason === 'unknown-profile') {
      go({ kind: 'choose' }, "That profile isn't here any more.");
    } else {
      go(
        { kind: 'choose' },
        r.remaining.length
          ? "Some data could not be removed from this browser. You can clear this site's data in your browser settings to finish."
          : "We couldn't remove that profile. Try again.",
      );
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && mode.kind !== 'choose') go({ kind: 'choose' });
  };

  const paused = pause !== null && pause.left > 0;
  const liveText = paused ? pauseMessage(pause.left) : message;

  let body;
  if (mode.kind === 'create') {
    body = <CreateProfile onDone={() => go({ kind: 'choose' })} onCancel={() => go({ kind: 'choose' })} />;
  } else if (mode.kind === 'passcode' && target) {
    body = (
      <div className="grid gap-6 pb-4 pt-2">
        <div className="grid justify-items-start gap-4">
          <Avatar name={target.name} colour={target.colour} size={80} />
          <div className="grid gap-2">
            <FocusHeading>{`Hi, ${target.name}.`}</FocusHeading>
            <p className="text-base text-pretty text-muted">Enter your password to carry on.</p>
          </div>
        </div>
        <form onSubmit={submitPasscode} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <label htmlFor="signin-passcode" className="text-base font-semibold">
              Password
            </label>
            <div className="flex items-center gap-2">
              <input
                id="signin-passcode"
                ref={passcodeRef}
                name="culinerity-lock"
                type={showPasscode ? 'text' : 'password'}
                autoComplete="current-password"
                maxLength={64}
                spellCheck={false}
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
          </div>
          <Live mode={pause?.ticked ? 'off' : 'assertive'}>{liveText}</Live>
          {/* Paused: aria-disabled (not disabled) keeps it fully readable; submit() ignores it meanwhile. */}
          <PillButton type="submit" disabled={busy} aria-disabled={paused || undefined} className="w-full">
            {busy ? 'Checking…' : paused ? `Try again in ${pause.left} s` : 'Sign in'}
          </PillButton>
        </form>
        <div className="grid justify-items-center gap-1">
          <PillButton variant="text" onClick={() => go({ kind: 'choose' })}>
            Use a different profile
          </PillButton>
          <PillButton variant="text" onClick={() => go({ kind: 'delete', id: target.id })}>
            Forgot password? Delete this profile
          </PillButton>
        </div>
        <p className="text-[13px] text-pretty text-muted">{HONESTY}</p>
      </div>
    );
  } else if (mode.kind === 'delete' && target) {
    body = (
      <form onSubmit={submitDelete} className="grid gap-6 pb-4 pt-2" noValidate>
        <div className="grid gap-3">
          <FocusHeading>Delete this profile?</FocusHeading>
          <p className="text-base text-pretty text-muted">
            This removes {target.name} and everything saved under it on this device. It can&apos;t be undone. Anyone
            using this browser can do this, so a forgotten password isn&apos;t the end of the road.
          </p>
        </div>
        <div className="grid gap-2">
          <label htmlFor="signin-confirm" className="text-base font-semibold">
            Type {target.name} to confirm
          </label>
          <input
            id="signin-confirm"
            name="culinerity-confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={INPUT_CLASS}
          />
        </div>
        <Live>{message}</Live>
        <div className="grid justify-items-center gap-2">
          <PillButton type="submit" disabled={busy} className="w-full">
            Delete profile
          </PillButton>
          <PillButton variant="text" onClick={() => go({ kind: 'passcode', id: target.id })}>
            Cancel
          </PillButton>
        </div>
      </form>
    );
  } else if (mode.kind === 'more') {
    const rest = accounts.slice(MAX_SHOWN);
    body = (
      <div className="grid gap-6 pb-4 pt-2">
        <FocusHeading>More profiles.</FocusHeading>
        <ul className="grid gap-2">
          {rest.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                aria-label={`Sign in as ${a.name}`}
                disabled={busy}
                onClick={() => choose(a)}
                className="focus-ring motion-colors flex min-h-11 w-full items-center gap-3 rounded-full bg-surface py-1.5 pr-6 pl-1.5 text-left font-semibold text-ink disabled:opacity-60"
              >
                <Avatar name={a.name} colour={a.colour} size={36} />
                <span className="min-w-0 [overflow-wrap:anywhere]">{a.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <Live>{message}</Live>
        <div className="grid justify-items-center">
          <PillButton variant="text" onClick={() => go({ kind: 'choose' })}>
            Back
          </PillButton>
        </div>
      </div>
    );
  } else {
    const shown = accounts.slice(0, MAX_SHOWN);
    const roomy = accounts.length <= 2;
    body = (
      <div className="grid gap-6 pb-4 pt-2">
        <PageHeader photo="signin-cups" size={112}>
          <FocusHeading>{accounts.length > 1 ? "Who's eating today?" : 'Welcome back.'}</FocusHeading>
          <p className="text-base text-pretty text-muted">Pick your profile to carry on.</p>
        </PageHeader>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-5">
          {shown.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                aria-label={`Sign in as ${a.name}`}
                disabled={busy}
                onClick={() => choose(a)}
                className={`group flex min-h-11 flex-col items-center gap-2 outline-none disabled:opacity-60 ${roomy ? 'w-28' : 'w-[84px]'}`}
              >
                <Avatar
                  name={a.name}
                  colour={a.colour}
                  size={roomy ? 96 : 72}
                  className="group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-bg"
                />
                <span className="max-w-full text-center text-base font-semibold leading-tight [overflow-wrap:anywhere]">
                  {a.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Live>{message}</Live>
        <div className="grid justify-items-center gap-1">
          {accounts.length > MAX_SHOWN && (
            <PillButton variant="surface" onClick={() => go({ kind: 'more' })}>
              More
            </PillButton>
          )}
          <PillButton variant="text" onClick={() => go({ kind: 'create' })}>
            Create a profile
          </PillButton>
          <PillButton
            variant="text"
            onClick={() => {
              continueAsGuest();
              onGuest?.();
            }}
          >
            Browse as a guest
          </PillButton>
        </div>
        <p className="text-[13px] text-pretty text-muted">{HONESTY}</p>
      </div>
    );
  }

  return (
    <div onKeyDown={onKeyDown} key={mode.kind === 'passcode' || mode.kind === 'delete' ? mode.kind + mode.id : mode.kind}>
      {body}
    </div>
  );
}
