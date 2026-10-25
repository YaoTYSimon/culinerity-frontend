# Welcome Page, Four Themes and Plate Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web UI with the "plate" design: a first-time welcome page, four selectable colour themes, one-question check-in, the number screen, restyled swaps, food support, friendly states and a shareable "my week" card.

**Architecture:** Pure logic (trend, week totals, band copy, theme ids and store interface, extended profile sanitiser) lives in `packages/core` with tests. The web app gets a token/theme layer (CSS variables selected by `data-theme`), small reusable components (`Plate`, `RoundPhoto`, `PillButton`, `ThemeDots`), and screens that depend on services via `useServices`. Navigation stays state-based.

**Tech Stack:** React 19, Vite, Tailwind v4 (`@theme` + `[data-theme]` overrides), TypeScript, Vitest + Testing Library, `@fontsource/schibsted-grotesk`.

**Spec:** `docs/superpowers/specs/2026-10-26-welcome-themes-plate-redesign-design.md` (read it whole, including "Calls made by the designer"). **Mockups (visual authority):** `docs/superpowers/design/mockups/welcome-themes.html` and `six-screens.html` (open them; image paths are relative). The taste skill is at `~/.agents/skills/design-taste-frontend` (read `SKILL.md` house rules, `references/app-screens.md`, `references/tells.md`).

## Global Constraints

