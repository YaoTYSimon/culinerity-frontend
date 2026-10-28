# Cultural Food ("My food", fits-first swaps, meals tracker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people say, optionally and only on their device, which food traditions, dietary rules and occasions fit them, so swaps hide what breaks a rule and favour what fits, a quiet tracker records "Meals that felt like home", and a single dated heads-up appears for chosen occasions.

**Architecture:** Platform-free logic in `packages/core/src/food/` (types, rule fit, ranking wrapper, meals, occasions, sanitisers) over a sourced dataset: one research JSON validated by `scripts/build-cultural.mjs` into `packages/core/src/cultural/generated/cultural.generated.ts` (traditions, ingredient attributes, foods with derived flags, cravings, swaps, occasions, calendar). Item flags are derived from ingredient attributes, never typed by hand, and `unknown` never passes a rule. The catalogue gains `allCravings()` and `foodInfo()`. The web layer adds `food` and `meals` views, a Welcome text button, Menu items and a Swaps reminder line. Everything lives in the existing per-profile `Profile` JSON.

**Tech Stack:** TypeScript, React 19, Vite 8, Tailwind v4, Vitest + Testing Library, Hono + better-sqlite3 (reference data only), Playwright MCP for screenshots.

**Spec:** `docs/superpowers/specs/2026-10-27-cultural-food-design.md`. Read it whole, including "Builder-check rulings": **the rulings win** over earlier sections. Also read `AGENTS.md` (Privacy rules, Design rules, Benchmark data rules) and `docs/superpowers/research/README.md` (Places section: the dataset method this copies). Patterns to copy: `scripts/build-places.mjs` (+ `.d.mts`, `.test.ts`), `packages/core/src/budget/entries.ts` and `week.ts`, `src/ui/Questionnaire.tsx` (one question per screen), `src/ui/BudgetView.tsx` + `AddSpend.tsx` (undo), `src/ui/Nearby.tsx`, `src/ui/FocusHeading.tsx`. Taste skill: `~/.agents/skills/design-taste-frontend`.

## Global Constraints

