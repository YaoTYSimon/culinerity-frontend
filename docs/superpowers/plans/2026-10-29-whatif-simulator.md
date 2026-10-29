# What-if Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "What if" view where a person tries a money change (lost shifts, rent rise, bill, pay or payment change, food prices, or several) on their own numbers and sees plain, sourced, on-device arithmetic.

**Architecture:** Pure integer-cent functions in `packages/core/src/whatif` (scenario model, `runWhatIf`, `explain`, `compare`, saved-scenario operations, context map), two optional new `Profile` fields plus saved scenarios, sourced context rows added to the shared benchmark dataset under a new `whatif` group, and a React view in the plate design wired into `App`/`Menu`. No network, no LLM, no new dependency.

**Tech Stack:** TypeScript, React 19, Vite 8, Tailwind v4, Vitest + Testing Library, Playwright (manual verification).

**Spec:** `docs/superpowers/specs/2026-10-29-whatif-simulator-design.md` (including its "Builder-check rulings"). Research: `docs/superpowers/research/2026-10-29-whatif-pantry-tradeoffs.md` section A.

## Global Constraints

- On-device only: no `fetch`, XHR, beacon, WebSocket, `navigator.share`, clipboard write or `console.*` in `packages/core/src/whatif` or the What if views; no LLM or AI SDK; no new server route; no sharing, export or print.
- `packages/core` stays platform-free (`platformFree.test.ts`); `now` is injected as a `Date`; tests run with `TZ=Australia/Melbourne`.
- All money in the model is integer cents; percentages are integer basis points (100 bp = 1%); direction is a separate `up`/`down` field; no input accepts a minus sign; round half away from zero; never NaN, never throw.
- Mock-first and sourced: every figure on screen is a user input, a computed result, or a dataset row with source, period and verification label. Context figures are never arithmetic defaults. No food-insecurity statistics beside a result. No prediction, score, risk level, "better" or "worse".
- Copy: kind and non-shaming; "General information, not advice" notice always visible; exact strings only in `src/ui/whatIfCopy.ts`; banned words listed in the spec's Copy section are tested.
- Limits (refuse, never clamp silently): income $20,000/week, housing $10,000, other regular costs $10,000, food budget $10,000, pay per unit $5,000, payment change $5,000/week, one-off bill $100,000; lose-work count 0.5 steps, shifts 0.5 to 14, hours 0.5 to 60; percentages 1 to 10000 bp.
- Saved what-ifs: inputs only (never results or baseline), cap 10 and refuse the 11th, name 1 to 40 characters, remove/clear with 6-second Undo.
- Plate design system: flat colour, round shapes, Schibsted Grotesk, semantic colour names only, no cards/shadows/hairlines/gradients, 44px targets, one `h1`, `INPUT_CLASS`/`FIELD_EDGE` on every field, `motion-safe`, no horizontal scroll at 320 to 1280.
- Every behaviour change has a test; commit after each task; stage files by explicit path; no push; no `git add -A`.
- Use Sonnet only; verify UI with Playwright screenshots; the taste skill (`design-taste-frontend`) guides visuals.

## Review Focus

Failure modes the spec implies that no single task's happy-path tests cover; each is pinned by a named test in the owning task.

1. Zero income typed on purpose: valid, leftovers negative, no NaN, no share-of-income line (Task 1 `zero income is valid and never divides`).
2. Minus sign, `NaN`, `Infinity`, `1e9`, `7.255%`, blank pasted into any field: refused with the kind message, state unchanged (Task 1 `parse*`, Task 5 `refuses bad text in every field`).
3. Rent percent with no rent entered, or food price change with no food budget: asks for that number, shows no figures (Task 1 `needs`, Task 5 `asks for the missing number`).
4. Saved what-ifs after "Your numbers" change, after a profile switch, and when storage holds junk: recalculate from today's numbers; junk dropped; draft never leaks across profiles (Tasks 3, 6).
5. Daylight-saving weeks (5 April and 4 October 2026) and Sunday 23:59 to Monday 00:00: four labelled weeks seven calendar days apart (Task 1 `weekStarts`).

