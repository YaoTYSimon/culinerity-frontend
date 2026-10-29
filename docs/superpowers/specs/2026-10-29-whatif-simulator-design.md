# What-if simulator: Design

Written 2026-10-29 for the request: "an AI-driven simulator that allows the user to simulate some scenarios, such as if they lose shifts one time every week or if rent rises by 10%". Builds on the budget tracker (`2026-10-26-budget-tracker-design.md`), the plate design system, the sign-in profile storage and the research note `docs/superpowers/research/2026-10-29-whatif-pantry-tradeoffs.md` (section A; sources in `2026-10-29-whatif-pantry-tradeoffs-sources.json`, ids in `[brackets]` below).

## Intent and why

Money shocks are what people on low incomes fear most and plan for least: a lost shift, a rent notice, a bill that arrives all at once. This view lets a person try a change on their own numbers and see, in plain words and plain arithmetic, what it would do to the week and to the next four weeks, before it happens. It then points to what the app can honestly offer: cheaper swaps, the Budget view, food support and free financial counselling.

## USER DECISION: the "AI" is an on-device, transparent what-if engine

The engine is deterministic arithmetic written in `packages/core`, running on the device. There is **no LLM, no model, no network call and no third-party service**. No income, rent or scenario ever leaves the device, which is the app's privacy promise. An optional AI explainer is **out of scope** and not designed here. The research found LLM advice unstable and a privacy risk for this audience [arxiv-2610-23060] [arxiv-2608-16909] [oaic-commercial-ai]; a transparent rule engine can show every step.

Consequences for wording: the screen never says "AI", "smart" or "prediction". It says "worked out on your device". (Whether to brand it as AI anyway is a user decision, listed at the end.)

## What gets built

A **What if** view (Menu item after Budget; link from the Budget view) with, top to bottom:

1. **Notice** (always visible, not collapsed): the "general information, not advice" text (below).
2. **Your numbers:** the four figures the arithmetic uses, all optional, all on the device: weekly income, rent or housing cost, other regular costs, weekly food budget. Income and food budget are the existing `Profile.incomeWeekly` and `Profile.foodBudgetWeekly`. Two new optional profile fields are added: `housingWeekly` and `otherFixedWeekly` (dollars a week, like their siblings). Each field has an "Enter as" choice (per week, per fortnight, per month) that is converted once to a weekly amount when saved; nothing else about the period is stored.
3. **Pick a change** (round pills): Lose shifts or hours, Pay changes, Payment changes, A one-off bill, Rent changes, Food prices change, A few things at once.
4. **The change's inputs** (below), a quick "Try" row of example numbers where the input is a percentage (5%, 10%, 15%; labelled "Try a number", not a claim), and one primary round button **Show what changes**.
5. **Results** (heading receives focus): headline sentence, before and after for each line, the week by week strip, "How we worked this out", "What we assumed", "What we don't know", the sourced context rows for that change, and "What could help".
6. **Saved what-ifs:** save with a name, list, rename, remove with Undo, compare two, clear all with Undo.
7. **Start again** resets the draft.

Not built: sharing or exporting (no share button, no copy-to-clipboard, no print layout in this version), notifications, bank links, tax, payment eligibility, predictions, scores, risk levels, any LLM.

## Scenario types and inputs

All amounts are positive integers of cents in the model; direction ("goes up" or "goes down") is a separate pill pair, so no field accepts a minus sign. Percentages are integer basis points (100 bp = 1%).

| Kind | Inputs | Effect each affected week | Needs from "Your numbers" |
| --- | --- | --- | --- |
| `lose-work` | `unit` shifts or hours; `count` (0.5 steps, shifts 0.5 to 14, hours 0.5 to 60); `payPerUnit` take-home pay per shift or per hour; `everyWeeks` 1, 2 or 4 ("every week", "every second week", "every fourth week"; the first lost one is in week 1) | income down by `count x payPerUnit` | nothing (income only for leftover) |
| `pay-change` | `direction`; `bp` 1 to 10000 | income changes by `bp` of baseline income | income |
| `payment-change` | `direction`; `amount` (cents + per week, fortnight or month) | income changes by that amount (a benefit or payment going up or down) | nothing |
| `one-off-bill` | `cents`; `week` 1 to 4 | one extra cost in that week only | nothing |
| `rent-change` | `direction`; either percent `bp` 1 to 10000 or dollars (cents + per) | housing changes by `bp` of baseline housing, or by the amount | housing, only in percent mode |
| `food-price-change` | `direction`; `bp` 1 to 10000 | the food budget needed for the same shopping changes by `bp` | food budget |
| `combined` | 2 to 4 steps of the kinds above, each kind at most once | all effects add up | whatever its steps need |

