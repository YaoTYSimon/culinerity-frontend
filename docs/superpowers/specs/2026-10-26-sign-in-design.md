# Sign-in page: Design

Written unattended (the user asked for "a sign-in page" and went to sleep with blanket permission to create and source everything). Every decision below is a **designer's call**, listed in "Calls made", so the user can check or change them. Builds on `2026-10-25-culinerity-rewrite-design.md` and `2026-10-26-welcome-themes-plate-redesign-design.md` (the plate design system, the four themes, the privacy rules).

## The tension, and how it is resolved

The app is built around **privacy and no accounts**: answers, finances, score, week and theme live on the person's device; the backend holds reference data only; the welcome page says "no sign-up". A normal sign-in (email and password stored on a server) would break that promise and needs a user database, password reset email and a security programme this project does not have.

**Resolution:** the sign-in is a **local, on-device sign-in**, with the same privacy promise. It lets a person keep one or more named **profiles on this device**, optionally protected by a **passcode**, so that a shared phone or laptop (common for students and families) does not expose someone's score, budget or week. Nothing about the person leaves the device. A server-backed account is explicitly **out of scope**, but the code is shaped (an `AuthService` interface) so a server implementation could be added later without changing the screens.

## Intent

Give people a clear, kind "who is this?" screen that:
- feels like the rest of the app (plate design, themes, round shapes, photos), not a generic login box;
- is optional and never blocks the swap search for someone who just wants swaps (the welcome page's "Skip to cheaper swaps" still works);
- protects privacy on shared devices and says honestly what it does and does not do ("This stays on this phone. We can't reset a forgotten passcode.").

## What gets built

1. **Sign-in screen** (`SignIn`), shown when there are saved profiles on the device and none is signed in (after the welcome page for first-time visitors). Elements: h1 **"Welcome back."** (or "Who's eating today?" when there are 2+ profiles); a round plate-style **profile chooser** (one round avatar per profile: a coloured circle with the first letter, name beneath; at most 6 shown, then "More"); selecting a profile with a passcode shows a **passcode field** (4–8 digits, `inputMode="numeric"`, `autocomplete="off"`, masked, with a "Show" toggle) and a primary pill **"Sign in"**; profiles without a passcode sign in with one tap. Below: text buttons **"Use a different profile"**, **"Create a profile"** and **"Skip for now"** (continues as a guest: nothing saved under a profile, but current behaviour is unchanged). The unlock errors are calm and specific: "That passcode didn't match. 2 tries left." then a short delay (no lockout beyond a 30-second pause after 5 failures; no data is deleted).
2. **Create a profile** (`CreateProfile`): name (first name or nickname only, 1–24 chars, trimmed; helper text "A first name or nickname is plenty. It stays on this device."), optional passcode and confirm (4–8 digits; helper text "Optional. If you forget it, we can't reset it, but you can start a new profile."), choose a colour for the avatar from the four theme accents, primary pill "Create profile".
3. **Profiles menu:** the header gets a small round avatar button showing the signed-in profile (or a neutral person circle for guest); opening it shows "Signed in as <name>", "Switch profile", "Lock" (returns to the sign-in screen), "Delete this profile and its data" (confirm step: the person types the profile name; deletes that profile's stored data only), and "Sign out".
4. **Per-profile data:** `Profile`, theme, week and history are stored per profile id (key `culinerity.profile.v1.<id>`); a guest uses the existing keys. Switching profile reloads state. Existing single-profile data is migrated to a first profile named "Me" only if the person creates one (never automatically).
5. **Honesty copy** on the screen (plain, no scare words): "Profiles live only on this device. Anyone with access to this browser could still reach its stored data. A passcode adds a lock, not encryption."
6. Keyboard and screen-reader complete; one h1 per screen; focus moves to the heading on screen change; errors in an `aria-live="assertive"` region; avatar buttons have names ("Sign in as Sam"); no autofill of passcodes (`autocomplete="off"`, `name` not "password"), but the field is a real `type="password"` (masked) with `inputMode="numeric"`, `pattern="[0-9]*"`.

## Security design (be honest, keep it simple)

- The passcode is **never stored**. A **verifier** is stored: PBKDF2-SHA-256 via Web Crypto (`crypto.subtle.deriveBits`), random 16-byte salt per profile, 210,000 iterations (OWASP 2023+ guidance for PBKDF2-HMAC-SHA256), output 32 bytes, stored base64 with the salt and iteration count in the profile record. Verification uses a constant-time comparison. No plaintext, no reversible encryption, no keys derived for data encryption (the stored app data is **not encrypted**; the lock is access control in the app's UI only, as the copy says).
- No network calls, no cookies, no tokens, no third-party identity providers (no "Sign in with Google").
- Rate limiting is local and soft (30-second pause after 5 failures, tracked per profile in memory and in storage); the screen says it is a convenience lock.
- If Web Crypto is unavailable (very old browsers, insecure contexts), the screen shows "This browser can't protect profiles with a passcode" and offers profiles without one; never fall back to a weaker hash or to storing the passcode.
- Deleting a profile removes only that profile's keys (`culinerity.profile.v1.<id>`, its week/history/theme) after the typed-name confirmation.

## Data and interfaces (in `packages/core`, platform-free; web implementations in `src/`)

- `type ProfileId = string` (UUID v4 from `crypto.randomUUID()` in the web layer; core never generates it).
- `interface AccountRecord { id: ProfileId; name: string; colour: ThemeId; createdAt: string; verifier?: { salt: string; iterations: number; hash: string } }`
- `interface AuthService { list(): AccountRecord[]; current(): AccountRecord | null; create(input: { name: string; colour: ThemeId; passcode?: string }): Promise<AccountRecord>; signIn(id: ProfileId, passcode?: string): Promise<SignInResult>; lock(): void; signOut(): void; remove(id: ProfileId, confirmName: string): Promise<boolean>; }`; `type SignInResult = { ok: true; account: AccountRecord } | { ok: false; reason: 'wrong-passcode' | 'too-many-attempts' | 'unknown-profile' | 'needs-passcode'; triesLeft?: number; retryInSeconds?: number }`.
- Pure helpers in core with tests: `validateName(name): { ok: boolean; value: string; reason?: string }` (trim, 1–24 chars, no control characters), `validatePasscode(p): { ok: boolean; reason?: string }` (4–8 digits only; rejects trivially weak patterns "0000", "1234", "1111" with a kind note, as a suggestion not a block? decision: block the 4 worst: all-same digits and straight sequences, with the copy "That one is easy to guess. Try another."), `nextAttemptState(state, now)` for the soft rate limit, `isDeletionConfirmed(account, typed)`.
- `LocalAuthService` (web, `src/auth/`) implements `AuthService` using `localStorage` (key `culinerity.accounts.v1` for the account list, `culinerity.session.v1` in `sessionStorage` for the signed-in id so closing the tab signs out; the account list and verifiers persist) and Web Crypto. Never throws: storage failures return a typed error and the UI shows a calm message.
- `AuthProvider` + `useAuth()` in `src/auth/`; `ServicesProvider` takes the profile id so `profiles` (ProfileStore) is scoped per profile (`LocalProfileStore(keySuffix)`); guest = no suffix (the existing key).

## Constraints

- Plate design system: Schibsted Grotesk, fully round shapes (avatars are circles, buttons are pills), flat colour, no cards/chips/hairlines/shadows, themes via tokens, AA contrast, `focus-visible`, `motion-safe`, 44px targets, no horizontal scroll at 320–1280px, phone-first, centred 520px column on desktop.
- Copy: kind, plain, non-shaming; never "login failed"; use "didn't match".
- Privacy: the account list contains first names/nicknames and avatar colours only; no email, no phone, no surname asked; helper text says so.
- Testing: unit tests for every pure helper; component tests for each screen; PBKDF2 tested with a known vector and a test that two profiles with the same passcode get different salts/hashes; the rate limit tested with an injected clock; storage-failure paths tested; Playwright screenshots at 390/320/1280 in two themes for sign-in, create profile and the profile menu.

## Goals / non-goals / anti-goals

- **Goals:** a lock for shared devices; named profiles; a sign-in screen that fits the design system; honest privacy copy.
- **Non-goals:** server accounts, email/password, OAuth/social login, password reset, multi-device sync, encrypting stored data, two-factor.
- **Anti-goals:** implying the passcode makes data safe from someone with browser access; collecting personal identifiers; blocking the swap search behind sign-in; storing the passcode in any recoverable form.

## Calls made (designer, unattended; the user can change any)

1. Local on-device sign-in instead of server accounts (privacy promise kept; server version deferred behind `AuthService`).
2. Passcode (4–8 digits) is optional; profiles without one sign in with a tap.
3. PBKDF2-SHA-256, 210,000 iterations, 16-byte salt, via Web Crypto; no new dependency.
4. Session lives in `sessionStorage` (closing the tab signs out); profile data lives in `localStorage`.
5. Existing data is not auto-migrated; a person who creates a profile can choose "Start from my current data" (moves the existing keys under the new id) or "Start fresh".
6. Guest mode ("Skip for now") keeps current behaviour with the existing keys.
7. Soft rate limit: 30-second pause after 5 wrong passcodes; no lockout, no data deletion.
8. Avatar = coloured circle with the first letter (no photo upload).
9. The sign-in screen appears after the welcome page for people who have profiles; first-time visitors still see welcome first and are offered "Create a profile" later from the menu (not forced).

## Left to the builder

Component and file names within the stated structure; exact avatar colours (one of the four theme accents); layout of the profile chooser for 1 vs many profiles; the exact error and helper copy within the tone above; whether the profiles menu is a popover or a sheet; how to implement the soft rate-limit state.

## Builder-check rulings (designer, unattended; not yet confirmed by the user)

1. **Migration is a move.** "Start from my current data" copies the guest `Profile` object into the new profile's key and then **removes** the guest copy (verify the write first, then delete). No profile data ever stays under the guest keys. "Lock" and "Sign out" unmount the signed-in tree: `ServicesProvider`/`App` are keyed on the profile id, so in-memory profile state and the `Services` instance are discarded (the sign-in screen renders outside that tree). Guest sessions are separate: guest data stays under the guest keys and is never adopted automatically.
2. **Honest security limits are accepted.** A 4–8 digit passcode can be brute-forced offline by someone with devtools access to `localStorage`; the soft rate limit can be bypassed by clearing storage. The lock is access control for casual access on a shared device, not encryption. The iteration count is hygiene, not a control. The on-screen copy says so ("A passcode adds a lock, not encryption. Someone with technical access could get around it."). No data encryption in this version (non-goal stands).
3. **Session and tabs:** `sessionStorage` per tab is intended (closing the tab signs out; a new tab asks again; a refresh stays signed in). No idle timeout (documented). The account list is re-read from storage before every write and merged by id (last write wins per id), and `LocalAuthService` listens to the `storage` event to refresh. `current()` returns `null` if the session id points to a deleted profile (the UI then shows sign-in).
4. **Per-profile data:** the single `Profile` object (including `welcomeSeen`, `scoreHistory`, `weekSwaps`) is stored under `culinerity.profile.v1.<id>`. The **theme stays global** (device-level `culinerity.theme.v1`, no flash; the avatar colour is only the avatar and does not change the theme). `welcomeSeen`: creating a profile sets it to true in that profile (the person has already met the app). Returning visitors with accounts and no session see the **sign-in screen first**; guests keep their own `welcomeSeen`. The migration choice is offered only when the guest `Profile` is non-empty, and works with any name. Remounting the tree on profile change is acceptable.
5. **Deleting:** deleting the signed-in profile signs out and clears in-memory state. The typed-name confirmation is enough while unlocked. The sign-in screen also offers "Forgot passcode? Delete this profile" with the same typed-name confirmation and **no passcode** (the owner of the device can always remove local data; copy states that anyone using this browser can do this). Deleting never touches guest keys or other profiles.
6. **Secure contexts:** if `crypto.subtle` is missing, only passcode-less profiles can be created and a calm notice explains why. IDs: `crypto.randomUUID()`, else a UUID built from `crypto.getRandomValues`, else creation is refused with a message. Vitest uses Node's `webcrypto` (set up in the test setup file). Sign-in shows a "Checking…" busy state during PBKDF2 and disables the button while busy.
7. **Verifier details:** compare equal-length byte arrays with an XOR-accumulate loop (no early return); the record stores `v: 1`, iterations, salt, hash; no rehash on login.
8. **Passcode weak rules:** reject all-same digits, ascending/descending straight runs (e.g. 1234, 4321, 0123, 7890, 0987), and repeated pairs (1212, 123123); message "That one is easy to guess. Try another." Nothing else is blocked. "More" (when more than 6 profiles) opens a simple list.
9. **Tooling:** screenshots use the Playwright MCP tools already available (no new repo dependency). The work branches from the finished `feature/plate-redesign` as `feature/sign-in` after the plate redesign is complete.
