# Pantry and "Cook from what you have" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a person list what they have (on their device), then see original, cheap recipes they can cook now or with one more thing, filtered by their food rules and allergies and by use-by dates.

**Architecture:** A sourced recipe dataset (own recipes over the AFCD-backed ingredient table) validated and generated like the cultural data; pure matching, ranking, date-safety and shopping functions in `packages/core`; two new views (`pantry`, `cook`) over the existing profile store. No network, no server change.

**Tech Stack:** TypeScript, React 19, Vite 8, Tailwind v4, Vitest + Testing Library, Playwright MCP for screenshots.

**Spec:** `docs/superpowers/specs/2026-10-29-pantry-recipes-design.md`. Read it whole, including "Builder-check rulings": **the rulings win**. Also read `AGENTS.md`, the research note `docs/superpowers/research/2026-10-29-whatif-pantry-tradeoffs.md` (section B) and its sources JSON. Patterns to copy: `scripts/build-cultural.mjs` (+ `.d.mts`, `.test.ts`; `deriveFlags`, `computeNutrition` are exported), `packages/core/src/food/{rules,rank,sanitize,meals}.ts`, `packages/core/src/storage/profileStore.ts` (`sanitizeProfile`), `src/ui/MealsView.tsx` + `AddMeal.tsx` (undo), `src/ui/MyFood.tsx`, `src/ui/foodPrivacy.test.tsx`, `src/ui/FocusHeading.tsx`, `src/ui/NutritionCredit.tsx`. Taste skill: `~/.agents/skills/design-taste-frontend`.

## Global Constraints