**Pay per shift or hour has no default.** We do not know the person's pay and will not guess; the minimum-wage row appears beside the field as context only. Take-home (after tax) is asked for in the label, because the person's money is what is left of it.

Limits (inputs above them are refused with a kind message, never silently clamped): income up to $20,000 a week, housing up to $10,000, other regular costs up to $10,000, food budget up to $10,000 (the existing profile fields have no cap beyond finite and non-negative; the sanitiser is tightened only for the two new fields), pay per unit up to $5,000, a payment change up to $5,000 a week, a one-off bill up to $100,000.

## The maths (pure functions, integer cents)

Definitions, per Monday-week, for a baseline `Baseline = { incomeWeekly?, housingWeekly?, otherFixedWeekly?, foodBudgetWeekly? }` (cents, each optional):

- `income` I, `housing` H, `otherFixed` O, `food` F (the food budget, or what the same shopping would cost after a price change), `oneOff` B (extra bills that week; 0 before).
- `leftAfterCosts = I - H - O - B` ("left after the costs you told us about"), null without income. A missing H or O counts as 0 and is listed under "What we don't know".
- `leftAfterFood = leftAfterCosts - F`, null without income or food budget. May be negative, which is shown as "short by".
- `foodDays = min(7, floor(max(0, leftAfterCosts) x 7 / F))`, null without income, or when F is 0 or absent: "the money left after your other costs would cover about N of 7 days of your food budget". This is arithmetic only. It assumes the other costs are paid first, which is how the sum falls, not advice about what to prioritise; the "How we worked this out" line says so.

Rules:

1. **Percentages apply to the baseline figure, never compound and never depend on order.** A pay change of 10% down on $900 is `delta = roundHalfAwayFromZero(90000 x 1000 / 10000) = 9000` cents, computed once per step from the baseline, then all deltas are added.
2. **Floors:** income, housing and food never go below 0 after the change; if one would, it is clamped to 0 and recorded in `clamped`, and the text says so ("Your income can't go below $0 in these sums").
3. **Four weeks:** weeks start at the Monday of the current Monday-week and step by calendar days (`weekStartMonday`, `addLocalDays`, so daylight-saving days of 23 or 25 hours change nothing; the maths has no clock in it, only the labels). Week 1 is the current Monday-week. `lose-work` with `everyWeeks` N affects weeks 1, 1+N, ... within the four; `one-off-bill` affects only its week; everything else affects all four.
4. **Weekly and four-week views.** The result holds `before` (one baseline week), `weeks` (four after-weeks) and four-week totals (the sum of four exact integers, so `before4 = 4 x before` exactly). The default "Each week" view shows the first affected week as the headline and a four-row week strip; "Four weeks" shows totals and the change from now. No averaging is shown, so no rounding hides a cent.
5. **Missing inputs.** If a step needs a baseline field that is absent, `status` is `needs`, `missing` lists the fields, and no figures are shown; the view asks for just that number. If income is absent but not required, `status` is `ok` and the view shows only the changes ("Rent would go up $23 a week, $92 over four weeks") with no "left" lines and the prompt "Add your weekly income to see what's left".
6. **Zero income** is a valid answer (income 0): the sums run, leftovers are negative, and the shortfall copy applies. No division by income is performed anywhere, so no NaN; any share-of-income line is simply absent.
7. **Validation:** a new core `parsePercentBp(text, { max })` (accepts "10", "10%", "7.5", "7.25"; rejects blank, "-5", "1e3", "Infinity", "NaN", more than two decimals, above max) and the existing `parseMoney` with `{ max }`. Every public function treats a non-integer, negative, non-finite or out-of-range number as invalid (`runWhatIf` returns `status: 'invalid'` with the first invalid field) and never throws or returns NaN.
8. All sums stay below 2^53: the largest product is 2,000,000 cents x 10,000 bp = 2e10; a test runs every maximum at once.

## Explaining the result in plain words

`explain(result, scenario, baseline)` returns strings from fixed templates; no text is generated by anything other than these templates, and every number in them is an input or a result.