- **Privacy (hard):** `foodProfile` and `culturalMeals` are optional, self-declared, stored only in the profile JSON on the device (`culinerity.profile.v1` / `culinerity.profile.v1.<id>`), never sent to the server or any third party, never in `shareText`, the week share, Budget, `document.title`, URL, `data-` attributes, `console.*`, analytics or sessionStorage/cookies/IndexedDB. Nothing is inferred from name, language, suburb, location or anything else. Nothing is pre-selected. "Clear my food settings" and "Clear my meals" always work; profile delete removes them. The passcode is access control, not encryption: never claim more.
- **No invented data:** every nutrition value, ingredient attribute, flag basis and date has a `sourceId` (https URL, licence, `accessed` date, `verification` `primary`|`secondary`). If a value cannot be read from a source, the food is not seeded or the attribute stays `unknown`; it goes in `notFound` with the reason. Prices follow the mock pattern: `isSample: true`, shown as "Sample data". Licences accepted: CC0, public domain, CC BY (record the attribution). USDA FoodData Central licence page and the FSANZ AFCD licence page must be read and recorded before use; if the AFCD licence is not CC BY compatible use FDC only. OpenStreetMap and unlicensed lists are not used.
- **Rule semantics:** three-state flags `yes|no|unknown`; a rule is met only by the flag value in the spec's rule table; `unknown` never passes (shows "Check the ingredients"); `out` items are hidden, never offered with "show anyway". The app never says an item "is halal/kosher/allergy-safe"; the copy is "matches your food rules... a guide, not a certification. Check labels." Cooking does not remove alcohol. Shellfish is `unknown` for halal; oats `unknown` for gluten; cheese `unknown` for vegetarian, halal and kosher.
- **Respectful wording:** self-declared ("you chose", "you told us"); traditions are food styles, never "X people"; no "authentic", "traditional for", "your people", no stereotyping, no health claims for faith rules, no shaming for empty weeks, never "failed". Aboriginal and Torres Strait Islander foods are not added to the starter list.
- **Plate design system:** Schibsted Grotesk; fully round shapes; flat colour; no cards, chips, hairlines, shadows or gradients; semantic colour names only (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `bg-accent`, `text-accent-ink`); selection uses round `PillButton`s with `aria-pressed`; text inputs use `FIELD_EDGE`/`INPUT_CLASS` from `src/ui/formParts.tsx`; one `h1` per view (use `FocusHeading` so focus moves to it); 44px targets; AA contrast in all four themes; visible focus; `motion-safe` only; no horizontal scroll from 320 to 1280px; no `!` Tailwind overrides; no hard-coded colours.
- **Dates:** Monday weeks, DST-safe, using `weekBounds`, `addLocalDays`, `dayIndexMonday` from `packages/core/src/budget/week.ts`; `now` is injected everywhere; tests run in `TZ=Australia/Melbourne`.
- **Core stays platform-free** (`packages/core/src/platformFree.test.ts`; add `cultural/generated` to its generated-folder list). Concrete classes are wired only in `createServices`/`createHttpServices`.
- **Every task ends green:** `npm test`, `npm run typecheck`, `npm run build`; data tasks also `npm run build:cultural` leaves no diff. Existing tests keep their intent. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01CVJsJBKSnSRKS1F3CWccnQ`. Stage by explicit path. Never push or merge. Sonnet only. Branch `feature/cultural-food`.

## Review Focus

Input classes and failure modes the spec implies; each has a test in the owning task.

1. **Unknown never passes.** An item with no info record, an item with one `unknown` flag among passing ones, `allergensKnown: false`, and an unmappable allergy word, each with every rule on: result is `check`, never `fits`; a single `no` plus an `unknown` is `out`. (Task 3, 5)
2. **Hostile and odd free text.** `"<script>alert(1)</script>"`, 500 characters, emoji and zero-width characters, `"  GREEK "` (becomes the starter id), `"peanuts"`, `"Nut allergy"`, `"citrus"`, duplicates differing only by case, an empty string, a stored `foodProfile` that is a string, array, `null` or has 10,000 items: sanitised, capped, rendered as literal text, never a throw. (Task 3, 4)
3. **Week edges.** A meal at Sunday 23:59 versus Monday 00:00 Melbourne, the DST change weeks (first Sundays of April and October), a future-dated meal, a meal two weeks old, the 200 cap and the 8-week prune, duplicate ids, an undo after the week rolled over. (Task 3, 6)
4. **Occasion windows.** Lunar `approx` rows get one extra day; evening-start rows (Passover, Hanukkah) show from seven days before; two occasions overlapping or adjacent (Lent ends 31 Mar 2029, Ramadan ends 13 Feb 2029, Easter 2028) show only the nearest; a window that crosses the new year keys by start year; a dismissed key stays hidden; an occasion not chosen never shows; after the calendar's last row nothing shows and nothing throws. (Task 3, 7)
5. **Everything hidden.** Rules that exclude all swaps for a craving, a tradition with no catalogue foods, no traditions but rules, a craving with no flag data: calm sentence, no blank screen, no leaking of which rule hid what beyond the rule names the person chose. (Task 5)
6. **Corrupt or blocked storage and cleared state.** Profile JSON missing the new fields (every existing profile), profile saved by an older build, `localStorage` throwing, "Clear" then "Undo", sign-out/sign-in switching profiles (no food state shown from the previous profile). (Task 3, 4, 6)
7. **Narrow screens and keyboard.** 320px with 40-character own-text pills and many chips, wizard operable by keyboard only, `aria-pressed` announced, status messages in `role="status"`. (Task 4, 6, 9)

---

## File Structure

- `docs/superpowers/research/2026-10-27-cultural-food.json`: the one sourced dataset (Tasks 1, 2)
- `scripts/build-cultural.mjs` (+ `.d.mts`, `.test.ts`): validator and generator (Task 1)
- `packages/core/src/food/types.ts`: types and constants (Task 1)
- `packages/core/src/food/{allergens,rules,rank,meals,occasions,sanitize}.ts` + tests: logic (Task 3)
- `packages/core/src/cultural/generated/cultural.generated.ts`: generated, do not edit (Tasks 1, 2)
- `packages/core/src/cultural/source.ts`: typed accessors over the generated data (Task 1)
- `src/ui/MyFood.tsx`, `FoodSteps.tsx`, `FoodSummary.tsx`, `TagInput.tsx`; `src/ui/MealsView.tsx`, `WeekRing.tsx`, `AddMeal.tsx`; `src/ui/OccasionLine.tsx` + tests (Tasks 4, 6, 7)
- Modify: `packages/core/src/domain/types.ts`, `sources/interfaces.ts`, `sources/mock/{data,mockCatalogue}.ts`, `sources/http/HttpCatalogue.ts`, `domain/swaps/rank.ts`, `services/swapService.ts`, `storage/profileStore.ts`, `budget/entries.ts` (export `isIsoDateTime`), `index.ts`, `server/{schema.sql,repositories.ts,routes.ts,seed.ts}`, `src/ui/{views.ts,Menu.tsx,Welcome.tsx,CravingSearch.tsx,SwapResults.tsx,WeekCard.tsx}`, `src/App.tsx`, `package.json`, `AGENTS.md`, `docs/FEATURES.md`, `docs/superpowers/research/README.md`

---

### Task 1: Sourced datasets and generator (traditions, rules, ingredients, occasions, calendar)

**Files:**
- Create: `docs/superpowers/research/2026-10-27-cultural-food.json`, `scripts/build-cultural.mjs`, `scripts/build-cultural.d.mts`, `scripts/build-cultural.test.ts`, `packages/core/src/food/types.ts`, `packages/core/src/cultural/source.ts`, `packages/core/src/cultural/generated/cultural.generated.ts`, `packages/core/src/cultural/cultural.test.ts`
- Modify: `package.json` (`"build:cultural": "node scripts/build-cultural.mjs"`), `packages/core/src/index.ts`, `packages/core/src/platformFree.test.ts`, `docs/superpowers/research/README.md` (Cultural food rules)

**Interfaces:**
- Produces (`food/types.ts`):
  `type TriState = 'yes'|'no'|'unknown'`;
  `const DIET_RULES = ['halal','kosher','vegetarian','vegan','noBeef','noPork','noAlcohol','glutenFree'] as const; type DietRule = (typeof DIET_RULES)[number]`;
  `const OCCASION_IDS = ['ramadan','eid-al-fitr','eid-al-adha','lunar-new-year','diwali','lent','easter','orthodox-great-lent','orthodox-easter','passover','rosh-hashanah','hanukkah','christmas'] as const; type OccasionId`;
  `type AllergenId` = the FSANZ list from the spec (`'wheat'|'fish'|'crustacean'|'mollusc'|'egg'|'milk'|'lupin'|'peanut'|'soy'|'sesame'|'almond'|'brazil-nut'|'cashew'|'hazelnut'|'macadamia'|'pecan'|'pistachio'|'pine-nut'|'walnut'|'barley'|'oats'|'rye'|'sulphites'`);
  `interface RuleFlags { halal: TriState; kosher: TriState; vegetarian: TriState; vegan: TriState; beef: TriState; pork: TriState; alcohol: TriState; gluten: TriState; allergens: AllergenId[]; allergensKnown: boolean; certifiedMeat: boolean }`;
  `interface FoodInfo { itemId: string; traditions: string[]; flags: RuleFlags; significance?: string }`;
  `interface FoodProfile { traditions: string[]; rules: DietRule[]; allergies: string[]; occasions: OccasionId[]; dismissed: string[] }`;
  `interface CulturalMeal { id: string; at: string; tradition: string; dish?: string; with?: 'family'|'friends'|'community'|'alone' }`;
  `interface Tradition { id: string; label: string; note?: string }`;
  `interface OccasionDef { id: OccasionId; label: string; gathering: boolean; selectable: boolean }`;
  `interface CalendarRow { occasion: OccasionId | 'yom-kippur'; start: string; end: string; approx: boolean; method: 'hijri-calculated'|'computus'|'hebcal'|'table'|'fixed'; sourceId: string; checked: string; note?: string }` (dates `YYYY-MM-DD`, inclusive, Melbourne local).
- Produces (`cultural/source.ts`): `traditions(): Tradition[]` (alphabetical), `occasionDefs(): OccasionDef[]`, `calendar(): CalendarRow[]`, `culturalSources(): SourceRecord[]`, `lastCalendarEnd(): string`, `labelFor(traditionId: string): string` (own text returns itself).
- Produces (`build-cultural.mjs`): `validateCultural(d, today?): string[]`, `buildCultural(d): string`, `deriveFlags(ingredients: IngredientAttr[], lookup): RuleFlags` (the spec's derivation table, exported for tests). Same export style as `build-places.mjs`.

- [ ] **Step 1: Research and enter the non-food datasets.** Create the JSON with `sources`, `traditions` (the 21 starter entries from spec ruling 1 with ids), `occasions` (the 13 selectable ids plus `yom-kippur` as `selectable:false`, `gathering` per spec), `calendar` (every row of the spec's calendar table, with its method; re-read each cited source and record `accessed`: Aladhan HJCoSA conversions, Hebcal, Wikipedia tables; Hijri rows `approx:true`; Diwali `approx:true`; Lunar New Year cross-checked against the Hong Kong Observatory tables or marked `verification: secondary`; Diwali 2029 and Navratri stay out and go to `notFound`), `ingredients` (attribute table below, started empty here and filled in Task 2), `notFound`. Computed rows (Easter, Lent, Orthodox, Clean Monday) must equal the algorithm outputs listed in the spec; Greek Orthodox Great Lent start is confirmed from the Archdiocese page or the row's `note` says "start day not confirmed".
- [ ] **Step 2: Write failing tests** in `scripts/build-cultural.test.ts`: `validateCultural` returns an error for each of: duplicate tradition id; calendar row whose `occasion` is not an occasion id; `end` before `start`; non-ISO or impossible date (`2027-02-30`); unknown or missing `sourceId`; non-https source URL; missing licence; `checked` after today in Australia/Melbourne; `approx` missing; a lunar occasion (`ramadan`, `eid-*`, `diwali`) with `approx:false`; tradition label containing "people"; an `Aboriginal` or `Torres Strait` tradition entry (guard against adding without consultation); calendar with last `end` less than 12 months after `today` (freshness failure, message "calendar needs refreshing"). Add `deriveFlags` tests listed in Task 2 Step 1. Add a freshness test: regenerating in memory equals the committed generated file.
- [ ] **Step 3: Run** `npx vitest run scripts/build-cultural.test.ts` and expect FAIL (missing module).
- [ ] **Step 4: Implement** `food/types.ts`, `cultural/source.ts`, the generator (header "generated, do not edit"; copy `build-places.mjs` structure including `melbourneToday`, `isIsoDate`), the `package.json` script, the `platformFree` generated-folder exclusion, `index.ts` exports, and the README "Cultural food" rules (no invented values; `unknown` default; source per value; refresh steps; the City-style licence caution for AFCD/FDC).
- [ ] **Step 5: Run** `npm run build:cultural && npm test && npm run typecheck && npm run build`; expect green and no diff after a second `build:cultural`.
- [ ] **Step 6: Commit** `feat: cultural food types, sourced traditions and occasions calendar` (explicit paths).

### Task 2: Culturally significant catalogue (ingredients, foods, cravings, swaps) wired to catalogue, seed and server

**Files:**
- Modify: `docs/superpowers/research/2026-10-27-cultural-food.json`, `scripts/build-cultural.mjs`, `scripts/build-cultural.test.ts`, `packages/core/src/sources/interfaces.ts`, `packages/core/src/sources/mock/{data,mockCatalogue,mockNutritionSource,mockPriceSource,seedData}.ts` (+ `mock.test.ts`, `seedData.test.ts`), `packages/core/src/sources/http/{HttpCatalogue,httpJson}.ts` (+ `http.test.ts`), `server/{schema.sql,repositories.ts,routes.ts,seed.ts}` (+ tests), `packages/core/src/domain/types.ts`
- Create: none (data lives in the JSON and the generated file)

**Interfaces:**
- Consumes: `RuleFlags`, `FoodInfo` (Task 1); `ItemRecord`, `SWAP_RECORDS`, `PRICES`, `NUTRITION` in `sources/mock/data.ts`.
- Produces: `interface IngredientAttr { id: string; name: string; per100g?: { energyKj: number; proteinG: number; fibreG: number; sugarG: number; sodiumMg: number }; nutritionSourceId?: string; nutritionCode?: string; vegetarian: TriState; vegan: TriState; halal: TriState | 'certified-meat'; kosher: TriState | 'certified-meat'; beef: TriState; pork: TriState; alcohol: TriState; gluten: TriState; allergens: AllergenId[] | 'unknown'; attributeSourceId?: string }` (a non-`unknown` attribute needs `attributeSourceId`).
- Produces: `FoodCatalogue` gains `allCravings(): FoodItem[]` and `foodInfo(itemId: string): FoodInfo | undefined`; `findCravings` searches `allCravings()`; `popularCravings()` is unchanged (the 10).
- Produces: `SEED_DATA` gains `foodInfo: FoodInfo[]` and `allCravingIds`; the server stores `food_info` as JSON text per item and serves `GET /cravings` (all) and `GET /food-info/:itemId`; `HttpCatalogue.load` preloads both (a failed request leaves the catalogue empty, as now).
- Produces: `deriveFlags` behaviour exactly as the spec's ingredient rules table.

- [ ] **Step 1: Write failing tests** (scripts and core): `deriveFlags` returns: pork ingredient gives `pork:'yes'`, `halal:'no'`, `kosher:'no'`; chicken gives `certifiedMeat:true`, `halal:'yes'`, `vegetarian:'no'`; cheese gives `vegetarian:'unknown'`, `halal:'unknown'`, `kosher:'unknown'`; wine gives `alcohol:'yes'`, `halal:'no'`, `kosher:'unknown'`; soy sauce gives `gluten:'yes'`; oats gives `gluten:'unknown'`; prawn gives `halal:'unknown'`, `kosher:'no'`; chicken plus yoghurt gives `kosher:'no'` (meat and dairy); any ingredient with `allergens:'unknown'` gives `allergensKnown:false`; all-plant dish with known attributes gives `vegan:'yes'`, `vegetarian:'yes'`, `pork:'no'`, `beef:'no'`. Generator tests: a food with a missing per-100g value for any recipe ingredient is rejected; computed nutrition equals `sum(grams/100 x per100g)` rounded to integers for kJ and sodium and one decimal for the others; kcal-to-kJ factor 4.184 applied only when a source gives kcal; every food has `tradition` ids that exist; every cultural price is `isSample`, between 0.2 and 15; every swap references existing items; every existing alternative id has a `FoodInfo`; every cultural item has at least one swap to or from it. Catalogue tests: `findCravings('butter chicken')` finds the new craving; `popularCravings()` still returns exactly the existing 10 ids in order; `foodInfo('smash-burger')` exists with `beef:'yes'`. Server tests: `/cravings` and `/food-info/:id` return the data; no route accepts a profile-shaped body.
- [ ] **Step 2: Run** the targeted tests and expect FAIL.
- [ ] **Step 3: Research and enter the data.** (a) Ingredient attribute rows for the 20 existing alternatives (names only, flags from attribute rules, no nutrition change: their sample nutrition stays). (b) **Release one: 10 traditions x 5 foods = 50 foods** (`chinese`, `indian-north`, `indian-south`, `vietnamese`, `greek`, `italian`, `levantine`, `turkish`, `sri-lankan`, `filipino`) as home-cookable, affordable, healthier equivalents, plus about 10 new cravings (takeaway or packaged versions people actually buy) and `swaps` rows with a plain `note` (no health claims for faith, no "authentic"); `significance` only when a source states it. Work one tradition per commit-sized tranche: read the AFCD or FDC rows for each ingredient (record `code`, `version`, `retrieved`, licence text and attribution on the source row), enter per-100g values exactly as read, set recipe grams from a cited recipe (public-domain or the author's own simple recipe described in `recipeBasis`), and let the generator compute nutrition. Anything that cannot be sourced goes in `notFound` and the food is dropped. Prices: sample, rounded to 10c, `recipeBasis` explains the estimate. Read the FDC and AFCD licence pages first and record them. (c) Attribute rationale per non-`unknown` attribute cites a source (HCA, Kosher Australia "What is Kosher?", Coeliac Australia, FSANZ Schedule 9, Vegan Australia or Vegetarian Victoria); where the page cannot be read, leave `unknown`.
- [ ] **Step 4: Implement** the generator extensions (ingredient table, recipe computation, `FoodInfo`, cravings, swaps, price and macro records), `ITEM_RECORDS`/`SWAP_RECORDS`/`PRICES`/`NUTRITION` merging the generated records without hand-editing `data.ts` values, `MockCatalogue`, `SEED_DATA`, the HTTP catalogue and the server (schema column, seed, two routes). Keep `SwapCandidate` unchanged.
- [ ] **Step 5: Run** `npm run build:cultural && npm test && npm run typecheck && npm run build`; expect green, no diff on a second build; run the server tests (`npm run test:server`).
- [ ] **Step 6: Commit** in tranches: `data: cultural catalogue <tradition list>` for each batch, then `feat: catalogue allCravings and foodInfo across mock, http and server` (explicit paths).

### Task 3: Core model and logic (rules, ranking, meals, occasions, sanitiser)

**Files:**
- Create: `packages/core/src/food/{allergens,rules,rank,meals,occasions,sanitize}.ts` and a `*.test.ts` beside each
- Modify: `packages/core/src/domain/types.ts` (`Profile` gains `foodProfile?: FoodProfile; culturalMeals?: CulturalMeal[]`), `packages/core/src/storage/profileStore.ts` (`sanitizeProfile`), `packages/core/src/budget/entries.ts` (export `isIsoDateTime`), `packages/core/src/domain/swaps/rank.ts` (additive `value: number | null` on `RankedSwap`), `packages/core/src/index.ts`, `packages/core/src/storage/profileStore.test.ts`

**Interfaces:**
- Consumes: Task 1 types; `weekBounds`, `addLocalDays`, `dayIndexMonday`, `isInWeek`, `weekStartMonday` from `budget/week.ts`; `RankedSwap`.
- Produces (`allergens.ts`): `matchAllergies(texts: string[]): { ids: AllergenId[]; unmatched: string[] }` (normalise case, plural, "allergy"/"intolerance" words; maps peanut(s), "nut(s)"/"tree nut" to all nine tree nuts, dairy/milk, egg, soy, wheat, gluten to `wheat` plus `barley`,`rye`,`oats`, sesame, fish, shellfish to `crustacean`+`mollusc`, lupin, sulphite(s)).
- Produces (`rules.ts`): `type Fit = 'fits'|'check'|'out'`; `fitsRules(info: FoodInfo | undefined, rules: DietRule[]): Fit` per the spec table; `fitsAllergies(info: FoodInfo | undefined, ids: AllergenId[], unmatched: string[]): Fit` (`out` if an id is in `allergens`; `check` if `!allergensKnown` or any `unmatched`; else `fits`; no allergies means `fits`); `fitsProfile(info, food: FoodProfile | undefined): Fit` (combine: `out` beats `check` beats `fits`; no profile or nothing chosen means `fits`); `certifiedMeatNote(info, rules): 'halal' | 'kosher' | null`.
- Produces (`rank.ts`): `interface ProfiledSwap { swap: RankedSwap; fit: 'fits'|'check'; kitchen: boolean; certifiedMeat: 'halal'|'kosher'|null }`; `KITCHEN_BOOST = 8`; `rankForProfile(swaps: RankedSwap[], infoOf: (itemId: string) => FoodInfo | undefined, food: FoodProfile | undefined): { shown: ProfiledSwap[]; hidden: number }`. Drops `out`; value plus 8 when the item's `traditions` include one of `food.traditions`; sort `fits` before `check`, each by boosted value descending, unpriced (value null) last, ties keep input order.
- Produces (`meals.ts`): `MAX_MEALS = 200`, `MEAL_RETENTION_WEEKS = 8`, `isCulturalMeal(x: unknown): x is CulturalMeal`, `addMeal(list: CulturalMeal[] | undefined, meal: CulturalMeal, now: Date): CulturalMeal[]` (same window as `addSpend`; invalid or duplicate id returns the same array), `removeMeal(list, id): { meals: CulturalMeal[]; removed?: CulturalMeal }`, `restoreMeal(list, meal): CulturalMeal[]`, `sanitizeMeals(list: unknown[], now?: Date): CulturalMeal[]` (cap 200, prune older than 8 weeks when `now` given), `culturalWeek(meals: CulturalMeal[] | undefined, now: Date): { days: boolean[]; todayIndex: number; count: number; thisWeek: CulturalMeal[]; lastWeek: CulturalMeal[] }` (`days` Monday to Sunday, lists newest first).
- Produces (`occasions.ts`): `interface ActiveOccasion { id: OccasionId; key: string; label: string; start: string; end: string; approx: boolean; phase: 'soon'|'now'; gathering: boolean }`; `occasionsOn(calendar: CalendarRow[], chosen: OccasionId[], dismissed: string[], now: Date): ActiveOccasion[]` ordered `now` before `soon`, `now` by most recent start first, `soon` by earliest start first (window: start minus 7 days to end, plus 1 day when `approx`); `occasionKey(row): string` (`<id>-<start year>`).
- Produces (`sanitize.ts`): `sanitizeFoodProfile(v: unknown): FoodProfile | undefined`, `cleanText(s: string): string` (NFC, strip control and zero-width characters, collapse whitespace, trim, max 40), `MAX_TAGS = 12`, `MAX_DISMISSED = 20`, `normaliseTradition(text: string): string` (returns the starter id when the text equals a starter label or id, case-insensitively).

- [ ] **Step 1: Write failing tests** (assertions use these values):
  - rules: `fitsRules(undefined, ['halal'])` is `'check'`; `fitsRules(undefined, [])` is `'fits'`; for each of the eight rules a table-driven test checks the met value, the excluding value and `unknown` (`halal:'unknown'` with `['halal']` is `'check'`, never `'fits'`); `halal:'no'` plus `kosher:'unknown'` with both rules is `'out'`; `fitsAllergies` with `{allergens:['peanut'], allergensKnown:true}` and `['peanut']` is `'out'`; `allergensKnown:false` is `'check'`; `unmatched:['citrus']` makes every item `'check'`.
  - allergens: `matchAllergies(['Peanuts','nut allergy','Dairy','shellfish','citrus'])` returns ids including `peanut`, all nine tree nuts, `milk`, `crustacean`, `mollusc` and `unmatched:['citrus']`; `'<script>'` is unmatched; empty strings ignored.
  - rank: an item with `fits` and a lower value but a tradition match outranks a higher-value non-match by less than 8 points and not by 15; `check` items sort after all `fits`; `out` is dropped and counted in `hidden`; unpriced stays last; empty profile returns the input order and values unchanged.
  - meals: `addMeal` accepts now, yesterday, Monday 00:00 of last week, rejects tomorrow, rejects Sunday 23:59 two weeks back, rejects an existing id (same array reference); `culturalWeek` with a meal at Sunday 23:59 and another at Monday 00:00 (Melbourne) puts them in different weeks; in the weeks containing the first Sunday of April and of October the week still has seven day slots and the Sunday meal lands in `days[6]`; `removeMeal`/`restoreMeal` round-trip; cap keeps the newest 200; `sanitizeMeals` drops entries older than 8 weeks and invalid ones.
  - occasions: for each lunar `approx` row the end day plus one is active, the day after is not; Ramadan 2027 is `'soon'` on 2027-02-01 and `'now'` on 2027-02-08; on 2029-02-14 with both `ramadan` (ended 13 Feb, still active through the `approx` extra day) and `lent` (starts that day) chosen, the result is `[lent, ramadan]` (order rule: `now` before `soon`; among `now`, the most recently started first; among `soon`, the earliest start first); `dismissed:['ramadan-2027']` hides it; `chosen:[]` returns `[]`; `now` in 2031 returns `[]`; Hanukkah spanning 2027-12-24 to 2028-01-01 has key `hanukkah-2027` on 2028-01-01.
  - sanitize: the Review Focus input classes 2 and 6 (string, array, `null`, 10,000 items, objects with extra keys); `sanitizeFoodProfile({traditions:[],rules:[],allergies:[],occasions:[],dismissed:[]})` is `undefined`; `'  GREEK '` becomes `'greek'`; `'<script>alert(1)</script>'` is kept as literal text (React escapes it) and at most 40 characters; a 500-character tradition is trimmed to 40; `sanitizeProfile` keeps valid `foodProfile`/`culturalMeals` and drops invalid ones; a profile without them round-trips unchanged (existing-profile migration needs no step).
- [ ] **Step 2: Run** `npx vitest run packages/core/src/food packages/core/src/storage` and expect FAIL.
- [ ] **Step 3: Implement** the signatures above. `rankForProfile` reuses `RankedSwap.value`; `rankSwaps` only adds the field. `addMeal`/`restoreMeal`/`removeMeal` mirror `addSpend`/`restoreSpend`/`removeSpend`; export and reuse `isIsoDateTime`.
- [ ] **Step 4: Run** `npm test && npm run typecheck`; expect green (the platform-free test stays green).
- [ ] **Step 5: Commit** `feat: food profile, rule fit, ranking, meals and occasion logic` (explicit paths).

### Task 4: "My food" setup flow and Profile wiring (Welcome button, Menu, summary, clear)

**Files:**
- Create: `src/ui/MyFood.tsx`, `src/ui/FoodSteps.tsx`, `src/ui/FoodSummary.tsx`, `src/ui/TagInput.tsx`, `src/ui/MyFood.test.tsx`, `src/ui/TagInput.test.tsx`
- Modify: `src/ui/views.ts` (`View` gains `'food' | 'meals'`), `src/ui/Menu.tsx` (items "My food" then "Meals that felt like home" after Nearby), `src/ui/Welcome.tsx` (third `PillButton variant="text"`: "Tell us about your food (optional)", prop `onFood`), `src/App.tsx`, `src/ui/views.test.ts`, `src/ui/Menu.test.tsx`, `src/ui/Welcome.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 1 `traditions()`, `occasionDefs()`; Task 3 `sanitizeFoodProfile`, `cleanText`, `normaliseTradition`, `matchAllergies`, `MAX_TAGS`; `FocusHeading`, `PillButton`, `Disclosure`, `INPUT_CLASS`.
- Produces: `MyFood({ value, onSave, onClear, onDone, startAtWizard }: { value: FoodProfile | undefined; onSave: (v: FoodProfile | undefined) => void; onClear: () => void; onDone: () => void; startAtWizard?: boolean })`; `TagInput({ label, values, onChange, max, hint })` (add on Enter or an "Add" button, remove with a labelled button, each tag a round pill, duplicates ignored case-insensitively); `FoodSummary`.
- Wizard steps, exact h1 text: 1 "Which food traditions fit you?" (starter pills + `TagInput` "Add your own"), 2 "Any food rules?" (eight rule pills, each with a one-line plain meaning under it, e.g. "Halal: no pork, no alcohol, meat from halal sources"), 3 "Anything you need to avoid, like an allergy?" (`TagInput`; note "Tell us what to avoid. This does not replace reading labels or medical advice."), 4 "Any occasions you would like a heads-up for?" (selectable occasion pills; own text allowed but says "We cannot give dates for your own occasion"), 5 "Here is what you chose" (review, Save, "Change" per section). Every step: "Optional. Stays on this device. You can clear it any time." with Back, Skip, Next; progress like the check-in. Saving calls `onSave(sanitizeFoodProfile(draft))`. The summary (when a profile exists) lists each section with "Change", then "Clear my food settings" and "Clear my meals" with a `role="status"` line "Cleared. Undo" (undo state in React only) and the shared-device sentence from the spec.
- App wiring: `update({ ...profile, foodProfile })`; clearing sets the key to `undefined` (the sanitiser then omits it); Welcome's `onFood` marks `welcomeSeen`, opens `food` at the wizard, and Done goes to `swaps`.

