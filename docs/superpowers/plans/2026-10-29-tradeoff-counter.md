# Trade-off Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private, on-device record of what a household gave up to keep food on the table: two-tap logging, a Monday-week count sentence, calm safe-messaging support, and an optional opt-in printable summary.

**Architecture:** A pure core module `packages/core/src/tradeoffs` (categories, sanitiser, add/remove/restore, week grouping, support tiers, summary) and an optional `Profile.tradeoffs` field wired exactly like `culturalMeals`. UI in `src/ui` follows `MealsView`/`AddMeal` (two-tap add, status line, undo stack) without any ring, dial or number styling.

**Tech Stack:** TypeScript, React 19, Tailwind v4 plate tokens, Vitest + Testing Library, Playwright for screenshots.

**Spec:** `docs/superpowers/specs/2026-10-29-tradeoff-counter-design.md` (the "Builder-check rulings" section wins over earlier sections).

## Global Constraints

- Branch `feature/whatif`; stage only your files by explicit path; never `git add -A`; no push.
- `packages/core` is platform-free (no `window`, `document`, `localStorage`, React, Node); `now: Date` is injected; tests run in `TZ=Australia/Melbourne`.
- Storage: only the profile JSON (`culinerity.profile.v1` / `.<id>`), field `tradeoffs?: TradeoffEntry[]`; empty means absent (never `[]`); nothing sent, shared, logged, in the share text, `WeekCard`, URL, `document.title`, `data-` attributes, or any other key.
- Retention `TRADEOFF_RETENTION_WEEKS = 8`; `MAX_TRADEOFFS = 150`; `MAX_NOTE = 140`; categories exactly the ten ids in the spec, in the spec order.
- Count sentence exactly: "N trade-offs this week: this is what keeping food on the table cost" ("1 trade-off ..."); empty: "Nothing logged this week. Log one only if you want to." Reflection exactly: "Keeping food on the table should not cost this much." Disclaimer: "This is just a record. There is no right number. It is not a test or a score. It is not a validated measure."
- No targets, streaks, badges, totals over time, deltas, trends, comparisons, scores, rings, dials, big numerals, red/amber/alarm styling, timers on undo, `role="alert"`, modals.
- Helplines (verified 29 Oct 2026): Lifeline 13 11 14, Kids Helpline 1800 55 1800, National Debt Helpline 1800 007 007, Foodbank Find Food `https://findfood.foodbank.org.au/`. 1800RESPECT, Orange Door, Parentline Victoria, Safe Steps never appear. No wording about child protection, welfare, neglect or reporting.
- Plate design rules (flat colour, round pills, semantic colour names, 44px targets, `focus-ring`, `motion-colors`, `FIELD_EDGE`/`INPUT_CLASS` on inputs), one h1 ("What we went without"), plain Australian English, no emoji, no `console.*` in the feature files.
- TDD for every behaviour; run `npm test`, `npm run typecheck`, `node scripts/contrast.mjs` before each commit that touches code.

## Review Focus

Most likely first; each has its pinning test in the named task.

1. A note with emoji, right-to-left text, zero-width or control characters, or 5,000 characters must render as text, never throw, and over 140 characters must be refused on add (Task 1, Task 2).
2. An entry stored with an unknown category, a missing id, or a future date (hand-edited storage) must not crash the view or show "undefined" (Task 1).
3. Logging near week boundaries and clock changes (Sunday 23:59, Monday 00:01, 4 Oct 2026 DST start) puts the entry in the right Monday week (Task 1).
4. The support card must appear for the five support categories only, never alarm, never write storage, and never show 1800RESPECT or any unverified service (Task 3).
5. The summary must exclude notes, unticked categories and every profile field by default, and must not send, save or share anything (Task 4).

## File Structure