- **Headline** (neutral, never a verdict): "With this change you'd have $X less each week after the costs you told us about: $A left instead of $B." Zero or negative left: "…the costs you told us about would be $X more than your income." No "will", "must", "should", "risk", "danger".
- **Lines** (Before, After, Change, for income, housing, other costs, one-off bills, food budget, left after costs, left after food, days of food budget covered).
- **How we worked this out:** one sentence per step echoing the person's inputs: "You told us you'd lose 1 shift a week and that a shift pays you $120. 1 x $120 = $120 less income each week." "You told us rent is $450 a week. 10% of $450 is $45, so rent would be $495." Then "Left after costs = income - rent - other costs." and the four-week sentence.
- **What we assumed:** "Everything else stays the same", "a lost shift is paid what you told us", "percentages are taken from today's numbers, not added on top of each other", "weeks run Monday to Sunday starting this week", "rent and other costs are paid first in these sums (this is how the arithmetic is written, not a suggestion)".
- **What we don't know:** "Other income, bills we weren't told about, changes to your payments, or what you'll actually decide." Plus a line for each field the person left blank.
- No prediction, no probability, no score, no band, no "you will go hungry", no comparison with other people.

## What the app can honestly offer next

Shown under **What could help** (a short list of plain links, never instructions), in this order:

1. **Cheaper swaps (existing engine).** A button to Swaps. If the person has swaps in My week from the last 7 days, one sentence of their own arithmetic: "Swaps you added in the last 7 days saved $S. If that happened each week it would cover $min(S, shortfall) of the $shortfall gap." Only shown when both numbers exist; labelled with its assumption. No projected savings are invented.
2. **Budget view** (to set or adjust the food budget and log spending).
3. **Food support** (existing view) and **Nearby**; shown prominently, above the result, when `leftAfterFood` is negative.
4. **Free financial counselling:** National Debt Helpline 1800 007 007, weekdays 9:30am to 4:30pm, chat weekdays 9am to 8pm, ndh.org.au [national-debt-helpline]; Foodbank Find Food [foodbank-find-food]. Both verified in the research on 2026-10-29. No other numbers are added (the research found the Orange Door, Parentline and Safe Steps unverified).
5. The **future trade-off counter**: not depended on and not linked.

**Context rows** (dataset-backed, with source, period, "Older data" and verification labels, via the benchmark source) appear per change kind:

| Change | Rows shown |
| --- | --- |
| `lose-work`, `pay-change` | National Minimum Wage per hour and per week |
| `payment-change` | JobSeeker rows (single no children; with dependent children; partnered each; Energy Supplement) and the ACOSS poverty-line and shortfall rows already in the dataset, each with its own year; never subtracted from one another |
| `rent-change` | Metropolitan Melbourne median weekly rent; Metropolitan Rent Index change |
| `food-price-change` | `b-cpi-food-melbourne`, `b-cpi-food-australia` |
| `one-off-bill` | none (no source found; the screen says "We don't show a typical bill because we have no source for one.") |
| `combined` | the union for its steps |

**Never shown beside a result:** food-insecurity percentages or any figure that reads as "people like you". The research found no Australian source linking a shock to food insecurity, so none is implied. Foodbank and ABS prevalence stay on the Data and policy page.

## Data section: sourced context figures

Stored as indicators in the shared benchmark dataset (new group `whatif`, filtered out of the Budget and Policy views) so the existing generator, verification labels, `isOlderData` and freshness test apply. Every row below comes from the research note on its access date (2026-10-29). Nothing is estimated.

| Id | Figure | Scope and period | Source id | Refresh |
| --- | --- | --- | --- | --- |
| `w-min-wage-hour` | $26.44 per hour | National Minimum Wage, employees not under an award or agreement; from 1 July 2026; awards may pay more | `fairwork-minwage` | must refresh from 1 July 2027 |
| `w-min-wage-week` | $1004.90 per week | same | `fairwork-minwage` | same |
| `w-jobseeker-single` | $824.90 per fortnight basic (previous $808.70) | JobSeeker, single, no dependent children; from 20 September 2026 | `dss-rates-2026-09-20` | must refresh after the next indexation (20 March 2027 expected) |
| `w-jobseeker-energy` | $8.80 per fortnight | Energy Supplement, same list | same | same |
| `w-jobseeker-single-kids` | $883.30 per fortnight basic | single with dependent children | same | same |
| `w-jobseeker-partnered` | $755.10 per fortnight each | partnered | same | same |
| `w-rent-melb-median` | $595 per week (down $5 on the quarter) | metropolitan Melbourne median weekly rent, all lettings, June quarter 2026 | `dffh-rental-report-jun2026` | must refresh when the September 2026 quarter report is out (expected December 2026) |
| `w-rent-index-year` | 4.8% | Metropolitan Rent Index, year to June 2026 (2.5% to June 2025; 10-year average 4.3% a year, in the note) | same | same |
| existing | `b-cpi-food-melbourne` 2.7%, `b-cpi-food-australia` 3.0% (12 months to August 2026); poverty lines and JobSeeker shortfall 2022-23 (flagged dated) | | `abs-cpi-aug2026`, `acoss-2026-medianet` | next monthly CPI; ACOSS when a newer edition is read |