- [ ] **Step 1: Write failing tests:** the menu lists "My food" and "Meals that felt like home" in order after "Nearby"; Welcome shows the third button and it calls `onFood`; selecting "Greek", "Halal" and typing "Peanuts" then Save stores `{traditions:['greek'], rules:['halal'], allergies:['Peanuts'], ...}` in the profile store and nothing else changes; nothing is pre-selected on a fresh profile (all pills `aria-pressed="false"`); Back keeps the draft; Skip on every step saves nothing and stores no `foodProfile`; "Clear my food settings" removes the key from the stored JSON and "Undo" restores it; "Clear my meals" does the same for `culturalMeals`; typing `GREEK` adds the starter pill state, not a second tag; `<b>x</b>` renders as text; a 40-character own tradition fits at 320px (no horizontal overflow, checked by style and `scrollWidth` in jsdom where possible); each step has exactly one h1 that takes focus; keyboard: Tab reaches pills, Space/Enter toggles, Enter in `TagInput` adds, Escape does not lose the draft; `aria-pressed` reflects state; switching profile (new `key`) shows no food state from the previous one.
- [ ] **Step 2: Run** `npx vitest run src/ui src/App.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement** the components and wiring. Copy the layout of `Questionnaire.tsx` (progress, Back, Skip) and the pill selection of its `Pill`; text inputs use `INPUT_CLASS`. Starter pills come from `traditions()`; occasion pills from `occasionDefs()` where `selectable`.
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run build`; expect green.
- [ ] **Step 5: Commit** `feat: My food setup, summary, clear and menu wiring` (explicit paths).