- Score 0–100, **100 = secure, 0 = critical**, labelled wherever a score appears. The shared text never contains the score, answers, finances, suburb or name.
- House style (from the spec): one family Schibsted Grotesk (400/600/800, self-hosted); fully round shapes only (pill buttons, circular photos, circular dial); no rounded cards, chips/badges, hairlines, dashed rules, shadows at rest, gradients, emoji, small uppercase labels, monospace or numbered markers; flat colour and tone steps; five type sizes max; left-aligned with one centred moment (the plate).
- Four themes with these tokens (bg/surface/ink/muted/accent/accent-ink): tobacco `#472913/#5a3720/#e4e0cf/#cdbfa8/#525e1b/#e4e0cf` (default), sand `#ddd6c6/#d2cab8/#2a2a26/#55544a/#4f6238/#f3f0e6`, walnut `#2b2216/#3d3123/#e4e2da/#cbbfae/#bda38b/#2b2216`, cream `#f6efe6/#e6d8c9/#3a1f1a/#5b4540/#8f1d37/#ffffff`. Every text/background pair ≥ 4.5:1 and every control/background pair ≥ 3:1 in every theme: measure; if a pair fails, adjust that token minimally and record it.
- No third-party runtime requests (fonts/photos bundled); no location request; privacy: all personal data stays in localStorage on the device.
- Accessibility: one h1 per screen, landmarks, keyboard operable, accessible names, `focus-visible` ring (shared `focus-ring` utility), `aria-live` for status, 44px targets, `prefers-reduced-motion` respected; dial is `role="img"` with text alternative.
- Phone-first at 390px, a centred column (max ~520px) on desktop, no horizontal scroll at 320–1280px.
- Existing tests keep their intent (never weaken a test; port intent-level tests when markup changes). Every task ends green: `npm test`, `npx tsc --noEmit` (root, packages/core, server), `npm run build`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01CVJsJBKSnSRKS1F3CWccnQ`.

## Review Focus

- First launch with corrupt/blocked localStorage → welcome page renders, swap search still reachable, nothing throws.
- Theme value unknown/corrupt/missing → falls back to `tobacco`; theme applied before first paint (no flash).
- Check-in: no score saved until every question is answered; Back at question 1 is inert; skip works at any point; `scoreHistory` never exceeds 12 entries.
- Trend with 0 or 1 check-ins shows no trend line (no "Up 0", no NaN).
- Week: a swap with no/zero/negative/NaN saving cannot be added; entries older than 7 days are excluded from totals; clearing the week empties the card; share text never includes score or finances and truncates at 8 items.
- Score at the band edges (0, 19, 20, 39, 40, 59, 60, 79, 80, 100) picks the right headline and nudge; support appears below 40 only.
- Backend unreachable → friendly message + Try again, never a blank page; unknown craving → no-match state with suggestions.

---

### Task 1: Core logic (profile extensions, trend, week, band copy, themes)

**Files:**
- Modify: `packages/core/src/domain/types.ts`, `packages/core/src/storage/profileStore.ts` (sanitiser), `packages/core/src/index.ts`
- Create: `packages/core/src/domain/history.ts`, `packages/core/src/domain/week.ts`, `packages/core/src/domain/bands.ts`, `packages/core/src/theme/theme.ts`
- Test: `packages/core/src/domain/history.test.ts`, `week.test.ts`, `bands.test.ts`, `packages/core/src/theme/theme.test.ts`, extend `packages/core/src/storage/profileStore.test.ts`

**Interfaces:**
- Produces:
  - `Profile` gains `welcomeSeen?: boolean`, `scoreHistory?: ScoreEntry[]`, `weekSwaps?: WeekSwap[]`; `interface ScoreEntry { score: number; at: string }`; `interface WeekSwap { itemId: string; name: string; saving: Aud; at: string }`. `sanitizeProfile` keeps only well-typed fields (finite scores 0–100; ISO-parseable `at`; caps 12 history / 50 week; drops unknown keys; never throws).
  - `appendScore(history: ScoreEntry[] | undefined, score: number, at: string): ScoreEntry[]` (newest last, cap 12); `trendSummary(history: ScoreEntry[] | undefined): { delta: number; scores: number[] } | null` (null when fewer than 2 entries; `delta` = last − first).
  - `addWeekSwap(week: WeekSwap[] | undefined, swap: Omit<WeekSwap,'at'>, now: string): WeekSwap[]` (rejects non-finite or ≤0 saving by returning the list unchanged; cap 50); `removeOneWeekSwap(week, itemId): WeekSwap[]` (removes the newest entry of that item); `weekSummary(week, now: string): { total: Aud; items: { itemId: string; name: string; count: number; saving: Aud }[] }` (rolling 7 days, grouped by `itemId`, `total` rounded to cents); `shareText(summary: ReturnType<typeof weekSummary>): string` (≤8 grouped items then "+N more", plus total, plus "Made with Culinerity"; no score or finances).
  - `bandHeadline(score: number): string`, `rankNudge(score: number): 'cheapest' | 'balanced' | 'healthiest'` (<40 cheapest, 40–59 balanced, ≥60 healthiest), `SUPPORT_BELOW = 40` exported.
  - `type ThemeId = 'tobacco' | 'sand' | 'walnut' | 'cream'`; `THEME_IDS`, `DEFAULT_THEME = 'tobacco'`, `THEME_NAMES: Record<ThemeId,string>`; `parseTheme(v: unknown): ThemeId` (fallback default); `interface ThemeStore { load(): ThemeId; save(id: ThemeId): void }`; `class InMemoryThemeStore implements ThemeStore`.
- Consumes: existing `Profile`, `scoreBand`, `Aud`.

- [ ] **Step 1: Write failing tests** (named after each function) with these assertions: `appendScore` caps at 12 and keeps order; `trendSummary` null for `undefined`, `[]` and one entry, `{delta: 9, scores: [33,35,36,40,42]}` for that history; `addWeekSwap` ignores `0`, `-1`, `NaN`, `Infinity`; `weekSummary` groups two taps of one item as `count: 2` and excludes an entry 8 days old but includes one 6 days old; `shareText` for 10 items ends with "+2 more" and never contains "score"; `bandHeadline`/`rankNudge` at 0, 19, 20, 39, 40, 59, 60, 79, 80, 100; `parseTheme('purple')`, `parseTheme(undefined)` → `'tobacco'`; `sanitizeProfile` drops a `weekSwaps` entry with a string `saving` and clamps nothing silently (invalid entries are removed).
- [ ] **Step 2:** `npm test -w @culinerity/core` → FAIL.
- [ ] **Step 3:** Implement the functions in the files above; export everything from `index.ts`.
- [ ] **Step 4:** `npm test` all green, `npx tsc --noEmit` clean, platform-free guard still passes (no DOM/Node APIs in core).
- [ ] **Step 5:** Commit `feat(core): history, week, band copy and theme logic`.

### Task 2: Theme system, fonts and base components

**Files:**
- Modify: `package.json` (add `@fontsource/schibsted-grotesk`), `src/index.css`, `src/main.tsx`, `index.html` (no-flash inline script + `data-theme` default)
- Create: `src/storage/localThemeStore.ts`, `src/theme/ThemeProvider.tsx`, `src/ui/ThemeDots.tsx`, `src/ui/Plate.tsx`, `src/ui/RoundPhoto.tsx`, `src/ui/PillButton.tsx`, `scripts/contrast.mjs`
- Test: `src/storage/localThemeStore.test.ts`, `src/theme/ThemeProvider.test.tsx`, `src/ui/ThemeDots.test.tsx`, `src/ui/Plate.test.tsx`, `src/ui/PillButton.test.tsx`, `scripts/contrast.test.ts` (or a vitest that parses the CSS)

**Interfaces:**
- Consumes: `ThemeId`, `ThemeStore`, `THEME_IDS`, `THEME_NAMES`, `parseTheme` (Task 1).
- Produces: `class LocalThemeStore implements ThemeStore` (key `culinerity.theme.v1`, never throws); `ThemeProvider({store?, children})` + `useTheme(): { theme: ThemeId; setTheme(id: ThemeId): void }` (sets `document.documentElement.dataset.theme`); `<ThemeDots />` (four round buttons, each with the theme name as accessible name, `aria-pressed`, visible ring on the selected one); `<Plate score={number | null} band?={string} animate?={boolean} />` (`role="img"` with the text alternative from the spec; `null` shows "?" and "out of 100"; rim fill animates once, no animation under reduced motion); `<RoundPhoto src? itemId? size alt="" />` (circular `img`, falls back to the drawn illustration); `<PillButton variant="primary|surface|text" … />` (44px min height, `focus-ring`).
- CSS: tokens as CSS variables under `:root` (tobacco) and `[data-theme="sand|walnut|cream"]`, mapped into Tailwind v4 `@theme` colour names (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `bg-accent`, `text-accent-ink`); remove the old hero/fruit/plate tokens and tonal styles; fonts imported via `@fontsource/schibsted-grotesk/{400,600,800}.css`; `font-family` token set; the `focus-ring` utility uses `ink`.

- [ ] **Step 1: Tests:** `LocalThemeStore` round-trips, returns `tobacco` for corrupt/unknown values, never throws when `localStorage` throws; `ThemeProvider` applies `data-theme` on mount and on `setTheme` and persists; `ThemeDots` renders four buttons named by `THEME_NAMES`, exactly one `aria-pressed="true"`, clicking changes the theme; `Plate` has `role="img"` and the exact alternative text "Food security score 42 out of 100, Strained; 100 is secure, 0 is critical" for `score={42}`, shows "?" for `null`; `PillButton` is keyboard-activatable. A contrast test computes WCAG ratios for each theme's pairs from the CSS tokens and asserts ≥ 4.5 (text) and ≥ 3 (controls).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; run `node scripts/contrast.mjs` and adjust any failing token minimally (record changes in the commit body). **Step 4:** Tests, tsc, build green; the existing app still renders (old screens may look different until later tasks, which is expected; do not break their tests).
- [ ] **Step 5:** Commit `feat: theme system, Schibsted Grotesk and base components`.

### Task 3: Photos (three downloads) and credits

**Files:**
- Create: `src/assets/photos/welcome-curry.jpg`, `welcome-soup.jpg`, `welcome-pancakes.jpg`; modify `src/assets/photos/credits.ts`, `src/assets/photos/index.ts`; test `src/assets/photos/photos.test.ts`

**Interfaces:** Produces `photoUrl(name: 'welcome-curry' | 'welcome-soup' | 'welcome-pancakes'): string`; credits entries (13 total) listed in the footer disclosure.

- [ ] **Step 1:** Download exactly `commons:61666606`, `commons:61661548`, `commons:58859727` one at a time with `node ~/.agents/skills/design-taste-frontend/scripts/assets.mjs --get commons:<id> --to <new empty dir outside the repo> --width 1600`; verify with `file` and that title/licence match (Red Curry (Unsplash), Autumn Soup (Unsplash), Breakfast table with pancakes (Unsplash); CC0). On any mismatch or failure STOP that item, report, and use the existing drawn illustrations as the fallback; never substitute other photos.
- [ ] **Step 2:** `sips` to 600px (square-friendly crop for circles; curry crop keeps the bowl; soup centred; pancakes centred), JPEG 40–110 KB, metadata stripped; look at each result with the Read tool.
- [ ] **Step 3: Tests:** `photoUrl` resolves for the three names; credits count and each entry has title, creator, CC0, licence URL and Commons URL; the footer shows "Photo credits (13)".
- [ ] **Step 4:** Commit `feat: add three home-cooked welcome photos`.

### Task 4: App shell, welcome page and first-launch flow

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/main.tsx`
- Create: `src/ui/Header.tsx`, `src/ui/Menu.tsx`, `src/ui/Welcome.tsx`, `src/ui/ViewContext.ts` (or props) ; delete `src/ui/Landing.tsx`, `src/ui/HeroStillLife.tsx` and their tests once replaced
- Test: `src/ui/Welcome.test.tsx`, `src/ui/Menu.test.tsx`, updated `src/App.test.tsx`

