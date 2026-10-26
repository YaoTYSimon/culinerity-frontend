import { useContext, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { isDeletionConfirmed, type AccountRecord } from '@culinerity/core';
import { describeLeftovers } from '../auth/removeNotice';
import { AuthContext, type AuthState } from '../auth/useAuth';
import { Avatar } from './Avatar';
import { INPUT_CLASS, Live } from './formParts';
import { PillButton } from './PillButton';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Guests: open the create-a-profile screen (the shell shows it; one h1 stays on the page). */
  onCreateProfile: () => void;
}

const ITEM =
  'focus-ring motion-colors flex min-h-11 w-full items-center rounded-full px-4 text-left text-lg font-semibold hover:bg-bg';

/** Neutral person glyph for a guest: a flat surface circle, no letter. */
function GuestAvatar() {
  return (
    <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
      </svg>
    </span>
  );
}

/**
 * The round avatar button in the header and its small panel. Renders nothing outside an AuthProvider.
 * Like the Menu it is a disclosure: Escape closes it and focus returns to the button.
 */
export function ProfileMenu(props: Props) {
  const auth = useContext(AuthContext);
  return auth ? <ProfileMenuInner auth={auth} {...props} /> : null;
}

function ProfileMenuInner({ auth, open, onOpenChange, onCreateProfile }: Props & { auth: AuthState }) {
  const { current, accounts } = auth;
  const button = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) firstItem.current?.focus();
  }, [open]);

  const close = () => {
    onOpenChange(false);
    button.current?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      close();
    }
  };
  const label = current ? `Profile menu, signed in as ${current.name}` : 'Profile menu, guest';

  return (
    <div onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : onOpenChange(true))}
        className="focus-ring motion-colors flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        {current ? <Avatar name={current.name} colour={current.colour} size={36} /> : <GuestAvatar />}
      </button>

      {open && (
        <div id={panelId} role="group" aria-label="Profile menu" className="absolute inset-x-0 top-full z-10 grid gap-1 bg-surface px-4 pb-4 pt-2">
          {current ? (
            <>
              <p className="px-4 py-2 text-base text-muted [overflow-wrap:anywhere]">Signed in as {current.name}</p>
              <button ref={firstItem} type="button" className={ITEM} onClick={() => auth.lock()}>
                Switch profile
              </button>
              <button type="button" className={ITEM} onClick={() => auth.lock()}>
                Lock
              </button>
              <button
                type="button"
                className={ITEM}
                onClick={() => {
                  onOpenChange(false);
                  setDeleting(true);
                }}
              >
                Delete this profile and its data
              </button>
              <button type="button" className={ITEM} onClick={() => auth.signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="px-4 py-2 text-base text-muted">You&apos;re using Culinerity as a guest</p>
              <button
                ref={firstItem}
                type="button"
                className={ITEM}
                onClick={() => {
                  onOpenChange(false);
                  onCreateProfile();
                }}
              >
                Create a profile
              </button>
              {accounts.length > 0 && (
                <button type="button" className={ITEM} onClick={() => auth.lock()}>
                  Sign in
                </button>
              )}
            </>
          )}
        </div>
      )}

      {deleting && current && (
        <DeleteDialog
          auth={auth}
          account={current}
          onClose={() => {
            setDeleting(false);
            button.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function DeleteDialog({ auth, account, onClose }: { auth: AuthState; account: AccountRecord; onClose: () => void }) {
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
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

  return (
    <div className="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-bg/90 p-4" onKeyDown={onKeyDown}>
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
    </div>
  );
}