### Task 5: Swaps integration (hide, "Fits your kitchen", "Check the ingredients")

**Files:**
- Modify: `packages/core/src/services/swapService.ts`, `packages/core/src/services/swapService.test.ts`, `src/ui/CravingSearch.tsx`, `src/ui/SwapResults.tsx`, `src/ui/swaps.test.tsx`, `src/ui/CravingSearch.popular.test.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `rankForProfile`, `matchAllergies`, `ProfiledSwap` (Task 3); `FoodCatalogue.foodInfo`, `allCravings` (Task 2).
- Produces: `SwapsWithBaseline` gains `profiled: ProfiledSwap[]`, `hidden: number`, `unmatchedAllergies: string[]`; `swaps` is `profiled.map(p => p.swap)` so existing callers keep working; with no `foodProfile` the output is identical to today (test pins it). `SwapResults` props gain optional `notes?: Record<string, { fit: 'fits'|'check'; kitchen: boolean; certifiedMeat: 'halal'|'kosher'|null }>`, `rulesOn?: boolean`, `hidden?: number`, `unmatchedAllergies?: string[]`. `CravingSearch` also lists popular cravings of the person's traditions first when any (still the same 10 when none).
- Copy (exact): row label "Fits your kitchen"; "Check the ingredients"; "Use halal-certified meat." / "Use kosher-certified meat."; line above the list when any rule is on: "Showing swaps that match your food rules. This is a guide, not a certification. Check labels."; all hidden: "We do not have a swap that fits all your food rules yet. You can change them in My food."; unmatched allergy: "We could not check "X". Read every label."; a chosen tradition with no catalogue food: "We do not have swaps for Greek yet, but your food rules still apply." (uses the label); a footnote when any cultural item shows: "Nutrition estimated from public food tables."

- [ ] **Step 1: Write failing tests:** with `rules:['halal']` the pork-containing sample item never appears for any craving, and an item with `halal:'unknown'` appears last with "Check the ingredients"; with no `foodProfile` the ranked output equals the current output exactly (golden test over all 10 popular cravings); a Greek tradition shows "Fits your kitchen" on a Greek-tagged swap and ranks it up by at most the boost; hidden-all shows the exact sentence and nothing else; unmatched allergy text shows the exact sentence and all rows say "Check the ingredients"; a halal chicken swap shows "Use halal-certified meat."; no food string appears in the DOM outside the labels above (the person's own text is not echoed on swaps except the unmatched-allergy sentence); the swaps view makes no network call carrying profile text (spy on `fetch` with the HTTP services).
- [ ] **Step 2: Run** the targeted tests and expect FAIL.
- [ ] **Step 3: Implement** the service changes (fold `rankForProfile` after `rankSwaps`; `foodInfo` read from the catalogue; the profile is read only locally) and the UI.
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run build`; expect green.
- [ ] **Step 5: Commit** `feat: swaps fit food rules and traditions` (explicit paths).