- **Privacy (hard):** `pantry` and `shoppingList` live only in the profile JSON on the device (`culinerity.profile.v1` / `.<id>`). The feature makes no network request. They never appear in the week share text, `document.title`, URL, `data-` attributes, `console.*`, analytics, sessionStorage, cookies or IndexedDB. Nothing is inferred. "Clear my pantry" and "Clear list" always work. Passcode is access control, not encryption.
- **No invented data:** nutrition, attributes, flags and prices come from the JSON with a `sourceId`; unknown stays `unknown` and never passes a rule. Prices are sample estimates (`isSample`), always shown as "Sample data". Missing price gives `null`, never 0. Cultural generated file must not change (`npm run build:cultural` leaves no diff).
- **Food-safety honesty:** never say food is safe, fresh or certified; copy is "a guide, not a certification. Check labels." Past use-by is set aside. Past best-before on `highRisk` ingredients is treated as use-by. No temperature, time or storage figure unless it comes from a recorded source (NSW Food Authority leftovers, FSANZ date marks). No raw poultry, mince, raw seafood or soak-and-boil bean recipes without a recorded source.
- **Rules:** allergies and diet rules are hard filters via `fitsProfile`; `out` is hidden (counted), `check` shows "Check the ingredients". Substitution pairs must have identical diet flags and allergens.
- **Staples:** only water is assumed; salt and pepper are text-only; all other staples are chosen by the person; nothing pre-selected.
- **Caps and limits:** pantry 200 items, staples 40, shopping list 100, name 1 to 40 chars, grams 1 to 50000, serves 1 to 8, recipe 2 to 9 counted ingredients, 5 to 60 minutes, at most $4.00 a serve (sample), floor of 40 recipes (target 48) with at least 10 traditions having 2 or more.
- **Plate design system:** Schibsted Grotesk, fully round shapes, flat colour, no cards, hairlines, shadows or gradients; semantic colour names only; `PillButton`, `INPUT_CLASS`/`FIELD_EDGE`; one `h1` per view via `FocusHeading`; 44px targets; AA in all four themes; `motion-safe` only; no horizontal scroll at 320 to 1280px; no `!` overrides.
- **Core stays platform-free** (`platformFree.test.ts`; add `recipes/generated` to its generated list). `now` is injected; tests run in `TZ=Australia/Melbourne`; day maths via `packages/core/src/budget/week.ts` helpers.
- **Every task ends green:** `npm test`, `npm run typecheck`, `npm run build`; data tasks also `npm run build:recipes` and `npm run build:cultural` leave no diff. Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01CVJsJBKSnSRKS1F3CWccnQ`. Stage by explicit path. Never push or merge. Sonnet only. TDD. Branch `feature/pantry-recipes` cut at execution time.

## Review Focus

Input classes the spec implies; each line has its test in the owning task.

1. **Past use-by never suggested.** Item with use-by yesterday, use-by today (usable, "Use by today"), a past best-before on `highRisk` (excluded) versus on tinned goods (kept with "check" line), and the date arithmetic on the DST Sundays. (Task 3)
2. **Unknown never passes.** Recipe with one `unknown` flag and rules on gives `check`; a free-text item never makes a recipe `now`; allergens hide recipes even when the pantry covers them. (Task 3)
3. **Odd text and corrupt storage.** `<script>`, emoji, zero-width, 500 characters, only spaces, "  RICE ", stored `pantry` as string/array/null/10,000 items, `grams` `NaN`/negative/`"1e9"`, an older profile without the fields. Sanitised, capped, literal text, no throw. (Task 2)
4. **Nothing to show.** No pantry; only free-text items; everything filtered by rules; zero `now` matches with `suggestAdditions` empty. Calm sentence each time, never blank. (Task 5)
5. **Privacy leak paths.** Add items, open a recipe, add to shopping list, share the week, switch profile: no pantry text in any request, share text, title, URL, `data-` attribute, console, storage key other than the profile's. (Task 5)

---

## File Structure

- `docs/superpowers/research/2026-10-29-pantry-recipes.json`, `scripts/build-recipes.mjs` (+ `.d.mts`, `.test.ts`), `packages/core/src/recipes/{types,source}.ts`, `recipes/generated/recipes.generated.ts`, `recipes/recipes.test.ts` (Task 1)
- `packages/core/src/pantry/{types,sanitize,items,search,dates}.ts` + tests; modify `domain/types.ts` (`Profile`), `storage/profileStore.ts`, `index.ts` (Task 2)
- `packages/core/src/pantry/{match,rank,safety,shopping}.ts` + tests (Task 3)
- `src/ui/PantryView.tsx`, `PantryAdd.tsx`, `PantryList.tsx`, `pantryCopy.ts`; modify `views.ts`, `Menu.tsx`, `App.tsx` (Task 4)
- `src/ui/CookView.tsx`, `RecipeRow.tsx`, `RecipePage.tsx`, `ShoppingList.tsx`, `pantryPrivacy.test.tsx` (Task 5)
- Screenshots, a11y fixes (Task 6); `AGENTS.md`, `docs/FEATURES.md`, `docs/superpowers/research/README.md`, `package.json` (Task 7, and `build:recipes` script in Task 1)

---

### Task 1: Recipe dataset and generator

**Files:**
- Create: `docs/superpowers/research/2026-10-29-pantry-recipes.json`, `scripts/build-recipes.mjs`, `scripts/build-recipes.d.mts`, `scripts/build-recipes.test.ts`, `packages/core/src/recipes/types.ts`, `packages/core/src/recipes/source.ts`, `packages/core/src/recipes/generated/recipes.generated.ts`, `packages/core/src/recipes/recipes.test.ts`
- Modify: `package.json` (`"build:recipes": "node scripts/build-recipes.mjs"`), `packages/core/src/index.ts`, `packages/core/src/platformFree.test.ts`

**Interfaces:**
- Consumes: `deriveFlags(ingredients, lookup)`, `computeNutrition(food, table)` from `scripts/build-cultural.mjs`; the cultural JSON's `ingredients`, `traditions`, `sources`.
- Produces (`recipes/types.ts`, exported from core): `Recipe`, `RecipeIngredient`, `Substitution { from: string; to: string; note: string }`, `IngredientRow` (cultural row shape plus `aliases?: string[]`, `highRisk?: boolean`), `IngredientPrice { ingredient: string; perKg: number }`, `RecipesData { generatedAt; sources: SourceRecord[]; ingredients: IngredientRow[]; prices: IngredientPrice[]; substitutions: Substitution[]; recipes: Recipe[]; starters: string[]; notFound: string[] }`.
- Produces (`recipes/source.ts`): `recipesData`, `allRecipes(): Recipe[]`, `recipeById(id): Recipe | undefined`, `pantryIngredients(): IngredientRow[]` (cultural rows plus extras), `ingredientName(id): string`, `priceOf(id): number | undefined`, `substitutionsFor(id): Substitution[]`, `STARTER_IDS`, `recipeSources()`. All return copies.

- [ ] **Step 1: Write failing validator tests** in `scripts/build-recipes.test.ts`, one per rule: ingredient id not in table rejected; counted ingredient without `per100g` rejected; recipe with 10 ingredients, 61 minutes, 0 steps or a 161-char step rejected; substitution whose flags or allergens differ rejected; ingredient used without a price rejected; unknown tradition id rejected; source without https URL/licence/accessed rejected; a step containing `°C` or a number followed by `minutes` for a `highRisk` ingredient without a `sourceId` rejected; fewer than 40 recipes or fewer than 10 traditions with 2 recipes rejected; raw `highRisk` poultry/mince/seafood recipe rejected unless `cookThroughSourceId` names a source; `deriveFlags` result for a vegetarian dal recipe; computed nutrition equals the per-100g sums (use one hand-checked recipe).
- [ ] **Step 2: Run** `npx vitest run scripts/build-recipes.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `validateRecipes(d, cultural)`, `buildRecipes(d, cultural)` and a `main` that writes the generated file, in `scripts/build-recipes.mjs`, reusing the exported cultural functions. Output carries `sodiumModelled: false` on every recipe. Add `.d.mts` types.
- [ ] **Step 4: Author the data.** Read the AFCD Release 3 workbook as the cultural pipeline did (record `nutritionCode`) for each added `extraIngredients` row (tinned tuna, baked beans, frozen peas, canned corn, tinned beans, bread, cheddar, others the recipes need); a value that cannot be read means the row and its recipes are dropped and logged in `notFound`. Try to read an official cook-through source for poultry and mince and record it; if unreadable, ship no such recipes. Write 48 recipes (floor 40) in the app's own words, about 12 basics and the rest over at least 10 traditions, at least 20 `vegetarian: yes`, about 15 `substitutions` with identical flags, `aliases`, `starters` (the 14 spec ids), `ingredientPrices` (sample, 10c rounding), and the sources `afcd-r3`, `nsw-fa-leftovers`, `nsw-fa-copyright`, `fsanz-date-marks`.
- [ ] **Step 5: Write `recipes/recipes.test.ts`**: the freshness test (regenerate in memory equals committed file, same as cultural), count pins (at least 40 recipes), every recipe id unique, every ingredient resolves via `pantryIngredients()`, accessors return copies, `recipeById('nope')` is undefined, and `buildCultural` output is unchanged.
- [ ] **Step 6: Run** `npm run build:recipes && npm run build:cultural && git diff --stat -- packages/core/src/cultural` (expect no cultural diff), then `npm test`, `npm run typecheck`, `npm run build`. Expected: all pass.
- [ ] **Step 7: Commit** `feat: pantry recipe dataset, validator and generator` (stage the files by path).