Refresh mechanics: a new optional `refreshAfter` (YYYY-MM-DD) on `Indicator`, validated by `scripts/build-benchmarks.mjs`, never shown. `npm run build:benchmarks` prints a warning (exit 0; non-zero only with `--strict`) for any indicator whose `refreshAfter` has passed in Australia/Melbourne, mirroring the cultural calendar. The dates above are reminders, not claims; the builder confirms the cadence from each source. Licence strings are carried from the research (Fair Work and DSS "Not verified, figures only"; DFFH "Creative Commons Attribution per the data.gov.au listing"), so the Sources disclosure shows them honestly. Facts are recorded; no text or layout is reused. The Foodbank Hunger Report 2026 update is a separate, deliberate dataset task and is not part of this feature.

Context figures are **never** used as arithmetic defaults. A rent field is not pre-filled with $595.

## Saving, naming, comparing, resetting

- **Saved what-ifs** live in `Profile.whatIfScenarios?: SavedWhatIf[]`, `SavedWhatIf = { id: string; name: string; scenario: Scenario; savedAt: string }`. They store the change only (kind and inputs), **never the results and never the baseline numbers**, so a saved what-if recalculates against today's numbers when opened and nothing is stored twice. Per profile (guest uses the guest key), device-only, never sent anywhere.
- **Naming:** a text field with a default name from the change ("Rent up 10%", "Lose 1 shift a week"), 1 to 40 characters after trimming (`cleanText` rules), duplicates allowed. Rename in place.
- **Cap 10.** The 11th is refused with "You can keep up to 10 what-ifs. Remove one to save another." The oldest is never silently dropped, because a name the person chose is theirs.
- **Remove** with Undo for 6 seconds (the budget pattern); **Clear all** with Undo. `restore` puts it back in place.
- **Compare two:** choose any two saved what-ifs (or the current draft as one of them) and see a two-column table with the same lines, plus a plain sentence per key line: "Second leaves $X a week more than first." Equal reads "Both leave the same." The words "better" and "worse" are never used. Both are run against today's numbers; the screen says so. If either needs a missing number, it says which.
- **Start again** clears the draft inputs and results (in memory only; the draft is never persisted) and returns focus to the first control. It touches no saved what-if and no "Your numbers".

## Accessibility

- One `h1` ("What if"); results get an `h2` that takes focus when "Show what changes" is pressed (the `useFocusOnViewChange` pattern). Results are not auto-recalculated on each keystroke and there is no live region that chatters; one `role="status"` line announces "Results ready" plus the headline once.
- Every field has a visible label, uses `INPUT_CLASS`/`FIELD_EDGE`, `inputMode="decimal"` and an `aria-describedby` hint; errors use `aria-invalid` and a text message in plain words, never colour alone. Direction and kind pills are a `radiogroup` with roving arrow keys; 44px targets; visible focus ring.
- Before and after is a real `<table>` with a caption, `th scope`, and tone steps instead of hairlines; the compare view likewise. On a 320px screen each row stacks (label above its three values) without horizontal scroll.
- The plate dial (days of food budget covered, before and after) has a text equivalent in the table and a `role="img"` label; it is never the only carrier of meaning, uses no red, and respects reduced motion (final state, no fill animation).
- Contrast AA in all four themes through the semantic colour names; the notice and the help list use `text-ink`/`text-muted` at the existing sizes.

## Copy

Exact strings live in `src/ui/whatIfCopy.ts` (one place, tested). Tone is kind and non-shaming.