---

## File Structure

Core (`packages/core/src/whatif/`, each with a sibling `*.test.ts`): `types.ts` (model types), `units.ts` (parsing, conversions, `formatCents`), `scenario.ts` (limits, `validateScenario`), `run.ts` (`runWhatIf`), `explain.ts`, `compare.ts`, `saved.ts` (saved operations and sanitiser), `context.ts` (context map and help lines). Also modified: `domain/types.ts`, `storage/profileStore.ts`, `index.ts`, `benchmarks/types.ts`, `scripts/build-benchmarks.mjs`, the research JSON and its generated file.

UI (`src/ui/`): `WhatIfView.tsx` (shell and state), `WhatIfNumbers.tsx`, `WhatIfForm.tsx` + `WhatIfFields.tsx` (kind pills, per-kind inputs), `WhatIfResults.tsx` + `WhatIfPlates.tsx`, `WhatIfContext.tsx`, `WhatIfHelp.tsx`, `WhatIfSaved.tsx`, `WhatIfCompare.tsx`, `whatIfCopy.ts`; modified `views.ts`, `Menu.tsx`, `App.tsx`, `BudgetView.tsx`.

---

### Task 1: Core model and maths

**Files:**
- Create: `packages/core/src/whatif/types.ts`, `units.ts`, `scenario.ts`, `run.ts` and tests `units.test.ts`, `scenario.test.ts`, `run.test.ts`
- Modify: `packages/core/src/index.ts` (export `./whatif/types`, `units`, `scenario`, `run`)

**Interfaces:**
- Produces (`types.ts`):
  - `type Cents = number; type Bp = number; type Per = 'week' | 'fortnight' | 'month'; type Direction = 'up' | 'down'`
  - `interface Recurring { cents: Cents; per: Per }`
  - `type Step = { kind: 'lose-work'; unit: 'shifts' | 'hours'; count: number; payPerUnit: Cents; everyWeeks: 1 | 2 | 4 } | { kind: 'pay-change'; direction: Direction; bp: Bp } | { kind: 'payment-change'; direction: Direction; amount: Recurring } | { kind: 'one-off-bill'; cents: Cents; week: 1 | 2 | 3 | 4 } | { kind: 'rent-change'; direction: Direction; by: { mode: 'percent'; bp: Bp } | { mode: 'dollars'; amount: Recurring } } | { kind: 'food-price-change'; direction: Direction; bp: Bp }`
  - `type Scenario = Step | { kind: 'combined'; steps: Step[] }`
  - `interface Baseline { incomeWeekly?: Cents; housingWeekly?: Cents; otherFixedWeekly?: Cents; foodBudgetWeekly?: Cents }`; `type BaselineField = keyof Baseline`
  - `interface WeekFigures { income: Cents | null; housing: Cents | null; otherFixed: Cents | null; oneOff: Cents; food: Cents | null; leftAfterCosts: Cents | null; leftAfterFood: Cents | null; foodDays: number | null }`
  - `type WhatIfResult = { status: 'ok'; weekStarts: [string, string, string, string]; before: WeekFigures; weeks: [WeekFigures, WeekFigures, WeekFigures, WeekFigures]; before4: Totals; after4: Totals; change4: Totals; firstAffectedWeek: 1 | 2 | 3 | 4; clamped: ('income' | 'housing' | 'food')[] } | { status: 'needs'; missing: BaselineField[] } | { status: 'invalid'; field: string }`, where `Totals` has the same numeric fields as `WeekFigures` except `foodDays`, summed, null if any week is null.
- Produces (`units.ts`): `toCents(aud: number): Cents`; `toWeeklyCents(r: Recurring): Cents` (week x1, fortnight /2, month x12/52, round half up); `parsePercentBp(text: string, opts: { max: Bp }): Bp | null`; `formatCents(c: Cents): string` ("$42", "$12.50", negative as "-$42" never used in copy: callers pass absolute values); `deltaBp(base: Cents, bp: Bp): Cents` (round half away from zero).
- Produces (`scenario.ts`): `LIMITS` (the Global Constraints values in cents/bp), `validateScenario(s: unknown): { ok: true; scenario: Scenario } | { ok: false; field: string }` (strict shape and range; rejects nested or duplicate-kind combined, 2 to 4 steps).
- Produces (`run.ts`): `runWhatIf(baseline: Baseline, scenario: Scenario, now: Date): WhatIfResult`.
- Consumes: `weekStartMonday`, `addLocalDays` from `../budget/week`; `parseMoney` from `../budget/money`.