- `packages/core/src/tradeoffs/types.ts`: `TradeoffCategory`, `TradeoffEntry`, id list, constants.
- `packages/core/src/tradeoffs/categories.ts`: labels, support tier per category (labels are core data so tests and UI share them).
- `packages/core/src/tradeoffs/entries.ts`: validation, sanitiser, add/remove/restore, week grouping.
- `packages/core/src/tradeoffs/support.ts`: helpline data and `supportFor`.
- `packages/core/src/tradeoffs/summary.ts`: `buildSummary`.
- `src/ui/tradeoffCopy.ts`: exact strings. `src/ui/TradeoffsView.tsx`, `AddTradeoff.tsx`, `SupportCard.tsx`, `TradeoffSummary.tsx`.
- Modify: `packages/core/src/domain/types.ts`, `storage/profileStore.ts`, `index.ts`, `src/App.tsx`, `src/ui/views.ts`, `src/ui/Menu.tsx`, `AGENTS.md`, `docs/FEATURES.md`.

---

### Task 1: Core model, sanitiser and week maths

**Files:**
- Create: `packages/core/src/tradeoffs/types.ts`, `categories.ts`, `entries.ts`
- Modify: `packages/core/src/domain/types.ts` (add `tradeoffs?: TradeoffEntry[]` to `Profile`), `packages/core/src/storage/profileStore.ts` (sanitise like `culturalMeals`: absent when empty), `packages/core/src/index.ts` (export the module)
- Test: `packages/core/src/tradeoffs/entries.test.ts`, `packages/core/src/storage/profileStore.test.ts`

**Interfaces:**
- Produces:
  - `export const TRADEOFF_CATEGORIES = ['self-treat','child-want','meal-skipped','child-meal','cheaper-food','bill-delayed','borrowed','health-skipped','cut-back','other'] as const; export type TradeoffCategory`
  - `export interface TradeoffEntry { id: string; at: string; category: TradeoffCategory; note?: string }`
  - `export const MAX_TRADEOFFS = 150, MAX_NOTE = 140, TRADEOFF_RETENTION_WEEKS = 8`
  - `export type SupportTier = 'none' | 'food' | 'food+child' | 'money' | 'health'`; `export const TRADEOFF_LABELS: Record<TradeoffCategory, string>`; `export const TRADEOFF_TIER: Record<TradeoffCategory, SupportTier>` (labels and tiers exactly as in the spec table)
  - `isTradeoffEntry(x: unknown): x is TradeoffEntry`
  - `addTradeoff(list: TradeoffEntry[] | undefined, entry: TradeoffEntry, now: Date): TradeoffEntry[]`
  - `removeTradeoff(list, id): { entries: TradeoffEntry[]; removed?: TradeoffEntry }`
  - `restoreTradeoff(list, entry): TradeoffEntry[]`
  - `sanitizeTradeoffs(list: unknown[], now?: Date): TradeoffEntry[]`
  - `tradeoffWeeks(entries: TradeoffEntry[] | undefined, now: Date): { thisWeek: TradeoffEntry[]; lastWeek: TradeoffEntry[]; earlier: { start: Date; entries: TradeoffEntry[] }[] }` (newest first; earlier weeks newest first, empty weeks omitted)
  - `tradeoffLabel(e: TradeoffEntry): string` ("Something else: <note>" for `other` with a note, else the category label)
- Consumes: `isIsoDateTime`, `capNewestByAt` (`budget/entries.ts`), `weekBounds`, `addLocalDays`, `weekStartMonday`, `isInWeek`, `DAYS_PER_WEEK` (`budget/week.ts`), `cleanText` (`food/sanitize.ts`; export-only change if needed).

