# Culinerity: what has been built

Status as of 28 October 2026. "Branch" says where the work lives; nothing here has been pushed beyond `origin/main` (6db289d).

## On `main` (pushed)
- **Food-insecurity check-in:** FIES-based questionnaire giving a 0 to 100 "cognitive load of hunger" score (100 = secure, 0 = critical).
- **Craving swaps:** pick a craving, get cheaper and healthier alternatives ranked by your score (cheaper at low scores, healthier at high).
- **Melbourne prices:** mocked Coles/Woolworths/market price source behind an interface, ready for a live source.
- **Food support:** local help and relief options list.
- **Monorepo:** web app, `@culinerity/core` (platform-free logic) and `@culinerity/server` (Hono + SQLite reference data), 13 CC0 food photos, tests.

## `feature/plate-redesign` (complete, unpushed)
- **Plate design system:** the plate is the dial; round photos, pill buttons, Schibsted Grotesk, no cards or shadows, AA contrast enforced by a script.
- **Welcome page** for new users with real home-cooked-meal photos.
- **Four cover themes** (tobacco, sand, walnut, cream) with a picker; single token source with a drift test.
- **One-question-at-a-time check-in**, the number screen, swaps with "Add to my week", food support, friendly empty/error states.
- **My week** card with savings and a share text (no personal data in it).

## `feature/sign-in` (complete, unpushed)
- **Local, on-device profiles:** create, sign in, switch, lock, delete (typed-name confirmation); avatars and colours.
- **Optional passcode:** PBKDF2-HMAC-SHA-256 (210,000 rounds, random salt), session in `sessionStorage`, soft 30 s pause after 5 wrong tries.
- **Move guest data** into a new profile; per-profile storage; corrupt-storage and cross-tab protections.
- Honest copy: a local lock, not encryption or account security. README/AGENTS document limits and how to reset.
- Visible 2px field edges (WCAG 1.4.11) across every input; plate favicon.

## `feature/budget-policy` (complete, unpushed)
- **Sourced benchmark dataset** (20 sources, 37 indicators, 12 Melbourne areas, 6 interventions) with a generator (`npm run build:benchmarks`), freshness test, "Older data" labels and verification labels. Verified against ABS, Foodbank, VicHealth and other sources. No invented numbers.
- **Budget tracker:** Monday-week maths (DST-safe), plate showing what is left, pace message, add/remove/undo spending, past weeks, saved-with-swaps, income sentence and "How this compares" with cited figures.
- **Data and policy dashboard:** plain-language sourced figures with dials, bars and scales, Melbourne areas by disadvantage, what helps, gaps listed, sources, and a print layout. Reached from the Menu and the footer.

## `feature/visuals` (complete, unpushed)
- **Photo headers** for budget, policy and sign-in, and **empty-state visuals**, in the plate design.

## `feature/nearby` (complete, unpushed)
- **Nearby cheap and healthy options** (spec `docs/superpowers/specs/2026-10-26-nearby-options-design.md`): markets, grocers, free meals and relief places ranked by straight-line distance, with kind and price filters, access labels ("Referral needed", "Membership"), dated notices (for example the Dandenong Bazaar closure) shown only while they apply, and Open in Maps links (no directions or routing).
- **Starter set, not a directory.** The list is 15 places we could check against the operator's own page, mostly markets in a few Melbourne areas. The view says so and builds its coverage line from the data. It is not every place, and it has no Casey relief places yet, so the Free filter can be short.
- **Typical vs stated prices.** A price is "stated" only when the source says so ("free", a price); "affordable" alone is not, so the seven Community Grocer markets are a typical budget estimate, listed under All and Fresh produce but not Low cost. A market or grocer at the middle band is a "typical" estimate for that kind of place and is labelled that way; the Free filter trusts stated prices only.
- **Privacy rule: location is never stored or sent.** A device position (only after "Use my location" is pressed) is rounded to 3 decimals, held in memory for the view, and discarded on leaving, on "Clear my location" and on unmount. Typed suburbs and postcodes are matched against a bundled table of ABS centroids with no geocoding service. Nothing is written to storage, the profile, the share text or the network.
- **Licence decision.** The City of Casey "Emergency Food Relief Groups" list is not imported: the state portal says CC BY 3, but the publisher's own page states no licence ("All rights reserved"), so it was treated as ambiguous. OpenStreetMap is not used (ODbL would apply to our dataset). Places are entered as facts, one at a time, from operator pages. Sources and licences show in a "Where this comes from" disclosure.
- **Refresh.** Edit `docs/superpowers/research/2026-10-27-nearby-places.json`, run `npm run build:places`, commit the JSON and `packages/core/src/places/generated/places.generated.ts`. For suburb and postcode centroids (ABS SAL and POA 2021, CC BY 4.0) follow `docs/superpowers/research/README.md`, then `npm run build:centroids`. Tests fail if a generated file is out of date. Never add a place without a source URL, licence text and checked date.