- [ ] **Step 1: Write failing tests.** `units.test.ts`: `toWeeklyCents({cents:100000,per:'month'})` is 23077; fortnight 45000 is 22500; `deltaBp(12345, 1000)` is 1235; `parsePercentBp('10%', {max:10000})` is 1000, `'7.25'` is 725; null for `''`, `'-5'`, `'1e3'`, `'Infinity'`, `'NaN'`, `'7.255'`, `'101'`; `formatCents(4200)` is `$42`, `formatCents(1250)` is `$12.50`. `scenario.test.ts`: every limit accepted at the limit and refused one unit above (with the field name); nested combined, duplicate kinds, 1 step, 5 steps refused; non-integer cents, `NaN`, negative refused. `run.test.ts` with baseline I 90000, H 45000, O 15000, F 12000 and `now` Wed 28 Oct 2026: before `leftAfterCosts` 30000, `leftAfterFood` 18000, `foodDays` 7; `rent-change` up 10% percent: housing 49500, leftAfterCosts 25500, leftAfterFood 13500, `change4.leftAfterCosts` -18000; `lose-work` shifts 1 at 12000 every 1: income 78000, leftAfterCosts 18000; lose 3 shifts: leftAfterCosts -6000, `foodDays` 0, `leftAfterFood` -18000; `everyWeeks: 2`: incomes 78000, 90000, 78000, 90000; `one-off-bill` 20000 week 3 changes only week 3; combined rent +10% and 1 lost shift: leftAfterCosts 13500; permutation of combined steps gives identical results; `food-price-change` up 10%: food 13200; I 70000: `foodDays` 5; income 5000 minus 12000 shift: income 0 and `clamped` contains `'income'`; no rent with percent rent change: `{status:'needs', missing:['housingWeekly']}`; combined with two missing fields lists both; no income and a rent change: `status 'ok'`, income and left null, housing change 4500; `zero income is valid and never divides` (I 0: leftAfterCosts -60000, no NaN anywhere via `JSON.stringify` having no `null` where numbers expected beyond the documented nulls); all maxima at once stays integer and below 2^53; `weekStarts` for now = Sun 4 Oct 2026 23:59 and Mon 5 Oct 00:00 and for the 5 April 2026 week are four dates seven calendar days apart.
- [ ] **Step 2: Run `npx vitest run packages/core/src/whatif`.** Expected: FAIL (modules not found).
- [ ] **Step 3: Implement the files above.** `runWhatIf` computes each step's weekly deltas from the baseline (never from another step), sums them per week (week 1..4 via `everyWeeks`/`week`), clamps income, housing and food at 0, then derives `leftAfterCosts`, `leftAfterFood`, `foodDays = min(7, floor(max(0, leftAfterCosts) * 7 / food))` (null when income missing, food missing or 0), totals, `firstAffectedWeek` (1 when nothing changes). Missing-field detection per the spec table runs first (`needs`); validation runs before that (`invalid`). Lose-work amount: `Math.round(count * 2) * payPerUnit / 2` rounded half up.
- [ ] **Step 4: Run the same command.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: what-if scenario model and integer-cent maths` (add the listed files by path).

### Task 2: Explanation, comparison and copy templates

**Files:**
- Create: `packages/core/src/whatif/explain.ts`, `compare.ts`, tests `explain.test.ts`, `compare.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: Task 1 types, `formatCents`.
- Produces: `explain(result: Extract<WhatIfResult, { status: 'ok' }>, scenario: Scenario, baseline: Baseline): Explanation` with `Explanation = { headline: string; rows: { key: RowKey; label: string; before: Cents | null; after: Cents | null; change: Cents | null }[]; how: string[]; assumed: string[]; unknown: string[]; shortfall: boolean }` and `RowKey = 'income' | 'housing' | 'otherFixed' | 'oneOff' | 'food' | 'leftAfterCosts' | 'leftAfterFood'`; `compare(a: ok, b: ok): Comparison = { rows: { key: RowKey; a: Cents | null; b: Cents | null; diff: Cents | null; sentence: string | null }[]; foodDays: { a: number | null; b: number | null }; sentence: string }`; `DESCRIBE_NAME(scenario: Scenario): string` (default saved name, at most 40 characters, for example "Rent up 10%", "Lose 1 shift a week").