### Task 6: "Meals that felt like home" tracker view

**Files:**
- Create: `src/ui/MealsView.tsx`, `src/ui/WeekRing.tsx`, `src/ui/AddMeal.tsx`, `src/ui/MealsView.test.tsx`, `src/ui/WeekRing.test.tsx`
- Modify: `src/App.tsx`, `src/ui/WeekCard.tsx` (a text button "Meals that felt like home" that navigates; no meal data enters `WeekCard` or `shareText`), `src/ui/MyFood.tsx` (link)

**Interfaces:**
- Consumes: `addMeal`, `removeMeal`, `restoreMeal`, `culturalWeek`, `labelFor` (Tasks 1, 3).
- Produces: `MealsView({ meals, traditions, now, onChange, onSetUpFood }: { meals: CulturalMeal[] | undefined; traditions: string[]; now: Date; onChange: (next: CulturalMeal[]) => void; onSetUpFood: () => void })`; `WeekRing({ days, todayIndex }: { days: boolean[]; todayIndex: number })` (seven round dots in a ring, Monday first, filled = a meal that day, today outlined; `role="img"` and an `aria-label` such as "Monday to Sunday: meals on Monday, Wednesday and Saturday", "no meals yet" when empty); `AddMeal`.
- Behaviour (spec ruling 6): "Add a meal" shows the person's traditions plus "Other" as pills and a "Today" day control with "Change day" (this or last Monday-week); tapping a tradition saves at once and shows `role="status"` "Added: Greek, today. Add details | Undo"; "Add details" reveals dish (max 40) and "who with" pills; Remove shows "Removed. Undo"; sentence "N meals that felt like home this week" (singular for 1); zero shows "Nothing here yet this week. Add a meal when you like." and never a number 0; last week under a `Disclosure`; ids from `crypto.randomUUID` with the same fallback used in `AddSpend`; no streak, target, total, badge or comparison anywhere.