- [ ] **Step 1: Write the failing tests** in `entries.test.ts` (use `new Date(2026, 9, 29, 12)` as `now`): `rejects an unknown category`, `drops an entry with unknown category on load but keeps the rest`, `note is cleaned: trims, NFC, strips zero-width and control chars, collapses spaces`, `a 141 character note is refused by addTradeoff and its note is dropped (entry kept) by sanitizeTradeoffs`, `blank note is omitted`, `first id wins`, `caps at 150 keeping newest`, `prunes older than 8 weeks only when now is given`, `refuses a future entry and one before last Monday`, `restoreTradeoff skips the date check but not validity`, `Sunday 23:59 counts in that week and Monday 00:01 in the next`, `a week containing 4 Oct 2026 (DST start) groups all seven days`, `tradeoffWeeks omits empty weeks and orders newest first`, `tradeoffLabel for other with and without note`, `emoji and RTL notes pass through unchanged`. In `profileStore.test.ts`: `tradeoffs: 'junk'` loads as absent; an empty array loads as absent; valid entries survive a save/load.
- [ ] **Step 2: Run** `npx vitest run packages/core/src/tradeoffs packages/core/src/storage` and confirm the new tests FAIL (missing module).
- [ ] **Step 3: Implement** the files above, following `food/meals.ts` line for line (same add window, `cleanMeal`-style copy of known fields only). Add a `platformFree` import check by running the existing test.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`; expected: all pass, including `platformFree.test.ts`.
- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tradeoffs packages/core/src/domain/types.ts packages/core/src/storage/profileStore.ts packages/core/src/storage/profileStore.test.ts packages/core/src/index.ts packages/core/src/food/sanitize.ts
git commit -m "feat: trade-off core model, sanitiser and week maths"
```

---

### Task 2: Logging UI and wiring

**Files:**
- Create: `src/ui/tradeoffCopy.ts`, `src/ui/AddTradeoff.tsx`, `src/ui/TradeoffsView.tsx`
- Modify: `src/ui/views.ts` (`'tradeoffs'`), `src/ui/Menu.tsx` (item "Trade-offs" after "Meals that felt like home"), `src/App.tsx` (generalise `withOptional` key union to include `'tradeoffs'`; prune on load with `sanitizeTradeoffs(entries, now)` as for meals; render the view), `src/ui/views.test.ts`, `src/ui/Menu.test.tsx`
- Test: `src/ui/TradeoffsView.test.tsx`, `src/ui/tradeoffCopy.test.ts`, `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 1 exports; `PillButton`, `Disclosure`, `PageHeader`, `FocusHeading`, `defaultId`, `localDay` (`AddSpend`), `dayLabel` (`foodCopy`), `INPUT_CLASS`/`FIELD_EDGE`.
- Produces:
  - `TradeoffsView(props: { entries: TradeoffEntry[] | undefined; now: Date; onChange: (next: TradeoffEntry[]) => void; onOpenBudget: () => void; onOpenSupport: () => void; clock?: () => Date; newId?: () => string })` (`onChange` receives the whole list; `[]` means cleared)
  - `tradeoffCopy.ts`: `countSentence(n: number): string`, `EMPTY_WEEK`, `INTRO`, `DISCLAIMER`, `REFLECTION`, `RETENTION`, `SHARED_DEVICE`, `STAYS_WITH_PROFILE`, `statusAdded(label, dayText)`, `STATUS_REMOVED`, `STATUS_CLEARED` ("Cleared. Undo (this goes when you leave this page)"), `NEED_A_HAND_TITLE`.
  - `TradeoffsView` renders a slot `<SupportSlot category={...}/>`-free in this task: it accepts an optional `renderSupport?: (category: TradeoffCategory, onClose: () => void) => ReactNode` prop that Task 3 fills.

- [ ] **Step 1: Write the failing tests** in `TradeoffsView.test.tsx`: `one h1 "What we went without" and it takes focus`; `empty week shows the empty sentence and never "0"`; `tapping a category saves immediately and announces "Added: <label>, today" in role=status`; `Add a note saves a 140 char note, refuses 141 (field shows the limit, nothing saved)`; `other opens the note field straight away and Skip leaves "Something else"`; `Change day lists today and earlier days of this and last week only`; `count sentence for 1 and 3 matches the Global Constraints exactly; reflection appears only when the week has an entry and is the same text for 1 and 9`; `Remove then Undo restores in order; several removals undo latest first; no timers (advance fake timers 60 s, Undo still there)`; `Clear all my trade-offs calls onChange([]) and Undo restores; button hidden when empty`; `Last week and Earlier are Disclosures listing entries with Remove and no counts in their headings`; `no element has role=alert, no red/amber class, no big numeral element`; `shared-device, retention and stays-with-profile sentences present`; `See my food budget appears only with an entry and calls onOpenBudget`; `a stored entry with an unknown category never reaches the view`. In `tradeoffCopy.test.ts`: `banned words absent` (list and allow-listed lines from the spec's "Wording list"). In `App.test.tsx`: `Menu opens Trade-offs and saving writes only the profile key`.
- [ ] **Step 2: Run** `npx vitest run src/ui/TradeoffsView.test.tsx src/ui/tradeoffCopy.test.ts src/App.test.tsx`; expected FAIL.
- [ ] **Step 3: Implement** `AddTradeoff` (pill group `role="group"` named "Add a trade-off", day picker, note field) and `TradeoffsView` modelled on `MealsView` (undo stack, status region, focus handoff) with no timers; wire `App.tsx` and the Menu.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`; expected all pass.
- [ ] **Step 5: Commit**

