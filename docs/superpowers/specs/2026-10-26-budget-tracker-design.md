# Budget tracker: Design

Written unattended (the user asked for "a budget tracker using online sources" and went to sleep with blanket permission to create and source everything). Decisions are the designer's; see "Calls made". Builds on the plate design system (`2026-10-26-welcome-themes-plate-redesign-design.md`), the privacy rules of `2026-10-25-culinerity-rewrite-design.md` and, for people who sign in, `2026-10-26-sign-in-design.md` (profile-scoped storage). The sourced figures come from `docs/superpowers/research/2026-10-26-food-security-data.json` (19 sources, every figure cited; two headline figures were re-checked against primary sources: Foodbank Hunger Report 2025 and the ABS 2023 food insecurity release).

## Intent and why

The app already ranks cheaper swaps and saves "my week" savings. The missing piece is the other half of the problem: **what did I actually spend on food this week, and am I on track?** The tracker lets someone log food spending in a few taps, see the week as a plate (the design's motif) and a plain pace message, and see **sourced, dated context** (price trends, typical shares, poverty lines) without being told what to do. It stays on the device, like everything personal in the app.

"Using online sources" means: the context numbers are researched from official and peer-reviewed sources, stored in the app with their citation, date and a confidence label, and shown with links. The app does **not** fetch anything at runtime (privacy: no third-party requests); a documented manual refresh script updates the data.

## What gets built

1. **Budget view** (menu item "Budget"; also reachable from the number screen's "Your budget" section): 
   - the weekly food budget (existing `foodBudgetWeekly`, editable inline) and optional weekly income (`incomeWeekly`);
   - **the plate:** a round plate-dial whose rim fills with the share of the budget spent this week; the centre shows the **amount left** (e.g. "$42 left"), beneath it "of $120 · 3 days left"; over budget shows "$12 over" in plain text (never red alarm colours; use the theme's ink and a kind sentence);
   - a **pace line** in plain words from `budgetSummary`: "You're on track.", "You're spending a bit faster than the week.", "You've passed this week's budget. That's okay: here are cheaper swaps." (kind, never shaming), plus "About $X a day for the rest of the week" when there is budget left and days remain;
   - **Add spending:** a round primary "Add" button opens a short form (amount in dollars, optional note up to 40 chars, category as pill buttons: Groceries, Takeaway, Market, Other; date defaulting to today, editable within the current and previous week); saves in one tap; keyboard friendly; amount parsing accepts "12", "12.5", "$12.50"; rejects ≤0, NaN, >10,000;
   - **This week's list:** plain rows (note or category, date, amount) each with a small "Remove" text button; "Undo" after removal for 6 seconds; empty state "Nothing logged yet this week.";
   - a **"Saved with swaps"** line linking to My week (shows the week-swaps total from core `weekSummary`, no new data).
2. **Context from sources** (a section below the tracker titled "How this compares"): plain rows, each with the figure, a one-line meaning, the period, the publisher, a confidence word and a link; older-than-5-years figures carry the plain label "Older data". At least these rows, all from the research JSON: CPI food Melbourne and Australia (`b-cpi-food-melbourne`, `b-cpi-food-australia`), share of lowest-income household spending on food (`b-hes-food-share-low-income`) and weekly spending of that group (`b-hes-lowest-quintile-spend`), poverty lines for a single adult and a couple with two children (`b-poverty-line-single`, `b-poverty-line-couple-2kids`) with the JobSeeker shortfall (`b-jobseeker-shortfall`), the Victorian healthy food basket for a family of four (`b-vhfb-2014`, labelled "Older data (2014)"), and a "Not found" note listing what the research could not find (e.g. no current Melbourne healthy food basket) so the screen never implies a number it does not have. A footer line: "General information, not financial advice."
3. **If income is entered:** one neutral sentence, "You've logged $X of food spending, which is Y% of your weekly income of $Z.", with a note that official figures measure different things (share of income vs share of household spending) so **no direct comparison** is drawn. No recommended-budget formula is given (the research found no source for one).
4. **Edge handling:** no budget set → the view asks for one first (a single field, "Skip" allowed; tracker works without a budget by showing spent only); week rolls over on Monday (local time); entries older than 4 weeks are kept up to a cap of 200 and shown in a "Past weeks" disclosure with weekly totals only; very large or tiny amounts validated; no entries lost on storage failure (calm message, retry).

## Data (device only)

- `Profile` gains `spendEntries?: SpendEntry[]` (stored with the profile; per signed-in profile once sign-in exists); `interface SpendEntry { id: string; amount: Aud; category: 'groceries' | 'takeaway' | 'market' | 'other'; note?: string; at: string }` (ISO date-time; `id` generated in the web layer; cap 200; `sanitizeProfile` extended: finite positive amounts ≤ 10,000, known categories, note ≤ 40 chars, parseable dates; invalid entries dropped).
- Pure functions in `packages/core` (platform-free, tested, `now` injected as `Date`): `weekStartMonday(now: Date): Date` (local time), `entriesThisWeek(entries, now)`, `budgetSummary(entries, budget: number | undefined, now): { spent; remaining: number | null; percentSpent: number | null; daysLeft: number; perDayLeft: number | null; pace: 'no-budget' | 'on-track' | 'a-bit-fast' | 'over' }` (pace: compare share spent with share of week elapsed; `a-bit-fast` when spent share exceeds elapsed share by more than 10 percentage points; `over` when spent > budget; all rounding to cents), `weeklyTotals(entries, now, weeks)`, `parseMoney(text): number | null`, `addSpend`, `removeSpend`, `restoreSpend` (for undo).
- **Sourced benchmarks:** a typed dataset in core `packages/core/src/benchmarks/` generated from the research JSON (`benchmarks.ts` with `Benchmark { id; label; value: number | string; unit; scope; period; publisher; sourceTitle; url; confidence: 'high' | 'medium' | 'low'; ageYears?: number; note? }` and `BENCHMARK_SOURCES`), exposed through a `BenchmarkSource` interface (`list(group)`; `StaticBenchmarkSource` now; a live source could implement it later, per the mock-first pattern). Tests: every benchmark has a non-empty url starting `https://`, a publisher, a period and a confidence; ids unique; the dataset ids used by the UI exist; no benchmark value is hard-coded in UI components (they read from the source); `ageYears` computed against a fixed reference date `2026-10-26` for the "Older data" label.
- A documented manual refresh: `docs/superpowers/research/README.md` explains how the JSON is regenerated and how the TypeScript file is produced from it (`scripts/build-benchmarks.mjs` reading the JSON and writing `packages/core/src/benchmarks/benchmarks.generated.ts`, with a test that fails when the generated file is out of date).

## Constraints

- Plate design system (Schibsted Grotesk, fully round shapes, flat colour, themes via tokens, no cards/chips/hairlines/shadows/gradients, AA contrast, `focus-visible`, `motion-safe`, 44px targets, one h1 per view, no horizontal scroll at 320–1280px, phone-first, centred 520px column on desktop).
- Privacy: spending entries never leave the device and are never in the share text or the backend; no runtime requests for the benchmarks (links are plain external anchors with `rel="noopener noreferrer"`, user-initiated).
- Tone: kind, specific, non-shaming; never "overspent" or "you failed"; no financial advice, no product recommendations, no investment content.
- Accuracy: figures are shown exactly as sourced (units, period, scope), never rounded beyond the source's precision, never combined across different instruments; low-confidence figures are shown with the word "Low confidence" and a muted style or omitted from headline rows.
- Tests: pure-function tests with boundaries (week rollover on Monday 00:00 local, Sunday 23:59, daylight-saving change days in Melbourne), parseMoney cases, sanitiser cases, summary pace cases, undo; component tests for the form, validation, list, empty state, over-budget message, no-budget state; benchmark rows render exactly the dataset values with links; Playwright screenshots at 390/320/1280 in two themes (empty, on track, over budget, with income, with benchmarks).

## Goals / non-goals / anti-goals

- **Goals:** a calm, fast spending log with a plain pace message; honest sourced context; consistent with the plate design.
- **Non-goals:** bank connections, receipts/OCR, multi-currency, shared budgets, notifications, budgeting advice, charts of long history, server storage.
- **Anti-goals:** shaming copy, scary colours, implying a "right" budget the research does not support, presenting old data as current, mixing survey instruments into one comparison, fabricating any number.

## Calls made (designer, unattended; the user can change any)

1. Week starts Monday (local time); the budget is weekly (existing field).
2. Categories: Groceries, Takeaway, Market, Other.
3. Pace uses elapsed share of the week with a 10-point tolerance; no per-category budgets.
4. No recommended budget is shown anywhere (no source found); income only yields a neutral percentage sentence.
5. Benchmarks are a static dataset with citations (no runtime fetch); the manual refresh path is documented.
6. Older-than-5-years figures are labelled "Older data"; the 2012–2014 Victorian basket is shown only with that label; low-confidence figures are muted or omitted from headline rows.
7. Entry cap 200; undo window 6 seconds; amount cap $10,000.
8. Entries are part of `Profile` (so they follow the signed-in profile once sign-in exists).

## Left to the builder

File and component names; the exact layout of the add form (sheet vs inline); wording within the tone rules; how "Past weeks" is shown; the generated-file script details.