- [ ] **Step 1: Write failing tests:** two interactions (open, tap tradition) create exactly one meal dated `now` with the tradition id; no traditions shows "Other" and a "Set up My food" button; Undo after add removes it, Undo after Remove restores it with the same id; "Change day" cannot choose tomorrow or a day before last Monday; the ring marks Monday, Wednesday and Saturday for meals on those days and `aria-label` says so; empty copy has no digit; 1 versus 4 meals sentence; a 201st meal drops the oldest; the 8-week prune on load; a meal from last week appears only under "Last week"; `WeekCard` share output and `shareText` for a profile with meals contain no meal text; Budget view unchanged; stored JSON changes only the `culturalMeals` key; keyboard-only completion of add, details, remove and undo; the h1 "Meals that felt like home" is the only h1.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** the view (copy the structure and undo pattern of `BudgetView`/`AddSpend`; `WeekRing` is a small SVG using semantic fill classes, no hairlines, reusing `PlateRim` only if its API fits).
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run build`; expect green.
- [ ] **Step 5: Commit** `feat: meals that felt like home tracker` (explicit paths).

### Task 7: Occasion reminders

**Files:**
- Create: `src/ui/OccasionLine.tsx`, `src/ui/OccasionLine.test.tsx`
- Modify: `src/App.tsx` (render above the swaps content only on the `swaps` view), `src/ui/MyFood.tsx` (summary section "Coming up" listing dates for chosen occasions within the next 12 months, with the sighting caveat for `approx` rows)

**Interfaces:**
- Consumes: `occasionsOn`, `calendar()`, `ActiveOccasion` (Tasks 1, 3).
- Produces: `OccasionLine({ active, onSeeSwaps, onBudget, onDismiss }: { active: ActiveOccasion | undefined; onSeeSwaps: () => void; onBudget: () => void; onDismiss: (key: string) => void })`; renders nothing when `active` is undefined; copy: "<Label> starts about <ddd d MMM>. Dates depend on the moon sighting." for `approx` lunar, "<Label> starts <ddd d MMM>." otherwise, "<Label> is on now." when `phase:'now'`; evening starts add "(from the evening before)"; links "See swaps that fit"; "Look at your budget" with the sentence "Gatherings can cost more. Here is your budget." only when `gathering`; a "Not now" text button; no notifications, badges, counters or permission prompts. Dismiss stores the key in `foodProfile.dismissed` (cap 20, pruned of keys whose year has passed).

- [ ] **Step 1: Write failing tests:** only one line renders when two occasions are active; nothing renders when no occasion is chosen, on the number screen, check-in, budget and week views; "Not now" hides it and stores `ramadan-2027` and it stays hidden on re-render and after a reload of the profile; dismissed keys older than a year are pruned on the next save; Ramadan copy contains "about" and the caveat, Easter's does not; the budget link exists for Eid and Lunar New Year but not for Ramadan or Lent; no `Notification` or `serviceWorker` use (grep test); the line never changes which swaps are shown.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** with `useNow`-style injected time and the pure `occasionsOn`.
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run build`; expect green.
- [ ] **Step 5: Commit** `feat: quiet occasion reminders` (explicit paths).