**Interfaces:** `type View = 'swaps' | 'number' | 'checkin' | 'support' | 'week' | 'welcome'`; `App` holds `view`; Home = `number` when `profile.score` exists else `swaps`. `Welcome({ onFindNumber, onSkip })` per spec (headline, supporting sentence, empty `Plate`, three `RoundPhoto`s, primary "Find my number", text button "Skip to cheaper swaps", `ThemeDots` in the header). First launch (`profile.welcomeSeen` not true) shows `Welcome`; either action sets `welcomeSeen: true` via `services.profiles`. `Header` shows the wordmark, `ThemeDots` and a "Menu" button; `Menu` lists Home, Swaps, Check-in, Food support, My week, Welcome (opening Welcome does not reset `welcomeSeen`).

- [ ] **Step 1: Tests:** first launch (empty store) shows the welcome h1 "How much is food on your mind?", the exact sentence containing "100 is secure, 0 is critical", the "Find my number" button and "Skip to cheaper swaps"; "Skip" shows the swap search and sets `welcomeSeen`; second launch (`welcomeSeen: true`) skips welcome; corrupt stored JSON still shows welcome; "Find my number" goes to the check-in; Menu items navigate and Welcome is reopenable; with a saved score, Home is the number view (stub until Task 6) and without it, the swap search.
- [ ] **Step 2:** FAIL; **Step 3:** implement; port the intent of the old `App.test.tsx`/`Landing` tests; **Step 4:** all green; **Step 5:** Commit `feat: welcome page, header, menu and first-launch flow`.

