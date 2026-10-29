# Trade-off counter: design

Requested by the user on 29 October 2026: "a trade-off counter to count how many trade-offs you have to make in order to be food secure, such as not buying your child a toy in order to keep food on the table or not buying something nice for yourself." Written without a question round (the user is unavailable); every decision is the designer's call and the user can change any. **Where "Builder-check rulings" at the end disagrees with an earlier section, the rulings win.** Evidence is in `docs/superpowers/research/2026-10-29-whatif-pantry-tradeoffs.md` section C (sources in the JSON beside it). Builds on the meals tracker (`2026-10-27-cultural-food-design.md`, ruling 6), the budget tracker (`2026-10-26-budget-tracker-design.md`) and the plate design system. No dependency on the what-if or pantry features.

## Intent and why

Households under strain give things up to keep food on the table: a treat for themselves, a toy for a child, a meal, a bill paid late. The app already measures worry (the check-in) and savings (swaps, budget). It does not let a person see, in their own words, what keeping food on the table cost them. This feature is a **private record**: the person logs what they gave up, sees it as a plain list and a sentence, and (only if they choose) shows a trusted person a summary.

Why it needs great care (from the research): 48% of food-insecure households cite embarrassment as a reason for not seeking help; the data could reveal hardship and, for child entries, could be misread as child welfare concerns; no validated measure of a "trade-off cost" was found. So: no targets, no scoring, no comparison, no moral words, device only, one-step delete, calm support instead of alarm.

**Honesty of the phrase "how many trade-offs to be food secure".** The counter cannot say how many a person "should" make or what number means "secure". It records what the person actually gave up. The count sentence is "N trade-offs this week: this is what keeping food on the table cost", and an optional fixed reflection says "Keeping food on the table should not cost this much." That line is about the situation, not the person, and is identical for every count (no thresholds). The screen says it is not a validated measure and is just a record.

## What gets built

1. **Trade-offs view** (`tradeoffs`, in the Menu as "Trade-offs"): h1 "What we went without", the count sentence, this week's entries, "Last week" and "Earlier" disclosures, a two-tap log, Remove with Undo, "Clear all my trade-offs" with Undo, privacy lines.
2. **Safe-messaging support card** shown calmly after certain entries, and a collapsed "Need a hand?" disclosure always on the view.
3. **Optional "Show someone I trust" summary**: explicit opt-in, local, printable, notes excluded unless ticked.
4. Core module `packages/core/src/tradeoffs` (pure, platform-free): categories, entry type, sanitiser, add/remove/restore, Monday-week grouping, support tiers, summary builder. `Profile.tradeoffs?: TradeoffEntry[]`.

Non-goals: scores or bands, a total over time, charts or trends, goals, streaks, badges, reminders or notifications, sharing, export to a file, any server call, reporting of any kind, advice on what to cut, links to unverified services.

## What counts as a trade-off (own wording, ten categories)

The app's own plain wording; validated survey items (CSI, FIES, HFSSM, the Foodbank list) are **not** reproduced (licences unknown or not open). The categories follow the kinds of coping the research describes (social, personal care, energy, fresh food, deferred payments, meals) without copying any wording.

| id | Label (shown) | Support tier |
|---|---|---|
| `self-treat` | Went without something nice for myself | none |
| `child-want` | Did not buy my child something they wanted | none |
| `meal-skipped` | Skipped or shrank a meal myself | food |
| `child-meal` | My child had a smaller meal, or went without one | food+child |
| `cheaper-food` | Bought cheaper food we like less | none |
| `bill-delayed` | Paid a bill late, or put it off | money |
| `borrowed` | Borrowed money or used savings | money |
| `health-skipped` | Skipped medicine or a health visit | health |
| `cut-back` | Cut back on heating, transport or seeing people | none |
| `other` | Something else | none |

`other` is the only category where the note is the description (shown as "Something else: <note>"; a blank note shows "Something else"). Wording: "went without", never "sacrificed", "deprived", "only", "failed", "had to". Order is fixed (as above) so the position of a pill reveals nothing.

## Logging (two taps, optional note)