### Task 8: Nearby tags (DEFERRED: do not execute in this release)

Spec ruling 8 defers this. Nothing in this task is built now; it is kept so the interface is decided. **Preconditions before anyone starts:** a place dataset version where every tag is backed by the operator's or certifier's own page (recorded with licence and checked date); `Place.foodTags?: FoodTag[]` with `FoodTag = { tag: 'halal-certified'|'kosher-certified'|'vegetarian-friendly'|'cuisine'; value?: string; sourceId: string }`; Nearby uses tags only to boost order for the person's chosen traditions and rules, never to filter or to claim "halal" without the certifier's page; the person's food choices are read locally and never leave the device (same privacy test as Task 5). Task 9 and Task 10 must not depend on it.

### Task 9: Visuals and Playwright verification

**Files:**
- Modify: whichever `src/ui/*` files the screenshots show need fixing; `src/index.css` only if a class is missing (no hard-coded colours)
- Create: no committed screenshots (screenshots are saved under `shots/`, which is untracked)

**Interfaces:** none new.

- [ ] **Step 1: Start the app** (`npm run dev`, port 8443) and, with Playwright MCP, set a profile with dummy data only (never real personal data): traditions Greek and Vietnamese, rules halal and gluten-free, allergy "peanuts", occasion Ramadan, two meals.
- [ ] **Step 2: Capture and inspect screenshots** at 320, 390, 768 and 1280px, in all four themes (tobacco, sand, walnut, cream), of: Welcome with the new text button; each wizard step; the summary; Swaps with rules on, with a check item, with everything hidden, and with the reminder line; Meals with 0, 1 and 4 meals, last-week disclosure, the ring in all themes.
- [ ] **Step 3: Fix** every defect found: overflow, clipped 40-character pills, contrast, touch target under 44px, focus ring missing, cards/chips/hairlines/shadows/gradients, heading order, text under 14px where the system forbids it. Re-capture until clean. Run `node scripts/contrast.mjs` and expect it to pass.
- [ ] **Step 4: Keyboard and screen-reader pass:** tab through every new screen; confirm focus lands on the h1 on each step and view change; read the accessibility snapshot for each view and confirm pill state, group labels and status regions.
- [ ] **Step 5: Network and storage pass:** in Playwright record `browser_network_requests` for a full flow and confirm no request contains any chosen text; evaluate `Object.keys(localStorage)` and confirm only the expected keys; clear all food data and confirm the stored JSON.
- [ ] **Step 6: Run** `npm test && npm run typecheck && npm run build`; expect green.
- [ ] **Step 7: Commit** `style: cultural food views in the plate design` (explicit paths).