- [ ] **Step 1: Write failing tests.** Using Task 1's baseline: rent +10% headline is exactly "With this change you'd have $45 less each week after the costs you told us about: $255 left instead of $300." (check `formatCents` output); `how` contains "You told us rent is $450 a week. 10% of $450 is $45, so rent would be $495." and "Left after costs = income - rent - other costs."; lose 1 shift: "You told us you'd lose 1 shift a week and that a shift pays you $120. 1 x $120 = $120 less income each week."; negative left uses "would be $X more than your income" and `shortfall` is true; `unknown` has a line for each blank field; no income gives no "left" row values; compare of rent+10% (a) vs 1 lost shift (b): `sentence` "Second leaves $75 a week less than first." style (values from the results), equal gives "Both leave the same."; **banned-words test:** every string produced across 30 generated scenarios contains none of the spec's banned words (case-insensitive, whole words) and no digit followed by `NaN`/`undefined`; `DESCRIBE_NAME` length <= 40 for max-length inputs.
- [ ] **Step 2: Run `npx vitest run packages/core/src/whatif/explain.test.ts packages/core/src/whatif/compare.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement fixed templates only** (no generation, no network). Amounts via `formatCents` of absolute values; direction words "less/more" chosen by sign.
- [ ] **Step 4: Run the same command.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: what-if plain-words explanation and comparison`.

### Task 3: Profile fields and saved what-ifs

**Files:**
- Create: `packages/core/src/whatif/saved.ts`, `saved.test.ts`
- Modify: `packages/core/src/domain/types.ts` (add `housingWeekly?: Aud; otherFixedWeekly?: Aud; whatIfScenarios?: SavedWhatIf[]` to `Profile`; export `SavedWhatIf`), `packages/core/src/storage/profileStore.ts` (sanitise the new fields), `packages/core/src/storage/profileStore.test.ts`, `packages/core/src/index.ts`; `src/storage` tests if they enumerate profile fields

**Interfaces:**
- Produces: `interface SavedWhatIf { id: string; name: string; scenario: Scenario; savedAt: string }`; `MAX_SAVED_WHATIFS = 10`; `saveWhatIf(list: SavedWhatIf[] | undefined, item: SavedWhatIf): { list: SavedWhatIf[]; error?: 'full' | 'invalid' | 'duplicate-id' }` (same array on error); `renameWhatIf(list, id, name): SavedWhatIf[]`; `removeWhatIf(list, id): { list: SavedWhatIf[]; removed?: SavedWhatIf; index?: number }`; `restoreWhatIf(list, item, index): SavedWhatIf[]`; `sanitizeWhatIfs(raw: unknown[]): SavedWhatIf[]`; `baselineFromProfile(p: Profile): Baseline` (dollars to cents via `toCents`, absent stays absent, out-of-range ignored).
- Consumes: `validateScenario`, `cleanText` from `../food/sanitize`.