- **Notice (always shown):** "General information, not advice. This does simple sums on the numbers you give us, here on your device. It doesn't know your whole situation, can't tell you what will happen, and isn't financial advice. For advice that fits you, a free financial counsellor can help: National Debt Helpline 1800 007 007."
- **Privacy line under Your numbers:** "These numbers stay on this device. Nothing is sent anywhere, and there's no sharing button on this page."
- **Shortfall:** "These numbers don't stretch to cover everything. That's about the sums, not about you. These can help:" followed by the help list.
- **Needs a number:** "To work this out we need your weekly rent. Add it above, or choose a change in dollars instead."
- **Saved full, invalid, empty:** "Nothing saved yet. Try a change above and save it to compare later." "That's more than we can work with here (up to $20,000 a week). Check the number?" "Please enter an amount like 120 or 120.50."
- Words banned from the feature (a test scans the copy): advice-giving verbs ("you should", "you must", "we recommend"), "overspend", "fail", "afford", "risk", "danger", "hunger score", "safe", "good", "bad", "better", "worse", "AI", "smart", "predict".

The wording of the notice for "general information vs general advice" is not legal review. **Legal review is an open user decision** [moneysmart-general-personal]; until it is made, the notice is the ceiling of what the feature claims, and the feature carries a docs note "do not launch publicly before legal review".

## Privacy and its tests

Rules: no `fetch`, XHR, beacon, WebSocket, `navigator.share`, clipboard write or `console.*` in `packages/core/src/whatif` or the What if views; no new server route; nothing from this feature in the URL, `document.title`, `data-` attributes or any storage key other than the profile key; the share text never includes it. `src/ui/whatIfPrivacy.test.tsx` (modelled on `foodPrivacy.test.tsx`: spies installed before the flow, detectors proven live) enters distinctive sentinel numbers and a sentinel scenario name, runs, saves, compares, removes and resets, then asserts: zero network calls; no storage write outside `culinerity.profile.v1(.<id>)` (and `culinerity.theme.v1`); the profile JSON contains only the expected fields and contains no result figures; the sentinel never appears in `document.title`, `location`, `data-*`, any `console` call, the My week share text or the `Menu`; deleting a profile removes the scenarios; "Start my own profile from current data" carries them; a core test (static) fails if `packages/core/src/whatif` contains a banned token or imports anything outside core; `platformFree.test.ts` still passes. The app's existing "no third-party requests" rule and the absence of any AI SDK in `package.json` are asserted by a test that reads the dependency lists.

## Edge cases (each has a test)

Negative or minus-signed text; `NaN`/`Infinity`/`1e9`; blank; zero income (valid); zero food budget (no days line); zero rent; rent percent with no rent entered (needs); huge values at every cap at once; a change that would drive income below zero (clamped, said); the 11th save; corrupt stored scenarios (dropped on load, others kept); duplicate ids (first wins); a saved what-if whose inputs are now invalid (dropped by the sanitiser); the week containing the 5 April and 4 October 2026 daylight-saving changes (labels seven days apart); Sunday 23:59 vs Monday 00:00; `combined` with duplicate kinds (refused) and nested `combined` (refused); changing "Your numbers" after saving; profile switch resets the draft; reduced motion.

## Constraints

Plate design system (flat colour, round shapes, Schibsted Grotesk, no cards, shadows, hairlines or gradients, 44px targets, one `h1`, no horizontal scroll at 320 to 1280). Platform-free core. Mock-first and sourced: every figure on screen is an input, a result, or a dataset row with its source. Kind, non-shaming tone. No financial advice. TDD. No new dependency.

## Goals / non-goals / anti-goals

- **Goals:** let a person see arithmetic consequences of a change on their own numbers, safely and privately; explain every step; point to real help.
- **Non-goals:** prediction, scoring, advice, tax or payment-eligibility modelling, bank connections, sharing or export, an LLM explainer, a start-date picker, repeating schedules beyond every 1, 2 or 4 weeks, inflation modelling.
- **Anti-goals:** a risk or food-insecurity forecast, "better/worse" verdicts, pre-filled numbers that look like facts, saving results, nagging.

## Calls made

1. A transparent rule engine, no AI. 2. Integer cents and basis points. 3. Percentages from the baseline, additive, order independent. 4. Four Monday-weeks starting this week. 5. "Money left" means after the costs the person entered; food days is arithmetic. 6. Two new optional profile fields; scenarios store inputs only. 7. Cap 10, refuse not drop. 8. Context rows in the shared dataset under a new `whatif` group with `refreshAfter`. 9. No sharing or export. 10. No food-insecurity statistics beside results. 11. Draft in memory only.