### Task 5: Check-in, one question per screen

**Files:** Modify `src/ui/Questionnaire.tsx`, `src/ui/Questionnaire.test.tsx`

**Interfaces:** Same props as today: `Questionnaire({ onComplete(score: number), onSkip() })`. Internally steps through `FIES_QUESTIONS` (Yes/No pills) then each domain's items with `FREQUENCIES` pills; progress dots and "N of M"; Back; "Skip for now"; "Answers stay on this phone"; the plate photo (`welcome-soup`) as a round image bleeding off the right edge on phones. On finish it calls `computeScore`; the parent (Task 6/4) appends to `scoreHistory` via `appendScore` and sets `score`/`scoreTakenAt`.

- [ ] **Step 1: Tests:** answering all FIES "No" and all domain answers "Never" calls `onComplete(100)`; all worst calls `onComplete(0)`; Back at question 1 is inert; Back after answering shows the previous question with its answer selected; Skip at any point calls `onSkip` and never `onComplete`; a question is announced with `aria-live`; the progress text is "3 of N" at the third question; `onComplete` is not called before the last question is answered.
- [ ] **Step 2:** FAIL. **Step 3:** implement (keep scoring in core). **Step 4:** green. **Step 5:** Commit `feat: one-question-at-a-time check-in`.