- [ ] **Step 1: Write failing tests.** `saveWhatIf` accepts 10 and returns `error: 'full'` on the 11th with the list unchanged; name trimmed, 1 to 40 characters, blank or 41 characters is `'invalid'`; duplicate names allowed, duplicate ids refused; `removeWhatIf` then `restoreWhatIf` restores the same order; `sanitizeWhatIfs` drops invalid scenarios and non-strings, keeps the valid rest, first duplicate id wins, caps at 10, never throws on `null`/numbers/nested garbage. `sanitizeProfile` keeps `housingWeekly: 450` and `otherFixedWeekly: 60`, drops `-1`, `NaN`, `1e9` and strings, keeps valid `whatIfScenarios` and drops the field if none valid; a stored profile round-trips through `LocalProfileStore`. `baselineFromProfile({incomeWeekly: 900, housingWeekly: 450.5})` is `{incomeWeekly: 90000, housingWeekly: 45050}`.
- [ ] **Step 2: Run `npx vitest run packages/core/src/whatif/saved.test.ts packages/core/src/storage`.** Expected: FAIL.
- [ ] **Step 3: Implement.** Profile dollars stay dollars (like `incomeWeekly`); scenarios hold integer cents; new numeric fields accepted in `0` to their cap in dollars and rounded to cents.
- [ ] **Step 4: Run the same command, then `npm run typecheck`.** Expected: PASS and no type errors.
- [ ] **Step 5: Commit** `feat: housing and other-costs profile fields and saved what-ifs`.

### Task 4: Sourced context data and help lines

**Files:**
- Modify: `docs/superpowers/research/2026-10-26-food-security-data.json` (add the three sources `fairwork-minwage`, `dss-rates-2026-09-20`, `dffh-rental-report-jun2026` with the research note's url, licence text and `accessed: 2026-10-29`, and the eight `w-` indicators from the spec's Data section with `group: "whatif"`, `year`, `verification: "primary"`, `period`, `scope`, plain `note`, `research`, `refreshAfter`), `packages/core/src/benchmarks/types.ts` (`IndicatorGroup` adds `'whatif'`; `Indicator.refreshAfter?: string`), `scripts/build-benchmarks.mjs` (GROUPS, `refreshAfter` must be a real YYYY-MM-DD, warning for passed dates, `--strict` makes it exit non-zero), `scripts/build-benchmarks.test.ts`, `packages/core/src/benchmarks/benchmarks.test.ts` (counts updated deliberately), `docs/superpowers/research/README.md`
- Generated: `packages/core/src/benchmarks/generated/benchmarks.generated.ts` via `npm run build:benchmarks`
- Create: `packages/core/src/whatif/context.ts`, `context.test.ts`; modify `index.ts`

**Interfaces:**
- Produces: `WHATIF_CONTEXT: Record<Step['kind'], string[]>` (indicator ids per spec table; `one-off-bill: []`); `contextIds(s: Scenario): string[]` (deduplicated union for `combined`); `WHATIF_HELP: { id: string; label: string; phone?: string; hours?: string; url: string; sourceId: string; verifiedOn: string }[]` with exactly National Debt Helpline (1800 007 007, "weekdays 9:30am to 4:30pm, chat weekdays 9am to 8pm", `https://ndh.org.au/`) and Foodbank Find Food (`https://findfood.foodbank.org.au/`), `verifiedOn: '2026-10-29'`.

- [ ] **Step 1: Write failing tests.** Every id in `WHATIF_CONTEXT` exists in `StaticBenchmarkSource().indicators()`; every `whatif` indicator has an https source, a `year`, `refreshAfter`, and a source resolving to the three new sources; the exact values: `w-min-wage-hour` 26.44 and `w-min-wage-week` 1004.9 (decimals 2), `w-jobseeker-single` 824.9, `w-jobseeker-energy` 8.8, `w-jobseeker-single-kids` 883.3, `w-jobseeker-partnered` 755.1, `w-rent-melb-median` 595, `w-rent-index-year` 4.8; `indicators('budget')` and `indicators('policy')` are unchanged in count and ids (the new rows do not leak); `contextIds` of rent+food combined is the union with no duplicates; help lines have https urls, a `verifiedOn` date and only the two ids; generator test: a `refreshAfter` of `2026-02-30` is rejected, a passed date warns and `--strict` exits non-zero; the freshness test (committed generated file equals regenerated) passes.
- [ ] **Step 2: Run `npx vitest run packages/core/src/benchmarks packages/core/src/whatif/context.test.ts scripts/build-benchmarks.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Add the data and code.** Re-read each source in the research sources JSON before entering a value; copy values exactly from the research note's table; put the value, evidence and source in the commit message (AGENTS.md rule). The `refreshAfter` dates: 2027-07-01 (wage), 2027-03-21 (JobSeeker), 2026-12-31 (rent); confirm cadence in each `research` field. Run `npm run build:benchmarks`.
- [ ] **Step 4: Run the Step 2 command, then `npm test` for the benchmarks-dependent views.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: sourced what-if context figures and help lines` (JSON, generated file, scripts, tests by path).

