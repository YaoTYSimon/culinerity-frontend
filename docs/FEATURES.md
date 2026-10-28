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
- **Cultural food in Swaps:** 49 sourced cultural foods and 57 swaps with nutrition from AFCD Release 3 (CC BY 4.0). Settings hide items with a chosen allergy, hide or mark "Check the ingredients" for rules (unknown never passes), lead the picklist with the person's traditions, and mark "Fits your kitchen". Without settings Swaps ranks as before (pinned by a golden test).
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
  - The calendar ends in 2029 and the freshness test fails from 2028-09-20 by design: refresh it before then (`docs/superpowers/research/README.md`).
  - Moon-dependent dates (Ramadan, the Eids, Diwali) are approximate; Diwali rows are the main day (Lakshmi Puja) only.
  - Rule wording and one-line meanings still need a community check.

## Requested, not started
- **Nearby tags for cultural food** (part of the cultural food spec): deferred.