```bash
git add src/ui/tradeoffCopy.ts src/ui/tradeoffCopy.test.ts src/ui/AddTradeoff.tsx src/ui/TradeoffsView.tsx src/ui/TradeoffsView.test.tsx src/ui/views.ts src/ui/views.test.ts src/ui/Menu.tsx src/ui/Menu.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: trade-off logging view with undo and week count"
```

---

### Task 3: Safe-messaging support card

**Files:**
- Create: `packages/core/src/tradeoffs/support.ts`, `src/ui/SupportCard.tsx`
- Modify: `src/ui/TradeoffsView.tsx` (use `renderSupport`; add the always-present "Need a hand?" `Disclosure`), `packages/core/src/index.ts`
- Test: `packages/core/src/tradeoffs/support.test.ts`, `src/ui/SupportCard.test.tsx`, `src/ui/TradeoffsView.test.tsx`

**Interfaces:**
- Consumes: `TRADEOFF_TIER`, `SupportTier`, `ExternalLink`, `PillButton`.
- Produces:
  - `export interface Helpline { id: 'lifeline'|'kids-helpline'|'national-debt-helpline'; name: string; display: string; tel: string; hours: string; verifiedOn: '2026-10-29' }`; `export const HELPLINES: Record<Helpline['id'], Helpline>`; `export const FOODBANK_FIND_FOOD = 'https://findfood.foodbank.org.au/'`
  - `supportFor(category: TradeoffCategory): { tier: SupportTier; helplines: Helpline['id'][]; findFood: boolean; foodSupportView: boolean }` (food: findFood+foodSupportView+lifeline; food+child: plus kids-helpline; money and health: national-debt-helpline+lifeline; none: nothing)
  - `SupportCard(props: { category: TradeoffCategory; onOpenSupport: () => void; onClose: () => void })`; renders `null` for tier `none`.