### Task 5: What if view, scenario form and results (wiring)

**Files:**
- Create: `src/ui/whatIfCopy.ts`, `WhatIfView.tsx`, `WhatIfNumbers.tsx`, `WhatIfForm.tsx`, `WhatIfFields.tsx`, `WhatIfResults.tsx`, `WhatIfContext.tsx`, `WhatIfHelp.tsx` and tests `WhatIfView.test.tsx`, `whatIfCopy.test.ts`
- Modify: `src/ui/views.ts` (add `'whatif'`), `src/ui/Menu.tsx` (item `{ to: 'whatif', label: 'What if' }` after Budget), `src/App.tsx` (render `WhatIfView`; navigation callbacks), `src/ui/BudgetView.tsx` (one quiet link, prop `onOpenWhatIf?`), `src/ui/views.test.ts`, `src/ui/Menu.test.tsx`, `src/App.test.tsx`, `src/ui/BudgetView.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 to 4 (`runWhatIf`, `explain`, `baselineFromProfile`, `validateScenario`, `contextIds`, `WHATIF_HELP`, `parseMoney`, `parsePercentBp`, `savedThisWeek`/`weekSummary`, `StaticBenchmarkSource`, `BenchmarkRow`).
- Produces: `WhatIfView(props: { profile: Profile; now: Date; clock?: () => Date; profileId?: string; onChange: (next: Profile) => void; onSeeSwaps: () => void; onOpenBudget: () => void; onOpenSupport: () => void; onOpenNearby: () => void })`; `WHATIF_COPY` with the spec's exact notice, privacy line, shortfall, needs-a-number, validation and empty strings, plus `BANNED_WORDS`.

- [ ] **Step 1: Write failing tests.** Menu lists "What if" directly after "Budget"; `App` opens it; the notice text from the spec is on screen verbatim on first render; `Your numbers` saves `housingWeekly: 450` on blur-or-Save and converts "Enter as per month"; pick "Rent changes", "goes up", type "10" and press "Show what changes": heading "What changes" takes focus, headline reads the Task 2 sentence for 900/450/150/120, the before/after `<table>` has a caption, `th scope` headers and the rows, "How we worked this out" lists the rent line; context rows for rent (median $595, index 4.8%, with period and "Read from the source itself") are shown and nothing like "food insecure" appears; **`refuses bad text in every field`:** `-5`, `abc`, `1e9`, `NaN` and blank each show the copy message, set `aria-invalid`, and leave results unchanged; **`asks for the missing number`:** rent percent without rent shows the needs sentence and no table; no income: only change rows plus "Add your weekly income to see what's left"; zero income typed: table renders with negative left as "short by" wording and no NaN text anywhere; negative leftAfterFood shows the shortfall copy and the help list above the table, including the two verified contacts; **swaps cover:** with a 7-day My week saving of $18 and a gap of $60 the sentence names $18 of the $60; "Start again" empties the draft and results, keeps "Your numbers" and focuses the first control; changing profile id resets the draft; the Budget view link calls `onOpenWhatIf`; copy test: every string in `WHATIF_COPY` and the rendered text contain no banned word and no "AI"; kind pills are a `radiogroup` operable by arrow keys; every input has a label and `INPUT_CLASS`.
- [ ] **Step 2: Run `npx vitest run src/ui/WhatIfView.test.tsx src/ui/whatIfCopy.test.ts src/ui/Menu.test.tsx src/ui/views.test.ts src/App.test.tsx`.** Expected: FAIL.
- [ ] **Step 3: Implement the view.** State: kind, per-kind field text, the last `WhatIfResult`; parse text with `parseMoney({max})`/`parsePercentBp` then `validateScenario`; results only on the button press; `role="status"` says "Results ready" once; the table is a `<table>` (no hairlines: tone steps); on 320px rows stack. "Your numbers" writes through `onChange({...profile, ...})` using `parseMoney`; the swap sentence uses `weekSummary(profile.weekSwaps, now.toISOString()).total`. Leave plates for Task 8.
- [ ] **Step 4: Run the Step 2 command, then `npm run typecheck`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: What if view with scenario form, results and wiring`.