### Task 2: Pantry model, search, dates and profile storage

**Files:**
- Create: `packages/core/src/pantry/{types,sanitize,items,search,dates}.ts` and one `.test.ts` each
- Modify: `packages/core/src/domain/types.ts` (`Profile.pantry?`, `Profile.shoppingList?`), `packages/core/src/storage/profileStore.ts` (`sanitizeProfile`), `packages/core/src/index.ts`; check `src/storage/localProfileStore.ts` and `src/auth` for the "start from my current data" copy path and carry both fields over

**Interfaces:**
- Consumes: `IngredientRow`, `pantryIngredients()` (Task 1); `addLocalDays` from `budget/week.ts`.
- Produces (`pantry/types.ts`): `DateKind`, `PantryItem`, `PantryState`, `ShoppingEntry` exactly as the spec; constants `PANTRY_CAP = 200`, `STAPLES_CAP = 40`, `SHOPPING_CAP = 100`, `NAME_MAX = 40`, `DEFAULT_SERVES = 2`.
- Produces: `sanitizePantry(value: unknown): PantryState | undefined`, `sanitizeShopping(value: unknown): ShoppingEntry[] | undefined`, `cleanName(text: string): string` (NFKC, strip control/zero-width, collapse spaces, trim, max 40; `''` when empty).
- Produces (`items.ts`, all pure, return new state): `addItem(state, input: { ingredientId?: string; name: string; grams?: number; dateKind?: DateKind; date?: string }, now: Date, newId: () => string): { state: PantryState; error?: 'full' | 'empty' | 'bad-grams' | 'bad-date' }`, `removeItem(state, id): { state; undo: PantryState }`, `setStaple(state, ingredientId, on): PantryState`, `setServes(state, n): PantryState`, `clearPantry(state): { state; undo: PantryState }`, `parseGrams(text: string): number | null` ("250", "1.5kg", rejects 0, negative, `NaN`, "1e9").
- Produces: `searchIngredients(query: string, ingredients: IngredientRow[], limit = 8): IngredientRow[]` (prefix, word prefix, substring over name and `aliases`; diacritics folded; empty query returns `[]`).
- Produces (`dates.ts`): `dateStatus(item: PantryItem, now: Date, highRisk: boolean): { status: 'none' | 'ok' | 'soon' | 'today' | 'past' | 'check-look'; label: string; usable: boolean }` where `soon` is within 3 days; `eatBy(item, now): { label; past: boolean } | null` for `cooked` using 3 days, rice and pasta 2; `isIsoDay(text): boolean`.

