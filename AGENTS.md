# Culinerity

Cheaper, healthier swaps for what you crave, for anyone in Melbourne. React 19 + Vite 8 + Tailwind CSS v4 web app, with a platform-free core package and an optional reference-data server. Requires Node >= 22.

## Layout

- `packages/core` (`@culinerity/core`): platform-free TypeScript. Domain types, scoring, swap ranking, the `swapService`, source interfaces, mock and HTTP sources, and the `ProfileStore` interface. No `window`, `document`, `localStorage`, React or Node APIs (a test enforces this).
- `server` (`@culinerity/server`): Hono + better-sqlite3 API for reference data only (cravings, swaps, prices, nutrition, support places). See `server/README.md`. Never stores anything about a person.
- `src/ui`: React components. `src/App.tsx` is the shell and view switch (plain state, no router): `welcome`, `checkin`, `number`, `swaps`, `budget`, `support`, `nearby`, `food`, `meals`, `week`, `policy` (the `View` type in `src/ui/views.ts`; the Menu lists them, and the footer links to `policy`).
- `src/theme`: `tokens.ts` (the single TypeScript source of the four theme palettes), `ThemeProvider` (sets `data-theme` on `<html>` and persists the choice).
- `src/assets/photos`: the 13 bundled Wikimedia Commons photographs (10 cravings, 3 home-cooked welcome photos) and `credits.ts`. Drawn illustrations in `src/ui/illustrations` are the fallback for cravings without a photo.
- `src/services`: `createServices` (the only place concrete sources and the profile store are wired for the web app; the theme store is the one exception, built in `src/main.tsx` and passed to the required `store` prop of `ThemeProvider`), `loadServices` (mocks, or HTTP sources when `VITE_USE_BACKEND=true`), `ServicesContext` and `ServicesLoader` (renders the shell at once; the backend catalogue loads in the background).
- `src/auth`: local profiles. `AuthProvider`/`useAuth` (state: accounts, current, `status` locked | signed-in | guest, remove notice), `Gate` (renders `SignInScreen` when locked, else the app tree keyed on the profile id so Lock/Switch discards in-memory state), `LocalAuthService` (implements core's `AuthService` on localStorage/sessionStorage and Web Crypto; never throws), `verifier.ts` (PBKDF2), `storageKeys.ts`. The service is built only in `src/main.tsx`. UI: `src/ui/SignIn.tsx`, `CreateProfile.tsx`, `ProfileMenu.tsx` (header avatar), `Avatar.tsx`. Pure helpers (name/passcode validation, rate limit, deletion confirmation) live in `packages/core/src/auth`.
- `packages/core/src/budget`: pure budget logic (Monday-week maths that is DST-safe, `budgetSummary` and pace, spend entries with undo, safe money parsing). `packages/core/src/benchmarks`: the typed dataset (`types.ts`), `StaticBenchmarkSource` (`source.ts`: `isOlderData`, `verificationLabel`), Melbourne area helpers (`areas.ts`) and `generated/benchmarks.generated.ts` (do not hand-edit).
- `src/ui` budget and policy: `BudgetView` (+ `BudgetPlate`, `AddSpend`, `BudgetDisclosure`), `PolicyView` (+ `BarRows`, `ScaleRows`, `ShareDial`, `CompactRows`), shared `BenchmarkRows` (`BenchmarkRow`, `figureParts`, `HEADLINE_IDS`: the indicator ids shown first on Budget, the rest under "More figures"), `PlateRim`, `Disclosure`.
- `packages/core/src/food`: cultural-food logic, all pure: `rules` (diet-rule fit; an `unknown` attribute never passes), `allergens`, `rank` (`rankForProfile`), `meals`, `occasions` (`occasionsOn`, `upcomingOccasions`, `dismissOccasion`), `coverage`, `sanitize` (`foodProfile` and `culturalMeals` on `Profile`). `packages/core/src/cultural`: the typed dataset (traditions, occasions, calendar, ingredients, foods, swaps) with `generated/cultural.generated.ts` (do not hand-edit) and `StaticFoodInfo`. `src/ui` food views: `MyFood` (+ `FoodSteps`, `FoodSections`, `FoodSummary`, `TagInput`, `StepProgress`, `ComingUp`), `MealsView` (+ `WeekRing`, `AddMeal`), `OccasionLine`, `foodCopy.ts` (exact strings).
- `src/storage`: `LocalProfileStore` (profile) and `LocalThemeStore` (theme), both localStorage-backed and never throwing.
- `src/index.css`: Tailwind v4 import, the six colour roles per theme (`:root` and `[data-theme=...]`), `@theme` names (`bg`, `surface`, `ink`, `muted`, `accent`, `accent-ink`), the food-illustration palette, the plate-rim animation, and the shared `focus-ring` / `motion-colors` utilities.
- `scripts/build-benchmarks.mjs`: validates the research JSON and writes the generated dataset.
- `scripts/build-cultural.mjs`: validates `docs/superpowers/research/2026-10-27-cultural-food.json` and writes the cultural dataset (`npm run build:cultural`; a test fails if the committed file is stale). `scripts/computus.mjs` computes Easter dates.
- `scripts/contrast.mjs`: `node scripts/contrast.mjs` checks WCAG contrast of every theme from `src/index.css`.
- `docs/superpowers/`: design specs and implementation plans (the plate redesign is `specs/2026-10-26-welcome-themes-plate-redesign-design.md`).

## Scripts

- `npm run dev`: Vite on http://localhost:8443/ (host 127.0.0.1; `/api` proxies to http://127.0.0.1:8787).
- `npm run build`, `npm run preview`, `npm run format` (oxfmt).
- `npm test`: core, web and server tests (`npm run test:server` runs the server tests alone). `npm run typecheck`: root, core and server.
- `npm run build:benchmarks`: regenerate `benchmarks.generated.ts` from `docs/superpowers/research/2026-10-26-food-security-data.json`. Tests run with `TZ=Australia/Melbourne` (set in `vitest.globalSetup.ts`, also used by core) so daylight-saving cases are deterministic; do not rely on the machine's zone.
- `npm run build:places` / `npm run build:centroids`: regenerate the Nearby dataset and the suburb/postcode centroids from `docs/superpowers/research/` (see its README "Places" and "Centroids"); tests fail on drift.
- `npm run seed`: create and fill the local SQLite database. `npm run server`: start the API on 8787.
- `npm run dev:all`: server and dev server together. Use `VITE_USE_BACKEND=true npm run dev:all` to run the web app against the server.

## Product flow

- First visit opens **Welcome** (one question, "How much is food on your mind?"). "Find my number" starts the check-in; "Skip to cheaper swaps" goes to the swaps. Either marks `welcomeSeen`; opening Welcome from the Menu does not.
- **Check-in** asks one question at a time (the FIES questions, then the domain questions) with a progress bar, Back and Skip. Finishing saves the score and shows the **number screen**.
- **Number screen**: the score on a plate-shaped dial whose rim fills once (shows its final state under reduced motion), a plain band headline, the history of earlier scores, and a swap nudge. A score below `SUPPORT_BELOW` (40, in `packages/core/src/domain/bands.ts`) also shows a link to **Food support**.
- **Swaps**: search or pick a popular craving; results rank cheaper, healthier swaps with an "Add to my week" button on each. A collapsed "Your budget" holds the optional weekly budget, income and suburb.
- **My food** (Menu, or "Tell us about your food" on Welcome): optional, skippable, five steps (traditions or cuisines, diet rules, things to avoid, occasions, review), then a summary with "Clear my food settings" (Undo) and "Coming up". It never gates anything. With settings, Swaps shows only what fits: allergies hide an item, rules hide or mark "Check the ingredients" (unknown never passes), tradition cravings lead the picklist, and "Fits your kitchen" marks matches. Halal and kosher attributes are mostly `unknown` until a community reviewer sources them, so those rules mostly show "Check the ingredients". Without settings Swaps behaves as before.
- **Meals that felt like home** (Menu): a calm Monday-week ring and a two-tap log (pick a tradition, optionally a dish and who with), this week and last, with Remove and Undo and "Clear my meals". No streaks, scores, targets or counts pushed at the person; meals older than 8 weeks are dropped.
- **Reminders**: one quiet line under the Swaps intro for a chosen occasion that starts within 7 days or is on now ("Diwali starts about Sun 8 Nov."), plus "Coming up" in My food. It is in-page text only: no push, no notification, no service worker. Dates for moon-dependent occasions (Ramadan, Eids, Diwali) are marked "about" and "depends on the moon sighting" where relevant. A reminder can be dismissed, once per occasion and year.
- **Food support**: nearby free food places with a Directions link (sample data unless the server is used).
- **Nearby**: `src/ui/Nearby*.tsx`, `src/location` (`BrowserLocationProvider`, `LocationContext`), places and ranking in `packages/core/src/places`. A starter list of sourced places, nearest first; prices are `stated` or labelled `typical`; dated notices show only while active. Use the dataset only through `PlaceSource`; never add a place without a source, licence and checked date.
- **My week**: the swaps added in the last 7 days grouped with their savings, "Remove one", "Clear week", and Share (Web Share, else the clipboard, else text to copy by hand). The share text is savings only: never the score, answers, finances, suburb or a name.

- **Budget**: set an optional weekly food budget; add, remove and undo spending; the plate shows what is left, with a pace message, past weeks and what swaps saved. Spend entries live in the profile (on device).
- **Data and policy**: sourced figures with verification labels, grouped by theme, with Melbourne areas by disadvantage and what helps. Reached from the Menu (last item) and the footer.

## Cultural food data rules

- The dataset is `docs/superpowers/research/2026-10-27-cultural-food.json`; refresh with `npm run build:cultural` and commit both files. Never invent a nutrition value, attribute, flag or date: unknown stays `unknown` (and never passes a rule). Nutrition is AFCD Release 3 (CC BY 4.0, attribution to Food Standards Australia New Zealand); prices are sample estimates and flagged "Sample data".
- Traditions name food styles or home-cooking styles, never people. Aboriginal and Torres Strait Islander foods are deliberately not included pending community consultation (the validator rejects them). Rule wording needs a community check.
- The calendar is `approx` for moon-dependent occasions, and its last row must end at least 12 months after today (the freshness test fails from 2028-09-20 by design: refresh before then). One rule for festivals that span days (Diwali): the row is the main day only (Lakshmi Puja), `approx`, with the span in `note`.

## Benchmark data rules

- **No invented numbers.** Every figure comes from `docs/superpowers/research/2026-10-26-food-security-data.json` and a source with an https URL, a year and a `verification`: `primary` (read from the source), `secondary` ("Read from a published report that cites it"), `press` ("Press report only"). Change a figure only after reading its source, and put the value, evidence and source in the commit message.
- Refresh: edit the JSON, run `npm run build:benchmarks`, commit the JSON and the generated file. A freshness test regenerates in memory and fails if the committed file is stale. See `docs/superpowers/research/README.md`.
- `note` is plain user-facing text and is shown. `research` records how a figure was found (blocked pages, what was not opened); it is never shown. Keep technical wording out of `note`.
- `decimals` (0 to 4) is how many places the source writes (34.0, 3.0); `figureParts` honours it. String-valued figures use `value: null` plus `display`.
- Different measures are never combined or plotted on one axis. Missing data is listed as `notFound` (tagged `budget` or `policy`), never filled in.
- `isOlderData` flags `dated` figures and any more than five years old; the UI shows "Older data".

## Design rules (the plate)

- Flat colour only: no shadows at rest, gradients, hairlines or cards. Tone steps (`bg` then `surface`) separate things.
- Everything is fully round: buttons (`PillButton`), inputs, focus rings, photos (`RoundPhoto`), dots. A photo is never hard-cropped at a screen edge.
- One typeface, Schibsted Grotesk (bundled). Display text is weight 800, tight tracking, sentence case (`.font-display`).
- Touch targets are at least 44px; plain language; motion only through `motion-safe` and the one-time dial fill.
- Use the semantic colour names only (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `bg-accent`, `text-accent-ink`). Do not add Tailwind important (`!`) overrides.

## Themes

Four themes: tobacco (default), sand, walnut, cream, switched by the dots in the header. The palettes live in `src/theme/tokens.ts` (single TypeScript source, used by `ThemeDots`); `src/index.css` must hold the same six values (and the no-flash script in `index.html` the `bg` colour), and `src/theme/tokens.test.ts` fails when they drift. `src/theme/contrast.test.ts` enforces contrast.

To add a theme: add its id to `ThemeId` and `THEME_IDS`/`THEME_NAMES` in `packages/core/src/theme/theme.ts`; add its six values to `THEME_TOKENS` in `src/theme/tokens.ts`, a `[data-theme='id']` block in `src/index.css`, and the `themes` map (bg colour) in `index.html`; then run `npm test` and `node scripts/contrast.mjs`.

## Local profiles

- Optional profiles (name, avatar colour, optional 4 to 8 digit passcode) all stay on the device. Guest = no profile, using the original keys. Sign-in shows when profiles exist and nobody is signed in; "Skip for now" continues as a guest for that tab.
- Keys: `culinerity.accounts.v1`, `culinerity.attempts.v1` (localStorage), `culinerity.session.v1` (sessionStorage), `culinerity.profile.v1` (guest) and `culinerity.profile.v1.<id>` (a profile), `culinerity.theme.v1` (global). Migration ("Start from my current data") moves the guest profile into the new one and removes the guest copy.
- The lock is access control for casual access, not encryption: the passcode is never stored (PBKDF2-SHA-256 verifier, 210,000 iterations), stored data is plain, 5 wrong tries pause for 30 seconds (soft limit, reset by clearing storage). Never claim more than this in copy.
- Deleting a profile needs the typed name, removes only that profile's keys, and reports anything it could not remove (`RemoveResult.remaining`); `removeNotice` carries that to the sign-in screen or guest app.
- Every text field uses `FIELD_EDGE`/`INPUT_CLASS` (src/ui/formParts.tsx): a 2px `muted` edge, >= 3:1 on bg and surface in all themes (checked by `scripts/contrast.mjs`). Do not add inputs without it (`fieldEdge.test.ts`).
- To reset a device while developing: `localStorage.clear(); sessionStorage.clear()`.

## Privacy rules

- A person's answers (check-in, score, score history, budget, suburb, My week, theme) stay on their device in localStorage (`culinerity.profile.v1` or `culinerity.profile.v1.<id>` for a local profile, `culinerity.theme.v1`). Sharing the week sends nothing to us. They are never sent anywhere.
- Food traditions, rules, allergies, occasions and meals stay on the device in the profile (`foodProfile`, `culturalMeals`). They are never sent anywhere: not in a request (swaps, prices, nutrition and food-info requests carry ids only, no profile text, headers or body), not in the share text, `document.title`, the URL, `data-` attributes, a notification, a log or any other key. Clearing removes the keys from the stored JSON; deleting a profile removes its key; "Start from my current data" carries both fields over. `src/ui/foodPrivacy.test.tsx` enforces all of this (spies installed before the flow, detectors that are proven live); if one of its assertions fails, fix the code, not the test.
- Location (Nearby) is never stored, put in the profile, shared or sent: one `getCurrentPosition` on a button press, rounded to 3 decimals, held in React state and discarded on leaving the view. No `console.*` in `src/location` or the Nearby views (a test checks privacy).
- No third-party requests: no analytics, CDNs, remote fonts or embeds. Fonts are bundled via `@fontsource`.
- The server only serves reference data and receives no profile data (`/api/cravings/all` and `/api/food-info` are public catalogue reads with no parameters from the person).

## Data

Mock-first. By default the app runs on bundled sample data (prices, nutrition, support places) and labels it "Sample data". Do not present sample data as real.

## Conventions

- SOLID and DRY. Depend on the core interfaces (`FoodCatalogue`, `PriceSource`, `NutritionSource`, `FoodSupportSource`, `ProfileStore`); wire concrete classes only in `createServices` / `createHttpServices` (and the theme store in `src/main.tsx`).
- Keep `packages/core` platform-free. Put browser code in `src`, Node code in `server`.
- Style with Tailwind utilities and the theme tokens; do not hard-code colours (the food-illustration palette is the one exception). Reuse `focus-ring` and `motion-colors` rather than repeating those class strings.
- Accessibility: visible focus, 44px touch targets, plain language, respect reduced motion.
- Every behaviour change comes with a test (Vitest + Testing Library for UI; `*.test.ts` beside the code in core and server).