### Task 6: Saved what-ifs, compare and reset UI

**Files:**
- Create: `src/ui/WhatIfSaved.tsx`, `WhatIfCompare.tsx`, tests `WhatIfSaved.test.tsx`
- Modify: `src/ui/WhatIfView.tsx`, `src/ui/whatIfCopy.ts`

**Interfaces:**
- Consumes: Task 3 saved operations, Task 2 `compare`, `DESCRIBE_NAME`; the id generator the Budget view uses (`crypto.randomUUID` with its existing fallback; read `AddSpend`).
- Produces: `WhatIfSaved(props: { list: SavedWhatIf[]; canSave: boolean; draftName: string; onSave(name: string): void; onRename(id: string, name: string): void; onRemove(id: string): void; onOpen(item: SavedWhatIf): void; onClear(): void })`; `WhatIfCompare(props: { a: SavedWhatIf | 'draft'; b: SavedWhatIf | 'draft'; baseline: Baseline; now: Date })`.

- [ ] **Step 1: Write failing tests.** Save with the default name "Rent up 10%" then rename to a 40-character name; a 41-character name shows the message and does not save; saving 10 then an 11th shows "You can keep up to 10 what-ifs. Remove one to save another." and the list is unchanged; Remove shows Undo for 6 seconds (fake timers) and Undo restores position; "Clear all" then Undo restores all; opening a saved item refills the form and recalculates with today's numbers (change income first, results differ); compare of two items renders a captioned table with the Task 2 sentence and never "better" or "worse"; a saved item that now needs a missing number says which; corrupt stored items are skipped silently on load; saved scenarios live in the profile JSON as inputs only (no `leftAfter`, no baseline fields inside them).
- [ ] **Step 2: Run `npx vitest run src/ui/WhatIfSaved.test.tsx src/ui/WhatIfView.test.tsx`.** Expected: FAIL.
- [ ] **Step 3: Implement** with the budget undo pattern (6 s timer cleared on unmount); focus returns to a sensible control after remove, restore and save.
- [ ] **Step 4: Run the Step 2 command.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: saved what-ifs, compare and start again`.

### Task 7: Privacy and accessibility tests

**Files:**
- Create: `src/ui/whatIfPrivacy.test.tsx`, `packages/core/src/whatif/privacy.test.ts`, `src/ui/WhatIfView.a11y.test.tsx`

**Interfaces:**
- Consumes: the finished feature; helpers and spy approach from `src/ui/foodPrivacy.test.tsx`.

- [ ] **Step 1: Write the tests.** Core static test reads every file in `packages/core/src/whatif` and fails on `fetch`, `XMLHttpRequest`, `navigator`, `localStorage`, `console.`, `window`, `document` and any import outside `packages/core/src` (and the test proves it is live by scanning a synthetic string containing each token); dependency test reads root, core and server `package.json` and fails on `openai`, `@anthropic-ai`, `langchain`, `@google/generative-ai`, `ollama`, `transformers`. UI privacy test: spies on `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `navigator.share`, `navigator.clipboard.writeText` and every `console` method installed before rendering `App` (as `foodPrivacy` does); the flow enters income 731.19, rent 483.17, an other-costs value, a food budget, a scenario named `SENTINEL-WHATIF-731`, runs a combined change, saves, compares, renames, removes, undoes, clears and starts again; asserts zero network calls, zero share/clipboard/console calls, no storage key written other than the profile key and theme key, the profile JSON holds only the documented fields and none of the result numbers, the sentinel name and numbers never appear in `document.title`, `location.href`, any `data-*` attribute, the My week share text or Menu; deleting the profile removes the scenarios; "start from my current data" carries them; two profiles keep separate lists. A11y test: axe-style checks the repo already uses, else the manual ones (single `h1`, labelled inputs, table captions and scopes, focus moves to results heading, `aria-invalid` plus message, radiogroup keys, reduced-motion renders the final plate state, no live-region chatter: exactly one `role="status"` update per press).
- [ ] **Step 2: Run `npx vitest run src/ui/whatIfPrivacy.test.tsx packages/core/src/whatif/privacy.test.ts src/ui/WhatIfView.a11y.test.tsx`.** Expected: PASS (they pin built behaviour); temporarily add a `fetch('/x')` in the view to prove the privacy test fails, then remove it (write the result in the commit message).
- [ ] **Step 3: If a real leak or gap shows, fix the code, never the test** (repository rule), and re-run.
- [ ] **Step 4: Run `npm test`.** Expected: all green.
- [ ] **Step 5: Commit** `test: what-if privacy and accessibility`.