### Task 6: The number screen (home dashboard)

**Files:** Create `src/ui/NumberScreen.tsx`, test `src/ui/NumberScreen.test.tsx`; modify `src/App.tsx` (wire home, history append on complete)

**Interfaces:** `NumberScreen({ profile, onSeeSwaps, onCheckIn })`: headline `bandHeadline(score)`; `Plate score band animate`; "100 is secure, 0 is critical."; trend line from `trendSummary` ("Up 9 since your first check-in: 33, 35, 36, 40, 42" / "Down N …" when negative / nothing when null); nudge text from `rankNudge`; primary "See cheaper swaps" (label "See healthier swaps" when nudge is `healthiest`); text button "Check in again"; the food-support section appears below `SUPPORT_BELOW` (links to the support view); "Your budget" disclosure containing `FinanceForm`. Completing the check-in in `App` calls `appendScore` and sets `score` and `scoreTakenAt`.

- [ ] **Step 1: Tests:** score 42 shows "Strained", the headline for Strained and the exact plate alternative text; one history entry shows no trend; history `[33,35,36,40,42]` shows "Up 9 since your first check-in: 33, 35, 36, 40, 42"; decreasing history shows "Down"; support link visible at 39 and absent at 40 and 80; nudge texts at 39/40/59/60; "Check in again" opens the check-in; the budget disclosure opens and saves through `profiles`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** green. **Step 5:** Commit `feat: number screen with trend and nudge`.

### Task 7: Swaps (search, rows, add to my week)

**Files:** Modify `src/ui/CravingSearch.tsx`, `src/ui/SwapResults.tsx`, `src/ui/CravingPicture.tsx`, tests `src/ui/swaps.test.tsx`, `src/ui/CravingPicture.test.tsx`; delete `src/ui/ScoreSummary.tsx` when unused

**Interfaces:** `CravingSearch({ profile, onAddToWeek(swap: { itemId: string; name: string; saving: number }) })` keeps its input, "/" shortcut, popular cravings (round photos with names, 2 columns at 390px, up to 5 on desktop), loading skeleton, errors and no-match state (pill-button suggestions). `SwapResults` rows per the spec: `RoundPhoto`, name, "store · per serve", "Saves $X" as plain text (hidden when no positive saving), price on the right (or "Price unavailable"), relative health label as plain text, a round "Add to my week" button only when saving > 0, the sample-data note once per list. `App` persists the week via `addWeekSwap`.

- [ ] **Step 1: Tests (port + new):** existing swap behaviour tests keep their intent (blank input shows only popular cravings; no match shows suggestions; unpriced shows "Price unavailable" and never "$0"; rejecting `getSwaps` shows the error alert; a stale slower search does not overwrite a newer one; `/` focuses the search only outside inputs); new: "Saves $4.30" is plain text (not in a badge element with a background class); the Add button is absent for an unpriced swap and for saving ≤ 0; tapping Add calls `onAddToWeek` once with the exact `itemId`, `name` and saving; the button's accessible name includes the swap name.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** green. **Step 5:** Commit `feat: plate-style swap list and add to my week`.