### Task 10: Docs, privacy test file and gates

**Files:**
- Create: `src/ui/foodPrivacy.test.tsx`
- Modify: `AGENTS.md` (Layout, Product flow, Privacy rules paragraphs for My food, Meals and reminders; the `View` list), `docs/FEATURES.md`, `docs/superpowers/research/README.md`, `server/README.md` (the two routes)

**Interfaces:** none new.

- [ ] **Step 1: Write the privacy test file** (spec ruling 7 plan, all items): (a) `shareText` and the week share text contain no food string for a profile with every field set; (b) with HTTP services and a spied `fetch`, a full flow (setup, search, rank, add meal, remove, clear) sends no request whose URL, headers or body contains any chosen string, rule id or meal text; (c) only the profile key changes in `localStorage`, and `sessionStorage`, `document.cookie` and `indexedDB.databases()` are untouched; (d) no `console.` in the new files and no `Notification`, `serviceWorker`, `sendBeacon`, `navigator.share` with food text; (e) clear removes the keys from the stored JSON, profile delete removes the key, "Start from my current data" carries both fields into the new profile; (f) food text never appears in `document.title`, `location`, or `data-` attributes; (g) one server test asserting routes ignore a profile-shaped body.
- [ ] **Step 2: Run** and fix until green. If a privacy assertion fails, fix the code, not the test.
- [ ] **Step 3: Update docs:** AGENTS.md (Privacy rules gain "food traditions, rules, allergies, occasions and meals stay on the device in the profile"; Product flow gains My food, Meals that felt like home, reminders; Layout gains `food/`, `cultural/`), FEATURES.md, research README (cultural dataset rules and refresh steps), server README.
- [ ] **Step 4: Full gates:** `npm run build:cultural` (no diff), `npm test`, `npm run typecheck`, `npm run build`, `node scripts/contrast.mjs`; all green.
- [ ] **Step 5: Commit** `docs: cultural food usage, privacy tests and refresh notes` (explicit paths).