- Tap 1 "Add a trade-off" opens a group of the ten category pills (44px, round, `aria-pressed` not used: pills are buttons that save). A small "Change day" (this week or last, default Today), as in `AddMeal`.
- Tap 2 on a category **saves immediately**. A `role="status"` line reads "Added: Skipped or shrank a meal myself, today. Add a note | Undo". "Add a note" reveals one optional text field (max 140 chars, counter only as text "n of 140" when over 100) with Save note; skipping is fine. For `other` the note field opens straight after the tap (still optional; Skip leaves "Something else").
- Support card (see below) appears under the status line for the tiers above.
- Remove: each row has Remove (aria-label names the entry and day); "Removed. Undo" status. Undo restores and works for several removals (stack, as in `MealsView`). No timers on undo (WCAG 2.2.1): the Undo stays until the person leaves the view or acts again.
- **Clear all my trade-offs**: removes `Profile.tradeoffs` (no confirmation dialog; Undo is the safety net, "Cleared. Undo" until the person leaves the view, held only in React state, so leaving the view makes it permanent). Shown only when entries exist.

## The week view

- Monday week, DST-safe, reusing `weekBounds`, `addLocalDays`, `dayIndexMonday`, `isInWeek` from `budget/week.ts`.
- Count sentence (large body text in display weight, **no dial, ring, bar, colour or large numeral**): "1 trade-off this week: this is what keeping food on the table cost" / "N trade-offs this week: ...". Empty: "Nothing logged this week. Log one only if you want to." (never "0").
- Under it, the plain line "This is just a record. There is no right number. It is not a test or a score." and, when the week has at least one entry, the fixed reflection.
- This week's entries newest first (label, day, note if any, Remove). There is no by-category tally on the view; the list itself is the record (no weighting: a skipped meal and a skipped haircut are never added into a score).
- "Last week" and "Earlier" (weeks 3 to 8, grouped by week with the plain heading "Week of Mon 12 Oct") are `Disclosure`s listing entries with Remove; no counts in the headings, no deltas, no "up/down", no "better/worse", no comparison text. Every stored entry is therefore visible and removable (nothing is hidden in storage).
- Never combined with the FIES score, the band headline, the check-in history, the budget plate or any benchmark. One optional, quiet text button "See my food budget" (goes to `budget`) when the week has an entry. No other cross-links in this feature (a what-if link may be added by that feature later).
- Colour: neutral `ink`/`muted`/`surface` only; no red, amber, alarm icons or warning styling.

## Safe messaging

When an entry in tier `food`, `food+child`, `money` or `health` is logged (not on load, not retroactively), a calm **support card** appears inline below the status line. It is not a modal, alert, banner, `role="alert"` or colour change; it can be closed ("Close"); its appearance is never stored, counted or logged. Copy (exact, in `tradeoffCopy.ts`):

- Heading (h2): "If it would help"
- Body: "Plenty of people go without to get by, and help exists. None of this is reported to anyone."
- `food` and `food+child`: link "Find free food near you" (Foodbank Find Food, `https://findfood.foodbank.org.au/`, `ExternalLink`) and button "See food support places" (goes to the existing `support` view).
- `money` and `health`: "National Debt Helpline, free financial counselling: 1800 007 007 (weekdays)" (`tel:`). The health tier shows these two lines plus the Lifeline line below, and nothing about medicine advice (not researched).
- All tiers shown: "If things feel heavy: Lifeline 13 11 14, any time. In danger, call 000." (`tel:`).
- `food+child` only: "If your child wants someone to talk to: Kids Helpline 1800 55 1800." (`tel:`).
- **Never shown**: 1800RESPECT (the entries are not about violence or safety; the unverified Orange Door, Parentline Victoria, Safe Steps are not shown anywhere), any mention of child protection, welfare, neglect, mandatory reporting or authorities, any alarm wording, any instruction to the person.
- A collapsed `Disclosure` "Need a hand?" is always present on the view with the same links (Find Food, Food support, National Debt Helpline, Lifeline), so help is reachable without logging anything. The Kids Helpline line is in it too, worded for a parent: "Kids Helpline, for children and young people: 1800 55 1800."
- Numbers and the Foodbank URL were verified on official pages on 29 October 2026 (research C3); the dataset holds a `verifiedOn` date and a test pins the digits. A practitioner review of this card and the category wording is an **open user decision**.

