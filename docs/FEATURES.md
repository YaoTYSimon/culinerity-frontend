# Culinerity: what has been built

Status as of 26 October 2026. "Branch" says where the work lives; nothing here has been pushed beyond `origin/main` (6db289d).

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

## `feature/budget-policy` (in progress, unpushed)
- **Sourced benchmark dataset** (19 sources, 37 indicators, 12 Melbourne areas, 6 interventions) with a generator, freshness test, "Older data" labels and "how we read it" labels. Verified against ABS, Foodbank, VicHealth and other sources.
- **Budget core logic:** Monday-week maths (DST-safe), pace message, spend entries with undo, saved-with-swaps, safe money parsing.
- **Budget tracker view:** plate showing what is left, add/remove/undo spending, past weeks, income sentence, "How this compares" with cited figures. Review fixes in progress.
- **Not yet built:** the Data and policy dashboard (Task 4) and the final verification (Task 5).

## Requested, not started
- **Nearby cheap and healthy options** (see `docs/superpowers/specs/2026-10-26-nearby-options-design.md`).
