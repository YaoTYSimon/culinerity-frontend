import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { isDeletionConfirmed, type AccountRecord } from '@culinerity/core';
import { describeLeftovers } from '../auth/removeNotice';
import type { AuthState } from '../auth/useAuth';
import { Avatar } from './Avatar';
import { INPUT_CLASS, Live } from './formParts';
import { PillButton } from './PillButton';

const ITEM =
  'focus-ring motion-colors flex min-h-11 items-center rounded-full px-4 text-left text-base font-semibold hover:bg-bg';

/** Neutral person glyph for a guest: a flat surface circle, no letter. */
export function GuestAvatar() {
  return (
    <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
      </svg>
    </span>
  );
}

interface BlockProps {
  auth: AuthState;
  /** Receives focus when the panel opens (the first action of the block). */
  firstItem: RefObject<HTMLButtonElement | null>;
  /** Close the panel (focus is left alone: the next screen or dialog takes it). */
  onClose: () => void;
  /** Ask the shell to open the delete-this-profile dialog (it outlives the panel). */
  onDelete: () => void;
  onCreateProfile: () => void;
}

/**
 * The profile part of the header panel: who is using the app and what they can do about it. Guests see
 * "Create a profile" (and "Sign in" when profiles exist); signed-in people see their name, switch, lock,
 * delete and sign out. The actions are short pills laid out in a wrapping row to keep the panel compact.
 */
export function ProfileBlock({ auth, firstItem, onClose, onDelete, onCreateProfile }: BlockProps) {
  const { current, accounts } = auth;
  // Switch profile and Lock both call lock(): the screen that follows depends on how many profiles exist (the chooser, or the one profile's sign-in).
  const showChooser = () => auth.lock();
  return (
    <section aria-label="Profile" className="grid gap-0.5">
      {current ? (
        <>
          <p className="flex items-center gap-2 px-4 text-base font-semibold [overflow-wrap:anywhere]">
            <Avatar name={current.name} colour={current.colour} size={28} />
            <span className="sr-only">Signed in as </span>
            {current.name}
          </p>
          <div className="flex flex-wrap gap-x-1">
            <button ref={firstItem} type="button" className={ITEM} onClick={showChooser}>
              Switch profile
            </button>
            <button type="button" className={ITEM} onClick={showChooser}>
              Lock
            </button>
            <button type="button" className={ITEM} onClick={() => auth.signOut()}>
              Sign out
            </button>
            <button
              type="button"
              className={ITEM}
              onClick={() => {
                onClose();
                onDelete();
              }}
            >
              Delete profile
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 px-4 text-base font-semibold">
            <GuestAvatar />
            Guest
          </p>
          <div className="flex flex-wrap gap-x-1">
            <button
              ref={firstItem}
              type="button"
              className={ITEM}
              onClick={() => {
                onClose();
                onCreateProfile();
              }}
            >
              Create a profile
            </button>
            {accounts.length > 0 && (
              <button type="button" className={ITEM} onClick={showChooser}>
                Sign in
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function DeleteDialog({ auth, account, onClose }: { auth: AuthState; account: AccountRecord; onClose: () => void }) {
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    input.current?.focus();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current || !isDeletionConfirmed(account, typed)) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const r = await auth.remove(account.id, typed);
      if (r.ok) return; // the shell signs out and this dialog unmounts with it
      setFailed(true);
      if (r.remaining.length) {
        setMessage(describeLeftovers(r.remaining));
      } else if (r.reason === 'name-mismatch') {
        setMessage("That isn't quite the name. Type it exactly as shown, then try again.");
      } else {
        setMessage("We couldn't remove that profile. Try again.");
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // Keep Tab inside the dialog; Escape closes it.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Tab' && root.current) {
      const els = [...root.current.querySelectorAll<HTMLElement>('input, button:not(:disabled)')];
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  // Everything else on the page is inert while the dialog is open (not focusable, not clickable, hidden from
  // assistive tech). The dialog is portalled to <body>, so it is a sibling of the app and stays live.
  useEffect(() => {
    const host = hostRef.current;
    const others = [...document.body.children].filter((el) => el !== host && !el.hasAttribute('inert'));
    others.forEach((el) => el.setAttribute('inert', ''));
    return () => others.forEach((el) => el.removeAttribute('inert'));
  }, []);

  return createPortal(
    <div ref={hostRef} className="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-bg/90 p-4" onKeyDown={onKeyDown}>
      <div
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[440px] rounded-[2rem] bg-surface p-6"
      >
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <div className="grid gap-3">
            <h2 id={titleId} className="font-display text-[26px] text-balance">
              Delete this profile?
            </h2>
            <p className="text-base text-pretty text-muted">
              This removes <span className="font-semibold text-ink [overflow-wrap:anywhere]">{account.name}</span> and everything saved
              under it on this device. It can&apos;t be undone. Other profiles are not touched.
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor={inputId} className="text-base font-semibold [overflow-wrap:anywhere]">
              Type {account.name} to confirm
            </label>
            <input
              id={inputId}
              ref={input}
              name="culinerity-confirm-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={INPUT_CLASS.replace('bg-surface', 'bg-bg')}
            />
          </div>
          <Live>{message}</Live>
          <div className="grid justify-items-center gap-2">
            <PillButton type="submit" disabled={busy || !isDeletionConfirmed(account, typed)} className="w-full">
              {busy ? 'Deleting…' : 'Delete profile'}
            </PillButton>
            <PillButton variant="text" onClick={onClose}>
              {failed ? 'Close' : 'Cancel'}
            </PillButton>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