- [ ] **Step 1: Write the failing tests:** core: `HELPLINES digits are exactly 13 11 14, 1800 55 1800, 1800 007 007 with tel hrefs 131114, 1800551800, 1800007007`; `supportFor per tier` for all ten categories; `no 1800RESPECT, Orange Door, Parentline or Safe Steps anywhere in support.ts and SupportCard.tsx` (source grep test). UI: `appears under the status line for meal-skipped, child-meal, bill-delayed, borrowed, health-skipped and not for the other five`; `food tiers show the Find Food link (https, rel noopener) and a button that calls onOpenSupport`; `Kids Helpline line only for child-meal`; `card is not role=alert or dialog, has an h2 "If it would help", Close removes it and focus returns to the status line`; `exact body sentence`; `showing and closing the card writes nothing to storage and makes no fetch`; `Need a hand? disclosure is on the view with an empty week and has Find Food, Food support, National Debt Helpline, Lifeline`; `banned words grep passes for the card copy`.
- [ ] **Step 2: Run** `npx vitest run packages/core/src/tradeoffs/support.test.ts src/ui/SupportCard.test.tsx`; expected FAIL.
- [ ] **Step 3: Implement** the data, `supportFor`, the card and the disclosure; copy lives in `tradeoffCopy.ts` using the exact lines in the spec ("Safe messaging").
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`; expected all pass.
- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tradeoffs/support.ts packages/core/src/tradeoffs/support.test.ts packages/core/src/index.ts src/ui/SupportCard.tsx src/ui/SupportCard.test.tsx src/ui/TradeoffsView.tsx src/ui/TradeoffsView.test.tsx src/ui/tradeoffCopy.ts
git commit -m "feat: calm support card and help disclosure for trade-offs"
```

---

### Task 4: Optional "Show someone I trust" summary

**Files:**
- Create: `packages/core/src/tradeoffs/summary.ts`, `src/ui/TradeoffSummary.tsx`
- Modify: `src/ui/TradeoffsView.tsx` (bottom text button "Show someone I trust"), `src/index.css` (print rules: hide chrome, show only the summary), `packages/core/src/index.ts`
- Test: `packages/core/src/tradeoffs/summary.test.ts`, `src/ui/TradeoffSummary.test.tsx`

**Interfaces:**
- Consumes: `tradeoffWeeks`, `TRADEOFF_LABELS`, `TradeoffEntry`.
- Produces:
  - `export interface SummaryOptions { categories: TradeoffCategory[]; includeNotes: boolean; weeks: 4 | 8 }`
  - `export interface SummaryWeek { start: Date; rows: { category: TradeoffCategory; count: number; notes: string[] }[] }`
  - `buildSummary(entries: TradeoffEntry[] | undefined, now: Date, options: SummaryOptions): SummaryWeek[]` (only chosen categories; `notes` empty unless `includeNotes`; empty weeks omitted; no totals)
  - `TradeoffSummary(props: { entries: TradeoffEntry[] | undefined; now: Date; onClose: () => void; print?: () => void })` (`print` defaults to `window.print`).

- [ ] **Step 1: Write the failing tests:** core: `only ticked categories`, `notes empty by default and only for included categories when ticked`, `4 weeks vs 8 weeks windows`, `no total, name or score field exists on the result` (type and key check). UI: `explanation sentence and printer warning shown before anything else`; `child-want and child-meal unticked by default, others ticked, Include my notes unticked, period 4 weeks`; `unticking removes the category from the page`; `ticking notes shows notes only for included categories`; `Print calls the injected print once and nothing else (no fetch, no navigator.share, no clipboard, no storage write, document.title unchanged)`; `Close discards the selections (reopen shows defaults)`; `footer line "A personal record kept by the person. Not a validated measure."`; `no profile name, suburb or score appears`.
- [ ] **Step 2: Run** the two test files; expected FAIL.
- [ ] **Step 3: Implement** `buildSummary` and the panel (real labelled checkboxes, period as two `aria-pressed` pills, print button); print CSS uses a `print:` variant on chrome and a single `data-print-root`-free class (no `data-` carrying content).
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`; expected all pass.
- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tradeoffs/summary.ts packages/core/src/tradeoffs/summary.test.ts packages/core/src/index.ts src/ui/TradeoffSummary.tsx src/ui/TradeoffSummary.test.tsx src/ui/TradeoffsView.tsx src/index.css
git commit -m "feat: opt-in printable trade-off summary"
```

(If the user cuts the summary, skip this task and remove nothing else.)

---

### Task 5: Visuals and Playwright check

**Files:**
- Modify: `src/ui/TradeoffsView.tsx`, `AddTradeoff.tsx`, `SupportCard.tsx` (spacing and calm layout only)
- Test: manual screenshots saved under the scratchpad (not committed)