### Task 8: Food support and friendly states

**Files:** Modify `src/ui/SupportPanel.tsx`, `src/services/ServicesLoader.tsx`, `src/ui/CravingSearch.tsx` (states), `packages/core/src/sources/mock/data.ts` (rewrite support `notes` to carry times and conditions), tests `src/ui/SupportPanel.test.tsx`, `src/services/ServicesLoader.test.tsx`, mock tests

**Interfaces:** `SupportPanel({ suburb? })` renders: h1 "Free food near you.", a round photo (`welcome-pancakes`), one plain row per place (name; suburb; `notes`), a "Directions" pill per row linking to `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + suburb)}` with `target="_blank" rel="noopener noreferrer"` and accessible name "Directions to <name>", the "Sample data" note, "Culinerity is not medical advice.", and "Call ahead to check times."; loading = round skeleton shapes under `motion-safe`; failure = existing friendly alert styled in the new system. Do not claim anyone is "not asked for proof".

- [ ] **Step 1: Tests:** every place row has a Directions link with the exact encoded URL and `rel`; stale-list handling and failure states keep their existing assertions; the exact notes include the Monash pantry's "registration" condition; the text "proof" never appears; backend-unreachable shows "We can't reach" + "Try again" and Retry recovers (port the existing tests).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** green. **Step 5:** Commit `feat: food support and friendly states in the plate style`.

### Task 9: My week and the share card

**Files:** Create `src/ui/WeekCard.tsx`, test `src/ui/WeekCard.test.tsx`; modify `src/App.tsx`

**Interfaces:** `WeekCard({ week, now, onRemoveOne(itemId), onClear })`: round soup photo, h1 "I saved $N on food this week." (`N` from `weekSummary`), grouped lines ("Falafel wrap ×2 … $9.80"), per-item "Remove one", "Clear week", a "Share" button that calls `navigator.share({ text: shareText(...) })` when available else copies the text to the clipboard and announces "Copied" (`aria-live`), and the line "Made with Culinerity. Savings only: no score, no name." Empty week shows a friendly empty state with a button to the swaps.

- [ ] **Step 1: Tests:** summary with two taps of one item shows "×2" and the right total; an 8-day-old entry is excluded; "Remove one" decrements and removes the line at zero; Clear empties; Share uses `navigator.share` with text that contains no score or finances and falls back to clipboard when `share` is undefined; empty state button navigates to swaps.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** green. **Step 5:** Commit `feat: my week card with sharing`.

### Task 10: Clean-up and verification

**Files:** remove dead components/tokens/tests; update `README.md`, `AGENTS.md`

- [ ] **Step 1:** Delete anything unused (old landing/hero/score summary/tonal styles, unused tokens and illustrations not used as fallbacks); update README/AGENTS (themes, welcome flow, "My week", the plate design rules, how to add a theme). `npm test`, `npx tsc --noEmit` (all three projects), `npm run build`.
- [ ] **Step 2:** With Playwright (load the tools via ToolSearch), start `npm run dev` and screenshot at 390, 360 and 1280 wide: welcome (all four themes by clicking the dots), check-in question, number screen (score 42 and a low score <40 showing support), swaps results, food support, friendly states (use a stubbed backend-down flag), my week card; verify no horizontal overflow (`documentElement.scrollWidth === innerWidth`) at 320/360/390/768/1280, no console errors, the dial animates once and not under reduced motion (emulate `prefers-reduced-motion`). Save screenshots under `.superpowers/` (ignored).
- [ ] **Step 3:** Run the taste skill gates: `node ~/.agents/skills/design-taste-frontend/scripts/lint.mjs src` and `inspect.mjs --app` against a production build (`npm run build && npx vite preview`); fix every FAIL; report remaining WARNs with reasons.
- [ ] **Step 4:** Commit `chore: remove old UI and document the plate design`.