- [ ] **Step 1: Write failing tests**: `cleanName('  RICE ')` is `'RICE'` and a 500-char string is cut to 40; `'<script>alert(1)</script>'` stays literal text; zero-width and emoji handled; `cleanName('   ')` is `''`; `addItem` refuses the 201st item with `'full'` and leaves state unchanged; invalid date `'2026-02-30'` gives `'bad-date'`; dates beyond 5 years ahead rejected; duplicate ids merge only when neither has a date; `parseGrams` table above; `sanitizePantry` on a string, array, `null`, `{items: 10000 entries}` (capped at 200), items with `grams: NaN`, a date without a kind (both dropped), and duplicate item ids (kept once); `sanitizeProfile` of an old profile without the fields leaves them absent; `searchIngredients('tinned tom')` finds tinned tomatoes through an alias, `'RICE'` and `'rice'` equal, `'é'` folding; `dateStatus` for use-by yesterday (`past`, `usable: false`), today (`today`, usable), in 2 days (`soon`), best-before yesterday with `highRisk` true (`past`, not usable) and false (`check-look`, usable), on 2026-04-05 and 2026-10-04 (DST Sundays) arithmetic correct; `eatBy` for cooked rice 2 days versus stew 3 days.
- [ ] **Step 2: Run** `npx vitest run packages/core/src/pantry`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above. `sanitizeProfile` calls `sanitizePantry`/`sanitizeShopping` the way it calls `sanitizeFoodProfile`. Check `platformFree.test.ts` still passes.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run build`. Expected: pass.
- [ ] **Step 5: Commit** `feat: pantry model, search, dates and profile storage`.

### Task 3: Matching, ranking, safety and shopping logic

**Files:**
- Create: `packages/core/src/pantry/{match,rank,safety,shopping}.ts` and tests
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: Task 1 and 2 types; `fitsProfile`, `certifiedMeatNote` from `food/rules`.
- Produces: `Tier`, `MissingItem`, `AppliedSub`, `RecipeMatch` exactly as the spec; `matchRecipes(input: { recipes: Recipe[]; pantry: PantryState; food?: FoodProfile; now: Date; prices: Map<string, number>; substitutions: Substitution[]; highRisk: Set<string> }): { matches: RecipeMatch[]; hidden: number; setAside: PantryItem[] }`; `suggestAdditions(matches: RecipeMatch[], limit?: number): string[]`; `costCents(missing: MissingItem[]): number | null` (rounds the total up to the next 10c); `recipeCostPerServeCents(recipe, prices): number | null`; `scaledGrams(grams, serves, recipeServes): number` (rounded to nearest gram, at least 1); `safetyLines(recipe: Recipe): string[]` (the fixed NSW lines, own wording; rice and pasta line only when tagged); `addMissingToList(list: ShoppingEntry[], missing: MissingItem[], recipeId: string, now: Date, newId: () => string): { list: ShoppingEntry[]; added: number; undo: ShoppingEntry[] }` (skips duplicates by `ingredientId`, respects the 100 cap); `removeEntry`, `clearList` (both with undo); `listTotalCents(list, prices): number | null`.

- [ ] **Step 1: Write failing tests** with a tiny fixture of 4 recipes: all counted ingredients present is `now`; one missing is `one` with `missingCostCents` equal to the hand-computed rounded value, and `null` when that ingredient has no price; 4 missing is dropped; a staple counts as present; water and salt never missing; a listed substitution counts and appears in `subs`; the substitute past its use-by does not; entered grams below the scaled need gives `not-enough`; serves 4 on a serves-2 recipe doubles the need; optional ingredient absent keeps `now`; a free-text item never covers an ingredient; **Review Focus 1 and 2 cases** (use-by yesterday set aside and recipe goes to `one`, use-by today usable, `highRisk` past best-before excluded, tinned past best-before kept with the id in `checkDates`; one `unknown` flag with a rule on gives `check`; `out` recipe hidden and counted even when pantry covers it; `kitchen` from a chosen tradition case-insensitive); ordering test: tier, then `fits` before `check`, then more `usesSoon`, then `kitchen`, then coverage, then cost (null last), then name; empty recipes and empty pantry return empty without throwing; `suggestAdditions` returns the most-unlocking single missing ingredients; `addMissingToList` dedupes and caps; undo restores; `safetyLines` for a rice recipe includes the 2-day line and never contains a temperature other than the one from the recorded source.
- [ ] **Step 2: Run** `npx vitest run packages/core/src/pantry`. Expected: FAIL.
- [ ] **Step 3: Implement** the signatures above. Follow the spec's algorithm (usable items, have/substitute/missing, tier, filter, ordering as a comparator, integer cents).
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run build`. Expected: pass.
- [ ] **Step 5: Commit** `feat: pantry recipe matching, ranking, safety and shopping logic`.