- [ ] **Step 1: Invoke the `design-taste-frontend` skill (app screens)**, then run `npm run dev` and, with Playwright, screenshot the view at 320, 390, 768 and 1280 widths in all four themes for: empty week, one entry, a full week (ten entries), the support card open, "Need a hand?" open, Last week open, the summary panel, and a 320px view with a 140 character note.
- [ ] **Step 2: Check:** no horizontal scroll, nothing clipped, no number visually dominant, no colour that reads as alarm, focus ring visible on every pill, touch targets >= 44px (evaluate `getBoundingClientRect`), reduced motion (`emulateMedia`) leaves no animation.
- [ ] **Step 3: Fix** any finding in the three components with a failing test first where the fix is behaviour (for layout-only fixes, re-screenshot).
- [ ] **Step 4: Run** `node scripts/contrast.mjs`, `npm test`; expected all pass.
- [ ] **Step 5: Commit**

```bash
git add src/ui/TradeoffsView.tsx src/ui/AddTradeoff.tsx src/ui/SupportCard.tsx
git commit -m "style: trade-offs view layout across widths and themes"
```

---

### Task 6: Privacy tests, docs and gates

**Files:**
- Create: `src/ui/tradeoffPrivacy.test.tsx`
- Modify: `AGENTS.md` (Layout line for `packages/core/src/tradeoffs`, Product flow bullet "Trade-offs", Privacy rules bullet), `docs/FEATURES.md` (a short entry), `src/ui/foodPrivacy.test.tsx` only if its file list needs the new files

**Interfaces:**
- Consumes: everything above; the detector helpers pattern in `foodPrivacy.test.tsx`.

- [ ] **Step 1: Write `tradeoffPrivacy.test.tsx`** implementing spec tests (a) to (h): names `shareText and week share hold no trade-off string for a full profile`; `score, band and budget output identical with and without tradeoffs`; `full flow with HTTP services makes no request containing a note, category id or label`; `only the profile key changes (localStorage keys, sessionStorage, cookies, IndexedDB)`; `no navigator.share, clipboard, sendBeacon, Notification or history.pushState calls`; `no console.* in packages/core/src/tradeoffs and the trade-off ui files (grep)`; `Clear removes the key from stored JSON; deleting the profile removes it; Start from my current data carries it`; `no trade-off text in document.title, location or any data- attribute`; `support card and summary write nothing and fetch nothing`. Include a proof-of-life test per detector (each detector fails when fed a planted leak).
- [ ] **Step 2: Run** `npx vitest run src/ui/tradeoffPrivacy.test.tsx`; expected FAIL only where code does not yet comply (fix code, not the test).
- [ ] **Step 3: Update docs:** AGENTS.md (layout, flow, privacy: key, retention 8 weeks, never shared, summary opt-in), FEATURES.md entry, and note the open practitioner-review decision.
- [ ] **Step 4: Run all gates:** `npm test`, `npm run typecheck`, `npm run build`, `node scripts/contrast.mjs`, `npm run format`; expected all green and `git status` shows only intended files.
- [ ] **Step 5: Commit**

```bash
git add src/ui/tradeoffPrivacy.test.tsx AGENTS.md docs/FEATURES.md
git commit -m "docs: trade-off counter privacy tests and project docs"
```

---

## Self-review

- Spec coverage: categories and wording (Task 1, 2), two-tap logging, undo, clear-all, week sentence, last weeks (Task 2), safe messaging and help disclosure (Task 3), summary (Task 4), visuals (Task 5), retention, caps, privacy plan, docs (Tasks 1, 6). Reassurance line ("Going without to get by is common.") lives in the "Need a hand?" disclosure in Task 3 copy.
- Types: `TradeoffEntry`, `TradeoffCategory`, `SupportTier`, `HELPLINES`, `SummaryOptions` are defined once and reused unchanged.
- Proportion: tasks carry signatures, test names and exact values only.