## Retention, caps, validation

- Retention: **8 weeks** (`TRADEOFF_RETENTION_WEEKS = 8`), the same rule as meals; entries older are dropped by the sanitiser when `now` is given (on load in `App`, as for meals). The view says: "We keep the last 8 weeks on this device, then they go."
- Caps: `MAX_TRADEOFFS = 150` (newest kept via `capNewestByAt`); `MAX_NOTE = 140`.
- Entry: `{ id: string; at: ISO date-time; category: TradeoffCategory; note?: string }`. Sanitiser: arrays only; valid non-empty id; `isIsoDateTime(at)`; category must be a known id (an entry with an unknown category is **dropped**, never coerced); note trimmed, NFC, control and zero-width characters stripped, whitespace collapsed (reuse `cleanText` from `food/sanitize.ts`), over 140 characters rejected on add and truncated-by-rejection on load (the whole note is dropped, entry kept); blank note omitted; unknown fields removed; first id wins; empty result stores nothing (`Profile.tradeoffs` absent, not `[]`). Free text is rendered through React only.
- `addTradeoff(list, entry, now)`: `at` not in the future and not before last Monday's start (same window as `addMeal`); invalid or repeated id leaves the same array.
- Edge cases: clock change or DST (Monday maths via local-day helpers; tests across 4 Oct 2026 and 5 Apr 2026 transitions in `Australia/Melbourne`); an entry logged at 23:59 Sunday counts in that week; a profile with `tradeoffs: 'junk'` loads as absent; storage unavailable (store never throws, existing behaviour); two tabs: last write wins (existing); a very long list; emoji and right-to-left notes render as text.

## Privacy

- Stored only in the profile JSON on the device (`culinerity.profile.v1` or `.<id>`), per profile, never sent, never shared, never in the share text, `WeekCard`, URL, `document.title`, `data-` attributes, console, notifications or any other key. Profile delete removes it; "Start from my current data" carries it (the copy on the view says "These stay with this profile on this device."). The server receives nothing.
- Shared-device sentence: "Anyone who can open this browser as you could see this. Use a profile with a passcode on a shared device." and the lock is not encryption (AGENTS.md; never claim more).
- `shareText` and the week share never include anything from this feature; the score, band, check-in and budget never read it.
- Summary view: see below.

## Optional summary: "Show someone I trust" (decision: include, built last)

Justification: financial counsellors and caseworkers ask what a household has given up, and a person who has to recall it from memory in a stressful appointment is worse served than one with a record. Risks: print leaves the device and may expose child or hardship details. So it is **explicit opt-in, local only, and the person controls every field**:

- Entry point: a text button at the bottom of the view, "Show someone I trust". It opens a panel with the explanation: "This makes a page you can print or show on screen. Nothing is sent anywhere. Printing may leave a copy on a shared printer."
- Choose what to include: a checkbox per category (default ticked except `child-want` and `child-meal`, default unticked), "Include my notes" (default **unticked**), and the period (last 4 weeks, default, or last 8 weeks).
- Output (on screen and print): "Things we went without, <date range>", then for each included category and each week a plain count ("Week of Mon 12 Oct: Skipped or shrank a meal myself, 2"). Free-text notes appear only if ticked, and then only for included categories. No total, no score, no band, **no name, no suburb, no profile data**.
- Print: `window.print()` with print styles that hide the app chrome; no download, no file, no clipboard, no Web Share, no URL, no storage of the selections (React state only, discarded on leaving). `document.title` is never changed to hold content.
- Not a verified record: footer line "A personal record kept by the person. Not a validated measure."
- Because it is a separate task, the user can cut it without touching the rest.

## Accessibility and layout