### Task 4: Pantry view

**Files:**
- Create: `src/ui/PantryView.tsx`, `src/ui/PantryAdd.tsx`, `src/ui/PantryList.tsx`, `src/ui/pantryCopy.ts` (exact strings), `src/ui/PantryView.test.tsx`
- Modify: `src/ui/views.ts` (`'pantry' | 'cook'` in `View`), `src/ui/Menu.tsx` ("My pantry", "Cook with what you have"), `src/App.tsx` (view switch), `src/ui/Menu.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 2 functions; `useServices()` profile store and the same load/save pattern `MealsView` uses; `PillButton`, `FocusHeading`, `INPUT_CLASS`.
- Produces: `PantryView({ profile, onProfile, now, onNavigate })`; copy constants in `pantryCopy.ts` including `SHARED_DEVICE = 'Your pantry is saved on this device only. Anyone who can open your profile here can see it.'`.

- [ ] **Step 1: Write failing tests**: renders one `h1` "My pantry" with focus on it; empty state text and starters pills visible; typing "tinned tom" lists tinned tomatoes, Enter or tap adds it and a `role="status"` says so; starter pill toggles with `aria-pressed` and a second tap removes with Undo; "Add \"zzz\" anyway" stores free text and shows the "no details" note; a 500-char entry saves 40 chars as literal text (no script element in DOM); quantity "1.5kg" saves 1500; invalid quantity shows an inline message and keeps the old value; use-by in the past appears under "Set aside" with the exact line; 201st add shows the full message; Remove then Undo restores position; "Clear my pantry" then Undo; staples group toggles with `aria-pressed`, none preselected; shared-device sentence present; 200 items shows 50 and "Show all 200"; keyboard-only add works; profile switch shows the other profile's pantry (no leakage).
- [ ] **Step 2: Run** `npx vitest run src/ui/PantryView.test.tsx src/ui/Menu.test.tsx src/App.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the views per the spec's "My pantry" section; the list groups "Use soon", "In your pantry", "Set aside" from `dateStatus`; edit-in-disclosure for quantity and date. Menu order: after "Meals that felt like home"; Cook after My pantry.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run build`. Expected: pass.
- [ ] **Step 5: Commit** `feat: my pantry view`.

### Task 5: Cook results, recipe page, shopping list and privacy test

**Files:**
- Create: `src/ui/CookView.tsx`, `src/ui/RecipeRow.tsx`, `src/ui/RecipePage.tsx`, `src/ui/ShoppingList.tsx`, `src/ui/CookView.test.tsx`, `src/ui/RecipePage.test.tsx`, `src/ui/pantryPrivacy.test.tsx`
- Modify: `src/ui/PantryView.tsx` (mount `ShoppingList`), `src/App.tsx`, `src/ui/pantryCopy.ts`

**Interfaces:**
- Consumes: `matchRecipes`, `suggestAdditions`, `safetyLines`, `addMissingToList`, `listTotalCents`, `recipeCostPerServeCents`, `allRecipes`, `priceOf`, `NutritionCredit`, `fitsProfile` copy strings from `foodCopy.ts`.
- Produces: `CookView({ profile, onProfile, now, onNavigate })`; `RecipePage({ recipe, match, serves, onBack, onAddMissing })`; `ShoppingList({ list, onChange })`.

