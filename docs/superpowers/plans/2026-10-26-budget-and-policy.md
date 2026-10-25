# Budget Tracker and Policy Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly food budget tracker and a "Data and policy" page, both in the plate design, sharing one sourced, cited dataset with explicit verification labels and no invented numbers.

**Architecture:** A generated, typed dataset in `packages/core/src/benchmarks/generated/` (built from the research JSON by a script, with a staleness test) is exposed through a `BenchmarkSource` interface. Pure spending/week/pace logic lives in `packages/core` with tests (TZ pinned to `Australia/Melbourne`). Two new views (`budget`, `policy`) are added to the state-based navigation.

**Tech Stack:** React 19, Vite, Tailwind v4, TypeScript, Vitest + Testing Library. No chart library (flat SVG/CSS bars and plates).

**Specs:** `docs/superpowers/specs/2026-10-26-budget-tracker-design.md` and `docs/superpowers/specs/2026-10-26-policy-dashboard-design.md` (read both whole, including each "Builder-check rulings"; the policy document's rulings 1–8 define the shared dataset rules). Data: `docs/superpowers/research/2026-10-26-food-security-data.json` and `…-sources.md`. Design system: `docs/superpowers/specs/2026-10-26-welcome-themes-plate-redesign-design.md`, mockups in `docs/superpowers/design/mockups/`, taste skill `~/.agents/skills/design-taste-frontend` (house rules).

## Global Constraints

- **No invented numbers, ever.** Every displayed figure is read from the dataset (or computed from the person's own entries); no number is typed into a component; no figures are combined across instruments (Foodbank 33% and ABS 13.2% are never on one axis or summed); every figure row shows value (or `display`), what it measures, scope, period, publisher as a link, and a plain "how we read it" label (`primary` "Read from the source itself", `secondary` "Read from a research paper that reports it", `press` "Press report only (not checked against the study)"); `Older data` when `now.year - year > 5` or `dated`; absent data is shown as "Not found in published sources we could read" (use the dataset's `notFound` list).
- Privacy: spending entries and everything personal stay on the device and never reach the share text or backend; no runtime requests for benchmarks (static dataset); external links are user-initiated anchors with `target="_blank" rel="noopener noreferrer"`.
- Tone: kind, specific, non-shaming (never "overspent"/"you failed"); no financial advice; the budget view says "General information, not financial advice."
- Plate design system: Schibsted Grotesk, fully round shapes, flat colour, themes via tokens, no cards/chips/hairlines/shadows/gradients, AA contrast, `focus-visible`, `motion-safe`, 44px targets, one h1 per view, headings in order, landmarks, charts have text alternatives and direct value labels (colour never the only encoding), no horizontal scroll at 320–1280px, phone-first, centred 520px column on desktop; `@media print` for the policy page.
- Existing tests keep their intent (never weaken). Every task ends green: `npm test`, `npx tsc --noEmit` (root, packages/core, server), `npm run build`. Visual tasks use real Playwright MCP screenshots at 390, 320 and 1280 in two themes (fresh browser context: `browser_close` then reopen; the Playwright profile persists localStorage).
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01CVJsJBKSnSRKS1F3CWccnQ`. Stage only your files. Never push or merge.
- Vitest global setup pins `process.env.TZ = 'Australia/Melbourne'` for all suites.

## Review Focus

- Week boundaries: Monday 00:00 local starts a new week; Sunday 23:59 is still the old one; Melbourne DST days (Sunday 5 April and 4 October 2026: 25-/23-hour days) give correct `daysLeft`, elapsed share and weekly totals.
- `parseMoney`: "12", "12.5", "$12.50", "1,200", " 12 " accepted; "", "abc", "-5", "0", "NaN", "1e3", "10001" rejected for spending; blank/invalid budget or income → undefined as today.
- `budgetSummary` with no budget, zero spend, exact budget, over budget; pace on day 1; remaining never negative-displayed as a minus (shows "$12 over").
- Entries cap 200 keeps the newest; invalid stored entries dropped by `sanitizeProfile`; future-dated entries rejected; undo restores the exact entry.
- Dataset integrity: every indicator has a source with an `https://` URL; ids unique; every row the UI renders exists in the dataset; no UI component contains a figure literal; the generated file is up to date (a test regenerates and compares); `Older data` computed from the injected `now`; the two national measures render in separate captioned groups; `press` rows only in the Students section; `p-youth-whole-day` is absent.
- Policy page shows the "not found" list and the full caveats; SEIFA scores shown as whole numbers with the scale and the "not a ranking of Melbourne" caption; no `lga` text.

---

### Task 1: Dataset, generator and BenchmarkSource (shared)

**Files:**
- Modify: `docs/superpowers/research/2026-10-26-food-security-data.json` (apply the policy-spec rulings: add `verification`, `year`, `dated`, `display`, `previous`, `measure`, `notFound`; add the ABS release as a source and set the four ABS indicators to the ABS figures if the page is readable; remove `p-youth-whole-day`; drop `lga`; record every change in the commit body)
- Create: `scripts/build-benchmarks.mjs`, `packages/core/src/benchmarks/types.ts`, `packages/core/src/benchmarks/source.ts`, `packages/core/src/benchmarks/generated/benchmarks.generated.ts`, `docs/superpowers/research/README.md`; modify `packages/core/src/index.ts`, `packages/core/src/platformFree.test.ts` (exclude the `generated/` folder by path), root `package.json` (script `build:benchmarks`)
- Test: `packages/core/src/benchmarks/benchmarks.test.ts`, `scripts/build-benchmarks.test.ts` (or a vitest that runs the generator in memory)

**Interfaces:**
- Produces: `interface Indicator { id: string; group: 'budget' | 'policy'; label: string; value: number | null; display?: string; unit: string; scope: string; period: string; year: number; dated?: boolean; verification: 'primary' | 'secondary' | 'press'; measure?: string; previous?: { value: number; period: string }; note?: string; sourceId: string }`; `interface Source { id; publisher; title; url; published: string; licence: string; accessed: string }`; `interface Area { name: string; seifaIrsdScore: number; seifaDecileVic: number | null; release: string; sourceId: string }`; `interface Intervention { id; label; evidence: 'moderate' | 'weak' | 'mixed' | 'strong'; summary; sourceId; costPerPersonAud: number | null }`; `interface BenchmarkSource { indicators(group?: 'budget' | 'policy'): Indicator[]; areas(): Area[]; interventions(): Intervention[]; sources(): Source[]; caveats(): string[]; notFound(): string[] }`; `class StaticBenchmarkSource implements BenchmarkSource` (reads the generated module); `isOlderData(i: Indicator, now: Date): boolean`; `verificationLabel(v): string` (the three plain labels above).
- The generator reads the JSON, validates it (unique ids, every `sourceId` resolves, https URLs, numbers are numbers) and writes the generated TS; a test regenerates in memory and asserts equality with the committed file.
- Consumes: nothing.

- [ ] **Step 1:** Open the ABS release page (https://www.abs.gov.au/statistics/health/food-and-nutrition/food-insecurity/2023) with a web fetch tool; add it as a source and set the four ABS rows to its exact figures if readable (13.2% households; 23.2% lowest income; 34.0% lone-parent families with dependent children; 27.8% group households), keeping Kent (2025) as the secondary source for the preliminary/comparability notes; otherwise keep the dataset values with the label "as reported by Kent (2025)". Apply every other ruling from the policy spec (items 1, 3–8); set `verification` and `year` for all 37 remaining indicators by reading each indicator's `period`/`note`; mark `dated: true` for `b-vhfb-*`, `b-jobseeker-shortfall`, `b-parenting-shortfall`, `b-hes-*`; add the curated `notFound` list from the research report's "not found" section. Never alter a figure without reading its source.
- [ ] **Step 2: Tests:** the integrity assertions in Review Focus; `isOlderData` with year 2014 and now 2026 → true, 2022 → false, `dated: true` → true; `verificationLabel` exact strings; `StaticBenchmarkSource.indicators('budget')` returns only budget rows; `areas()` scores are numbers; the guard test still passes with `generated/` excluded.
- [ ] **Step 3:** FAIL; implement generator + types + source; **Step 4:** green; **Step 5:** commit `feat(core): sourced benchmark dataset and generator`.

### Task 2: Budget core logic

**Files:** Create `packages/core/src/budget/money.ts`, `week.ts`, `summary.ts`, `entries.ts`; modify `packages/core/src/domain/types.ts` (`SpendEntry`, `Profile.spendEntries`), `packages/core/src/storage/profileStore.ts` (sanitiser), `packages/core/src/index.ts`, vitest global setup (TZ); migrate `src/ui/FinanceForm.tsx` to the core `parseMoney`; tests alongside.

**Interfaces:**
- `interface SpendEntry { id: string; amount: Aud; category: 'groceries' | 'takeaway' | 'market' | 'other'; note?: string; at: string }`.
- `parseMoney(text: string, opts?: { allowZero?: boolean; max?: number }): number | null`.
- `weekStartMonday(now: Date): Date`; `entriesThisWeek(entries: SpendEntry[] | undefined, now: Date): SpendEntry[]`; `weeklyTotals(entries, now, weeks: number): { weekStart: string; total: Aud }[]`.
- `budgetSummary(entries, budget: number | undefined, now: Date): { spent: Aud; remaining: Aud | null; over: Aud; percentSpent: number | null; daysLeft: number; perDayLeft: Aud | null; pace: 'no-budget' | 'on-track' | 'a-bit-fast' | 'over' }` (rules in the budget spec rulings 3: calendar `daysLeft` including today; elapsed share by completed days + minutes since local midnight over minutes in that local day, over 7; `a-bit-fast` when spent share exceeds elapsed share by more than 10 percentage points, never on the first day unless over; `over` when spent > budget; cents rounding).
- `addSpend(entries, entry, now): SpendEntry[]` (rejects non-positive, NaN, > 10,000, future-dated, dated before the previous Monday-week; cap 200 keeping the newest), `removeSpend(entries, id): { entries; removed?: SpendEntry }`, `restoreSpend(entries, entry)`, `savedThisWeek(week: WeekSwap[] | undefined, now: Date): Aud` (Monday week).

- [ ] **Step 1: Tests:** every case in Review Focus with TZ pinned (Monday 00:00 vs Sunday 23:59; DST days 2026-04-05 and 2026-10-04; `daysLeft` Monday = 7, Sunday = 1; pace cases; parseMoney table; sanitiser drops invalid entries and keeps newest 200; undo restores; `savedThisWeek` uses the Monday week and differs from the rolling `weekSummary` on a Tuesday).
- [ ] **Step 2:** FAIL; implement; **Step 4:** all suites green, FinanceForm tests unchanged in intent; **Step 5:** commit `feat(core): budget tracker logic`.

### Task 3: Budget view

**Files:** Create `src/ui/BudgetView.tsx`, `src/ui/AddSpend.tsx`, `src/ui/BenchmarkRows.tsx`; modify `src/ui/views.ts` (`'budget'`), `src/ui/Menu.tsx`, `src/App.tsx`, `src/ui/NumberScreen.tsx` (link from "Your budget"); tests alongside.

**Interfaces:** `BudgetView({ profile, now, onChange(profile) })` per the spec: h1 "This week's food."; a `Plate` showing the share spent (rim fill, centre "$42 left" / "$12 over" / "$63 spent" when no budget, caption "of $120 · 3 days left"); the pace sentence from `budgetSummary`; "About $X a day for the rest of the week" when applicable; a round primary "Add" button opening `AddSpend` (amount via `parseMoney`, optional note ≤ 40 chars, category pill buttons, date defaulting to today, editable within the allowed range); this week's rows with "Remove" and a 6-second "Undo" (aria-live); "Saved with swaps" line from `savedThisWeek` linking to My week; optional income sentence ("You've logged $X of food spending, which is Y% of your weekly income of $Z.") with no comparison to any benchmark; "Past weeks" disclosure with weekly totals; a "How this compares" section using `BenchmarkRows` over the budget indicators (value or `display`, measure, scope, period, publisher link, verification label, "Older data" when `isOlderData(i, now)`), the poverty-line note "These are lines for total income, not food budgets.", the "Not found" note for budget gaps, and "General information, not financial advice."; empty states ("Nothing logged yet this week."); no-budget state asks for a budget (single field, Skip allowed). Menu order: Home, Swaps, Check-in, Budget, Food support, My week, Welcome.

- [ ] **Step 1: Tests:** add → row appears and totals update; invalid amounts show a calm message and nothing is added; remove + undo restores within the window; over-budget message is "$12 over" with the kind sentence (never "overspent"); no-budget state; income sentence appears only with income and never mentions a benchmark; benchmark rows render exactly the dataset values and links (`rel`), "Older data" on the 2014 basket row, poverty-line note present; no component contains a figure literal (grep test over `src/ui/Budget*`/`BenchmarkRows.tsx` for digits in strings other than UI constants: allowed list in the test); the page has one h1; keyboard operable; persistence via `profiles` (injected store).
- [ ] **Step 2:** FAIL; implement; **Step 4:** green; **Step 5:** commit `feat: budget tracker view`.
- [ ] **Step 6 (visual):** Playwright fresh context at 390/320/1280 in tobacco and sand: empty week, on track, over budget, with income, benchmarks section; LOOK at every screenshot; fix defects (overlap, hard clips, spacing); `scrollWidth === innerWidth`; console clean; reduced motion; commit fixes.

### Task 4: Policy dashboard view

**Files:** Create `src/ui/PolicyView.tsx`, `src/ui/BarRows.tsx`, `src/ui/ScaleRows.tsx`; modify `src/ui/views.ts` (`'policy'`), `src/ui/Menu.tsx` (last item "Data and policy"), `src/App.tsx`, the footer (link "Data and policy"), `src/index.css` (`@media print`); tests alongside.

**Interfaces:** `PolicyView({ now })` per the policy spec: h1 "What we know about food insecurity." + intro sentence; sections with plain h2s: "How many go without" (two national measures in separate captioned groups, each with a `Plate` dial for its share; Victoria rows with their measure stated), "Who is most affected" (two separate bar groups: Foodbank 2025 and ABS 2023, each captioned with source and instrument; `BarRows` = flat round-ended bars with direct value labels and text alternatives), "Students and young people" (Tasmania surveys, ABS group households, press-only rows with "Press report only", caption "Not Melbourne-specific"), "Melbourne areas" (`ScaleRows`: whole-number SEIFA score on a labelled 700–1,200 scale with a marker at 1,000 "Australian average", Victorian decile as text, the selection caption and "Lower scores mean more disadvantage… This measures disadvantage, not hunger."), "What helps (evidence)" (evidence word + one sentence + source per intervention; note that cost-per-person figures were not found), "Cost of living" (CPI and poverty-line rows shared with the budget view), "About this data" (sources used by shown rows with link/licence/accessed date, all dataset caveats as "Things to keep in mind", the `notFound` list, "Last updated 26 October 2026"). Everything is read from `StaticBenchmarkSource`.

- [ ] **Step 1: Tests:** one h1; every section heading present in order; the two national measures render in separate groups with their captions and never in one list; no summed or combined figure appears (assert no element shows 46.2 or similar by checking that every number shown is in the dataset set or is a formatted dataset value); `press` rows only in the Students section with the label; `p-youth-whole-day` absent; SEIFA rows sorted ascending, whole numbers, marker label present, no `lga` text; interventions show evidence words and the "not found" cost note; source list contains only sources used by shown rows and every link has `rel="noopener noreferrer"`; caveats count equals the dataset's; `notFound` list rendered; print stylesheet rule exists; each bar has a text alternative; keyboard/headings order.
- [ ] **Step 2:** FAIL; implement; **Step 4:** green; **Step 5:** commit `feat: data and policy page`.
- [ ] **Step 6 (visual):** Playwright fresh context at 390/320/1280 in tobacco and sand for each section; LOOK at every screenshot; check the bars never clip, labels never overlap, text contrast; print preview emulation (`browser_emulate_media` print) once; `scrollWidth === innerWidth`; console clean; commit fixes.

### Task 5: Verification and docs

- [ ] **Step 1:** Update README/AGENTS: the Budget and Data-and-policy views, the dataset, how to refresh it (`npm run build:benchmarks`), the "no invented numbers" rule, the verification labels.
- [ ] **Step 2:** Run the taste gates: `node ~/.agents/skills/design-taste-frontend/scripts/lint.mjs src` and `inspect.mjs --app` on a production build; fix FAILs.
- [ ] **Step 3:** `npm test` (all workspaces), tsc (root, core, server), build; commit `docs: budget tracker and policy dashboard`.