- One h1 per view ("What we went without"), focus moves to it on arrival (`FocusHeading`). Landmarks and headings: h2 for "This week", "If it would help", "Need a hand?", `Disclosure` for the rest.
- 44px targets, `focus-ring`, `motion-colors`, no motion beyond the plate language, nothing time-limited, status in `role="status"` (polite), no `role="alert"`.
- Pills in a `role="group"` named "Add a trade-off"; the text field uses `FIELD_EDGE`/`INPUT_CLASS` with a visible label; checkboxes in the summary are real inputs with labels.
- No horizontal scroll from 320 to 1280; all four themes (`node scripts/contrast.mjs` unchanged, semantic colours only); reduced motion respected.
- Plain Australian English, sentence case, no jargon, no emoji.

## Wording list (exact; with source or reason)

| Where | Copy | Source or reason |
|---|---|---|
| Menu | Trade-offs | short, neutral |
| h1 | What we went without | household framing, no moral word |
| Intro | A private record of what keeping food on the table cost. It stays on this device. Add only what you want to. | privacy first (research C3) |
| Count | N trade-offs this week: this is what keeping food on the table cost | user's wording |
| Empty | Nothing logged this week. Log one only if you want to. | no "0" (meals pattern) |
| Disclaimer | This is just a record. There is no right number. It is not a test or a score. It is not a validated measure. | research C4 |
| Reflection | Keeping food on the table should not cost this much. | situation, not person; fixed |
| Reassurance (optional, once, in "Need a hand?") | Going without to get by is common. | Foodbank Hunger Report 2026 shows these behaviours are common among households under strain (research C1, A1); no percentage, no comparison shown |
| Retention | We keep the last 8 weeks on this device, then they go. | matches meals |
| Clear | Clear all my trade-offs / Cleared. Undo | meals pattern |
| Support | see Safe messaging | research C3 |
| Shared device | Anyone who can open this browser as you could see this. Use a profile with a passcode on a shared device. | meals ruling 5 |

Banned words in this feature's files (a test greps `tradeoffCopy.ts` and the view): fail, failed, only, deprived, neglect, report, reported (except the support-card sentence "None of this is reported to anyone", which is allow-listed exactly), score (except the disclaimer line, allow-listed), goal, target, streak, badge, good, bad, better, worse, should (except the reflection line, allow-listed), must.

## Privacy test plan (`src/ui/tradeoffPrivacy.test.tsx`, plus core tests)

Same method as `foodPrivacy.test.tsx` (spies installed before the flow, detectors proven live, fix the code not the test):
(a) `shareText` and the week share contain no trade-off string for a profile with every field set, and the check-in score and budget output are identical with and without `tradeoffs`;
(b) with HTTP services and `fetch` spied, a full flow (log, note, remove, undo, clear, support card, summary) makes no request containing any note, category id or label;
(c) only the profile storage key changes (`Object.keys(localStorage)` before and after; nothing in `sessionStorage`, cookies, IndexedDB); no `navigator.share`, `navigator.clipboard`, `navigator.sendBeacon`, `Notification`, `history.pushState` calls;
(d) no `console.*` in the tradeoffs files (grep test);
(e) Clear removes the key from the stored JSON, profile delete removes it, "Start from my current data" carries it;
(f) no trade-off text in `document.title`, the URL, or any `data-` attribute (searching the DOM for note text inside attributes);
(g) support card: appearing does not write storage or call fetch; closing it writes nothing;
(h) the summary excludes notes unless ticked and never includes unticked categories, name, suburb or score; printing calls only `window.print`;
(i) core platform-free test still passes; the server tests need no change.

## Calls made (designer)

Own-wording categories; two child categories kept because the user asked for a child's trade-offs and because they are the ones needing care; fixed reflection; 8-week retention; summary included but last; no ring so hardship is never drawn as a "full" shape; no timers; the Foodbank link and four helplines only.

## Left to the builder

Pill layout and spacing, the exact illustration (reuse `EmptyPlate`), file split inside `src/ui`, print stylesheet details, focus order inside the card, and test fixtures.

## Builder-check rulings

Run on 29 October 2026 as the builder-check reviewer (`brainstorming/builder-check-prompt.md`), role: a talented software engineer handed this document and unable to ask the author. The user is unavailable; every question was ruled by the reviewer, preferring privacy, respect, accuracy and simplicity. The user may overturn any ruling.

Questions, ranked by how much a wrong guess would matter:

1. **Does logging a food-related entry trigger the support card every time, and is that itself a risk?** Ruling: yes on each log of those tiers, inline, closable, never modal, never stored, never counted. Repetition is acceptable because the card is short and the "Need a hand?" disclosure carries the same links; fatigue is a lesser harm than a missed help moment. No "do not show again" setting (that would be a stored flag revealing prior triggers).
2. **Should child-meal entries produce any message about child welfare?** Ruling: no. Not one word about welfare, protection, neglect or reporting; Kids Helpline is offered as a place for the child to talk, worded neutrally. Mandatory reporting was not researched and is not touched. Open for the user: legal/practitioner advice before any such wording.
3. **Does the summary view ship?** Ruling: yes, as the last feature task, behind explicit opt-in; notes off by default; child categories off by default; print only, no share or export. If the user dislikes it, delete Task 4 and the button; nothing else depends on it.
4. **Retention length.** Ruling: 8 weeks, consistent with meals (`TRADEOFF_RETENTION_WEEKS` is one constant, so shortening to 4 is a one-line change). The view lists every stored entry (Last week, Earlier) so nothing is hidden.
5. **What exactly may be shown as a number?** Ruling: only the count sentence for the current week. No count in Last week or Earlier headings, no totals across weeks, no by-category totals, no deltas, no ring, no dial, no big numeral. The summary has per-week per-category counts, only when the person asks and only for categories they ticked.
6. **The reflection line "It should not take this much".** Ruling: fixed text "Keeping food on the table should not cost this much." shown whenever the week has at least one entry, identical for every count, no threshold. It is the only normative sentence and is allow-listed in the wording test. Practitioner review of it is open.
7. **Does an entry flow into the FIES score, bands, My week, the share text or the Budget?** Ruling: never; tests (a) and (c) pin it. Different measures are never combined (house rule).
8. **Which helplines, and which are excluded?** Ruling: Foodbank Find Food, National Debt Helpline, Lifeline, Kids Helpline (child tier only plus the disclosure). 1800RESPECT is excluded from this feature (entries are not about violence; showing it could cause harm if seen by a controlling person). Orange Door, Parentline Victoria, Safe Steps are unverified and absent; Victorian specifics come from the existing support dataset via the Food support view.
9. **Guest profile and shared devices.** Ruling: guest data sits under the guest key; the shared-device sentence appears on the view and a guest sees the same sentence; no extra gating. "Start from my current data" carries entries because it is the same person's choice; the Create profile screen's existing copy is unchanged and the view states "These stay with this profile on this device."
10. **Dates: can a person log for earlier days?** Ruling: yes, today or any earlier day in this or last Monday week via "Change day", same as meals; nothing in the future.
11. **Category set and "Something else".** Ruling: ten fixed categories as listed; `other` uses the note as its description; no custom categories (they would be free-text identifiers and complicate the summary). Practitioner review of wording is open.
12. **Undo semantics and timers.** Ruling: no timers; undo lasts until the person leaves the view or acts again; clear-all becomes permanent on leaving (stated in the status text: "Cleared. Undo (this goes when you leave this page)").
13. **View id, menu position, h1.** Ruling: `View` gains `'tradeoffs'`; Menu item "Trade-offs" after "Meals that felt like home"; h1 "What we went without"; focus handled by `FocusHeading` like the other views.
14. **Dependencies on sibling features (what-if, pantry).** Ruling: none. The only link out is to the existing Budget view. A what-if link is a later one-line addition by that feature.
15. **Print mechanism.** Ruling: `window.print()` only, with print CSS hiding chrome; no PDF generation, no clipboard, no `document.title` change; selections in React state.
16. **Error handling when storage is full or unavailable.** Ruling: unchanged store behaviour (never throws); the view keeps working in memory for the visit; no extra message.

Nothing important left after these rulings.

### Open for the user

- Practitioner review (food relief or financial counselling) of the category wording, the reflection line, the support card and the summary.
- Whether to ship the optional summary at all.
- Retention (8 weeks vs shorter).
- Whether child-related categories should be offered at all before legal advice on child-welfare implications, and whether to verify and add Orange Door, Parentline Victoria or Safe Steps.
- Whether the FAO/CSI-style validated items should ever replace the app's own wording (needs licence checks).