- [ ] **Step 1: Write failing tests**: sections "You can cook this now", "Need one more thing", "Need a few more things" with the exact status line "Need one more thing: Tinned tomatoes (about $1.40, sample price)"; "Uses your spinach (use by Sat 31 Oct)"; "Using green lentils instead of red"; "Check the ingredients" on `check`; the rules line only when food settings exist, with the exact swaps wording; "N recipes are hidden because of what you told us to avoid"; Review Focus 4 (no pantry, only free text, all filtered, nothing close with suggestions) each show a calm sentence and a link, never blank; serves stepper rescales grams on the recipe page; recipe page shows ingredient status labels, numbered steps, per-serve energy/protein/fibre/sugars, no sodium and "Salt isn't counted", "About $X a serve (sample data)", `NutritionCredit`, the NSW lines with the notice "(c) State of New South Wales through the NSW Food Authority" and the "NSW, not Victoria" wording; Back restores focus to the row; "Add missing to my shopping list" adds only missing, Undo works, duplicates skipped; shopping total shown only when every entry priced; links to Swaps and Budget; no "Log as a meal". `pantryPrivacy.test.tsx` (Review Focus 5): spy on `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `console.*`, `document.title`, `location`, `Storage.setItem` (only the profile key written), `navigator.share`/clipboard (week share text excludes pantry text), `[data-*]` scan; flow: add items with a distinctive marker, open a recipe, add to list, share the week, switch profile; detectors proven live by a deliberate leak fixture.
- [ ] **Step 2: Run** `npx vitest run src/ui/CookView.test.tsx src/ui/RecipePage.test.tsx src/ui/pantryPrivacy.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per the spec's "Cook with what you have" and "Recipe page" sections. Pantry text is rendered only as React text nodes. Add the pregnancy/immune line only if the NSW PDF has been read in Task 1; otherwise leave a code comment pointing at the spec's open item.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run build`. Expected: pass.
- [ ] **Step 5: Commit** `feat: cook from what you have, recipe page and shopping list`.

### Task 6: Visual verification and accessibility

**Files:**
- Modify: whichever `src/ui` files the screenshots show need fixing; no new product files
- Output: screenshots in the scratchpad directory only

- [ ] **Step 1: Start** `npm run dev` (port 8443) and with Playwright MCP load a profile with a rich pantry (rice, egg, onion, tinned tomatoes, spinach with a use-by in 2 days, one past use-by, three free-text items) and with food rules (vegetarian, one allergy).
- [ ] **Step 2: Screenshot** My pantry, Cook results, the recipe page and the shopping list in all four themes at 320, 390, 768 and 1280 widths; check no horizontal scroll, 40-character names, plate rules (round, flat, no cards or hairlines), focus rings, and reduced motion.
- [ ] **Step 3: Check** keyboard-only add, open recipe, back, add missing; `node scripts/contrast.mjs` passes; fix any problem found and add a test where logic was involved.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run build`. Expected: pass.
- [ ] **Step 5: Commit** `fix: pantry and recipe layout polish` (only if files changed; stage by path).

### Task 7: Docs and gates

**Files:**
- Modify: `AGENTS.md` (layout entries for `packages/core/src/{pantry,recipes}`, the new views, product flow, "Pantry recipes data rules", privacy line for `pantry`/`shoppingList` and `pantryPrivacy.test.tsx`), `docs/FEATURES.md`, `docs/superpowers/research/README.md`, `package.json` (script already added), `README.md` if it lists scripts

- [ ] **Step 1: Update** the docs: the generator workflow (`npm run build:recipes`, commit JSON plus generated file, freshness test), the sample-price rule, the cook-through and soak-and-boil exclusions, the NSW attribution requirement, the open items (Victorian page, dietitian review, pregnancy line), and the `notFound` list.
- [ ] **Step 2: Run the full gates**: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:recipes`, `npm run build:cultural`, `git status --short` (no generated diff), `node scripts/contrast.mjs`.
- [ ] **Step 3: Whole-branch review** by a fresh reviewer against the spec, Global Constraints and Review Focus.
- [ ] **Step 4: Commit** `docs: pantry recipes in AGENTS, FEATURES and research README`.