### Task 8: Visuals and Playwright verification

**Files:**
- Create: `src/ui/WhatIfPlates.tsx`, `src/ui/WhatIfPlates.test.tsx`
- Modify: `src/ui/WhatIfResults.tsx`, `src/ui/WhatIfView.tsx`, `src/ui/PageHeader` usage (photo header or empty-state visual consistent with Budget; use an existing CC0 photo from `src/assets/photos` with its credit; invent nothing)

**Interfaces:**
- Consumes: `PlateRim`, `RoundPhoto`, `PageHeader`.
- Produces: `WhatIfPlates(props: { beforeDays: number | null; afterDays: number | null })` two small plates whose rims show days of food budget covered out of 7, `role="img"` with text such as "Before: 7 of 7 days. After: 4 of 7 days.", final state under reduced motion, no red, null renders nothing.

- [ ] **Step 1: Write failing tests** for `WhatIfPlates`: label text for (7, 4), (7, 7), (0, 0), null hides it, reduced motion has no animation class.
- [ ] **Step 2: Run `npx vitest run src/ui/WhatIfPlates.test.tsx`.** Expected: FAIL.
- [ ] **Step 3: Implement the plates and the page header/empty state** using the `design-taste-frontend` skill's look-and-fix loop and the plate rules in `AGENTS.md`.
- [ ] **Step 4: Verify in a real browser** (`npm run dev`, Playwright MCP): screenshots at 1280, 390 and 320 wide in two themes (tobacco and cream) for: empty, rent +10%, three lost shifts (shortfall plus help), needs-a-number, zero income, saved list with compare. Check no horizontal scroll, focus ring, 44px targets, the table stacking at 320, and run `node scripts/contrast.mjs`. Keep screenshots out of the repo (scratch directory). Fix issues found and re-shoot.
- [ ] **Step 5: Run `npx vitest run src/ui` then commit** `feat: What if plates and visual polish`.

### Task 9: Docs and gates

**Files:**
- Modify: `docs/FEATURES.md` (new `feature/whatif` section: what is built, the on-device decision, limits and the "legal review pending, do not launch publicly" note, refresh table), `AGENTS.md` (Layout: `packages/core/src/whatif`, the What if view and `View` list; Privacy rules: what-if data stays on the device, never sent, no sharing; Data rules: `whatif` group and `refreshAfter`), `docs/superpowers/research/README.md` (refresh steps for context figures)

- [ ] **Step 1: Write the docs** from the spec; list the spec's "Decisions only the user can make" as open.
- [ ] **Step 2: Run all gates:** `npm run typecheck`, `npm test`, `npm run build`, `npm run format` (then `git diff --stat` to confirm only intended files), `node scripts/contrast.mjs`, `npm run build:benchmarks` (no diff, warnings reviewed).
- [ ] **Step 3: Run a final reviewer pass** on the whole branch diff against the spec (coverage, banned words, no figure without a source, no network). Fix findings.
- [ ] **Step 4: Commit** `docs: what-if simulator in FEATURES, AGENTS and research README`.