## Left to the builder

File and component names beyond those named; layout of the form and week strip; plate sizing; exact template wording within the tone rules; the generator's warning format.

---

## Builder-check rulings

Reviewer pass following `builder-check-prompt.md`: the reviewer is a software engineer handed only this document, unable to ask the author. The user is unavailable, so each question is ruled below and the ruling is binding for the plan. (Run by the author in the reviewer role, as instructed; not by a separate subagent.)

1. **What is "money left for food" when we only know four numbers?** Ruled: there is no single "money left for food" claim. The model has `leftAfterCosts` (income minus the costs entered), `leftAfterFood` (that minus the food budget) and `foodDays` (days of the food budget the money after costs would cover, capped at 7). The screen always says other bills we were not told about are not in the sum, and the optional "other regular costs" field exists so a person can include them.
2. **Does a food price rise change the person's Budget view?** Ruled: no. It raises the food amount in the what-if only (`F x (1 + bp)`); `foodBudgetWeekly` in the profile is never modified by a scenario.
3. **Does the person enter pay per week, fortnight or month?** Ruled: an "Enter as" choice for every recurring amount; `toWeeklyCents(cents, per)` is week x1, fortnight /2, month x12/52, each rounded half up to a cent once, at entry. Weekly cents are what the model uses; the unit entered is kept in the step only so the echo reads in the person's words.
4. **Do percentages compound or depend on the order of steps in a combined change?** Ruled: no. Each is a share of the baseline; deltas add; order is irrelevant; tests assert permutation invariance.
5. **Rounding and signs.** Ruled: half away from zero on each delta, integer cents throughout, no floats after parsing; direction is a separate field, never a signed input.
6. **What is "week 1", and does today's weekday matter?** Ruled: week 1 is the current Monday-week and the maths ignores the clock; `now` only labels the weeks. A mid-week start is not modelled (non-goal).
7. **Do saved what-ifs store results or baseline numbers?** Ruled: no, inputs only; they recalculate. This is also the privacy minimum.
8. **What happens at the cap, and on corrupt storage?** Ruled: the 11th is refused with the stated message; the sanitiser drops invalid or duplicate-id items, keeps the rest, and never throws.
9. **Where does the sourced context live and how do the Budget and Policy views stay unchanged?** Ruled: new `IndicatorGroup` value `whatif`; the Budget and Policy views already filter by group; the existing tests that count groups or indicators are updated deliberately in the data task. `refreshAfter` is optional and ignored by the UI. Existing rows (CPI, poverty lines) are referenced by id, not duplicated; a test checks every id in the context map exists.
10. **May a scenario show Foodbank or ABS prevalence as context?** Ruled: no (see above); it would read as a forecast.
11. **Is the lost-shift pay defaulted from the minimum wage?** Ruled: no default; required input; the minimum-wage rows are context only.
12. **Navigation and entry points.** Ruled: `View` gains `'whatif'`; Menu label "What if" after "Budget"; one quiet link on the Budget view; no change to the footer; `homeFor` unchanged.
13. **Sharing, export and printing.** Ruled: none in this version (privacy minimum).
14. **Who writes the legal wording, and does launch wait?** Ruled: the builder uses the notice text above verbatim; the docs record "legal review pending; do not launch publicly before it". Whether to launch is the user's call.
15. **Does Start again clear "Your numbers"?** Ruled: no; it clears only the draft change and the results.
16. **Result of a step that needs a missing baseline number while others are fine (combined).** Ruled: `status: 'needs'` for the whole combined change with the list of all missing fields; no partial figures.
17. **Hours vs shifts counts.** Ruled: 0.5 steps, shifts 0.5 to 14, hours 0.5 to 60; the lost amount is `round(count x 2) x payPerUnit / 2`, rounded half up to a cent.
18. **Branding.** Ruled: no "AI" label in the UI; revisit only on the user's decision.

Nothing important is left that the builder cannot decide.

## Decisions only the user can make

1. Legal review of "general information" before any public launch.
2. Whether to call the feature "AI" or "smart" in the UI despite being rule-based.
3. Whether a later opt-in AI explainer should ever exist (out of scope here).
4. Whether the Foodbank 2026 dataset update ships with or before this feature.
5. Whether to allow sharing or export in a later version.