## `feature/cultural-food` (complete, unpushed)
- **My food** (spec `docs/superpowers/specs/2026-10-27-cultural-food-design.md`): optional, skippable setup of food traditions (10 with catalogue items, plus the person's own words), diet rules, things to avoid and occasions, all stored on the device in the profile. Clearing is one tap with Undo.
- **Cultural food in Swaps:** 49 sourced cultural foods and 57 swaps with nutrition from AFCD Release 3 (CC BY 4.0). Cultural items appear only for a person who chose at least one of their traditions (and the item is tagged with it); the original items stay for everyone. A person with no chosen tradition (no food profile, an empty one, or only rules or allergies) sees exactly the pre-branch swaps, pinned by a golden file recorded from the code at 88d044a, and cultural cravings are not found by search for them. Settings then hide items with a chosen allergy, hide or mark "Check the ingredients" for rules (unknown never passes), lead the picklist with the person's traditions, and mark "Fits your kitchen". The "Nutrition estimated from public food tables." note shows only when a cultural item is on screen.
- **Meals that felt like home:** a Monday-week ring and a two-tap log with optional dish and who with; this week and last; Remove, Undo, Clear. No streaks or targets.
- **Occasions and reminders:** 13 occasions with a calendar to 2029 (Hijri by calculation, Easter by computus, Lunar New Year cross-checked with the Hong Kong Observatory, Hebcal for Jewish festivals). A quiet in-page line in Swaps and "Coming up" in My food; no push or notifications.
- **Privacy:** nothing about food leaves the device; `src/ui/foodPrivacy.test.tsx` checks requests, storage, share text, title, URL and data attributes.
- **Server:** two read routes, `GET /api/cravings/all` and `GET /api/food-info`, for the catalogue; no profile data is accepted.
- **Known limits:**
  - Halal and kosher are conservative: 22 of 70 foods carry halal `yes` (plain unprocessed produce, pulses, grains and eggs only, sourced from a secondary definition page, Wikipedia "Halal"); kosher `yes` is 0; the rest are `unknown`. Those rules mostly show "Check the ingredients". A halal-authority or community review is still open. The swaps line says "Showing swaps that avoid what you told us to avoid. This is a guide, not a certification. Check labels." and never claims a match.
  - Prices are sample estimates (labelled "Sample data").
  - Only 10 traditions have catalogue foods; the starter list has more, and a person's own traditions are kept but have no foods.
  - Aboriginal and Torres Strait Islander foods are deliberately not included pending consultation with the community.
  - Nearby tags for cultural food (Task 8) are deferred.
  - The calendar ends in 2029 and `npm run build:cultural` prints a warning (and fails with `--strict`) from 2028-09-20, when less than 12 months of calendar remain: refresh it before then (`docs/superpowers/research/README.md`).
  - Moon-dependent dates (Ramadan, the Eids, Diwali) are approximate; Diwali rows are the main day (Lakshmi Puja) only.
  - Rule wording and one-line meanings still need a community check.

## `feature/whatif` (in progress, unpushed)
- **Trade-off counter** (spec `docs/superpowers/specs/2026-10-29-tradeoff-counter-design.md`): "What we went without" in the Menu, a private two-tap record of what keeping food on the table cost, with ten fixed categories, an optional 140-character note, this week and last, Remove, Undo and Clear all. No score, streak, target or comparison, and it never feeds the check-in score, bands, Budget, My week or the share text.
- **Support card:** after a food, money, health or child category a calm card shows Lifeline, Kids Helpline, the National Debt Helpline and Foodbank Find Food (https://findfood.foodbank.org.au/), and "Need a hand?" always holds the same help. Numbers re-verified on official pages on 29 October 2026.
- **Privacy:** on the device only, kept 8 weeks, never sent or shared; `src/ui/tradeoffPrivacy.test.tsx` checks requests, storage, share text, title, URL, data attributes and the support card.
- **Open decisions:**
  - A practitioner review of the category wording, the reflection line ("Keeping food on the table should not cost this much.") and the support card.
  - The optional printable summary: designed, not built, pending a decision, because it is the only piece that moves this data onto paper.
  - Retention: 8 weeks is a proposal, not a confirmed choice.

- **What if** (spec `docs/superpowers/specs/2026-10-29-whatif-simulator-design.md`): "What if" in the Menu after Budget, with a quiet link from Budget. A person tries a change on their own numbers (lose shifts or hours, pay change, payment change, a one-off bill, rent change, food prices change, or up to four of those at once) and sees before and after for each line, a four-week strip, "How we worked this out", "What we assumed", "What we don't know", sourced context figures and "What could help". Saved what-ifs (up to 10, rename, remove with Undo, clear all with Undo), compare two, and Start again.
- **On-device decision (user decision):** the "simulator" is deterministic integer-cent arithmetic in `packages/core/src/whatif`. There is no AI, LLM, model, network call or third-party service, and the screen never says "AI", "smart" or "prediction"; it says the sums are worked out on the device. Text comes only from fixed templates (`src/ui/whatIfCopy.ts`, `packages/core/src/whatif/explain.ts`). Nothing is shared or exported: no share button, clipboard write, print layout or `navigator.share`.
- **Privacy:** income, rent, costs, scenarios and names stay on the device in the profile (`housingWeekly`, `otherFixedWeekly`, `whatIfScenarios`). Saved what-ifs store the change only, never results or the baseline numbers. `src/ui/whatIfPrivacy.test.tsx` and `packages/core/src/whatif/privacy.test.ts` check requests, storage, share text, title, URL, data attributes, logs and the dependency lists.
- **Limits:** income up to $20,000 a week; housing, other costs and food budget up to $10,000; pay per shift or hour up to $5,000; a payment change up to $5,000 a week; a one-off bill up to $100,000; percentages 0.01% to 100%. Inputs above a limit are refused with a kind message, never clamped. Lost work: shifts 0.5 to 14 or hours 0.5 to 60 in half steps, every 1, 2 or 4 weeks. The 11th save is refused, not dropped. Income, housing and food never go below $0 in the sums, and the text says so. The sums cover four Monday-weeks from this week and ignore tax, payment eligibility and anything the person did not enter. There is no pay default: the minimum wage is shown as context only.
- **Context figures (not defaults):** a new `whatif` group in the benchmark dataset (National Minimum Wage, JobSeeker rates, Melbourne median rent and rent index) with source, period, "Older data" and verification labels, plus existing CPI food rows. No source was found for a typical bill, so none is shown. No food-insecurity percentage is ever shown beside a result.
- **Refresh table** (`refreshAfter` is a reminder, not a claim; `npm run build:benchmarks` warns once it passes, `--strict` fails):

  | Rows | Remind after | Re-read |
  | --- | --- | --- |
  | `w-min-wage-hour`, `w-min-wage-week` | 2027-07-01 | Fair Work National Minimum Wage (annual review, from 1 July) |
  | `w-jobseeker-single`, `-energy`, `-single-kids`, `-partnered` | 2027-03-21 | DSS rates list (indexed 20 March and 20 September) |
  | `w-rent-melb-median`, `w-rent-index-year` | 2026-12-31 | DFFH Rental Report, September 2026 quarter (expected December 2026) |

- **Accessibility notes:** the Results and Compare tables are real tables with explicit ARIA roles (`table`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`) because on narrow screens each row is laid out as a grid (label above its three values) and that would otherwise drop the table semantics. "Your numbers" starts open when nothing is saved, so the empty state is long at 390px wide before the first control for the change.
- **Not legal reviewed. Legal review pending: do not launch publicly.** The notice ("General information, not advice...") is the ceiling of what the feature claims; its wording is not legal review.
- **Open decisions (what-if):**
  - Legal review of the "general information" notice before any public launch.
  - Whether to call the feature "AI" or "smart" in the UI despite being rule-based (currently no).
  - Whether an opt-in AI explainer should ever exist (out of scope).
  - Whether the Foodbank 2026 dataset update ships with or before this feature.
  - Whether to allow sharing or export in a later version.

- **Pantry recipes** (spec `docs/superpowers/specs/2026-10-29-pantry-recipes-design.md`): "My pantry" and "Cook with what you have" in the Menu. Add what you have (starters, search, or free text kept as a note), with optional quantity and use-by, best-before, cooked or opened dates and "Things I always have". Cook lists 48 recipes by what you can make now, what needs one more thing, and a few more, with 17 substitutions, what uses an item due soon, and a sample price for what is missing. Recipes that break your food rules or allergies are hidden. The recipe page scales grams to serves, shows NSW Food Authority food-safety lines (chicken and mince always have a thermometer step) and per-serve nutrition (AFCD Release 3), and adds missing things to a shopping list with a sample total. Out-of-date items are set aside and never offered; leftovers are never recipe inputs.
- **Privacy:** pantry and shopping list stay on the device, never sent or shared; `src/ui/pantryPrivacy.test.tsx` checks requests, storage, share text, title, URL, data attributes and logs.
- **Data:** `docs/superpowers/research/2026-10-29-pantry-recipes.json` generates `packages/core/src/recipes/generated/recipes.generated.ts` with `npm run build:recipes`. Prices are sample estimates (typical Melbourne supermarket price per kg, rounded to 10c). Not shipped: soak-and-boil dried beans, raw seafood and fish, curry blends and sauces without a read source.
- **Open decisions (pantry recipes):**
  - The food-safety guidance is NSW Food Authority, labelled as NSW; the Victorian Department of Health and Better Health Channel pages returned 404. Keep the NSW wording, or find the Victorian page first.
  - A food-safety or dietitian review of the recipes and the cost-per-serve estimates before launch.
  - The pregnancy and weakened-immune-system line is left out: the NSW PDF could not be read (embedded fonts). It is added only once the text is read.
  - Whether to also adapt NHS (Open Government Licence) recipe text; not in release one.

## Requested, not started
- **Nearby tags for cultural food** (part of the cultural food spec): deferred.
