# Culinerity Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Culinerity as a Melbourne-wide app that scores food insecurity (0–100, 100 best), ranks cheaper/healthier craving swaps by that score and the user's budget, and shows labelled sample supermarket prices.

**Architecture:** Pure domain logic (scoring, swap matching, swap ranking) has no UI or I/O imports. External data sits behind three interfaces (`PriceSource`, `NutritionSource`, `FoodSupportSource`) with mock implementations, wired in one container and handed to React through context. Persistence is behind a `ProfileStore` interface with a localStorage implementation.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind v4 (existing), Vitest + Testing Library (added).

**Spec:** `docs/superpowers/specs/2026-10-25-culinerity-rewrite-design.md`

## Global Constraints

- Score runs 0–100 where **100 = no food insecurity, 0 = critical**; the UI must always say which end is good.
- Questionnaire is based on FIES (8 yes/no) plus the existing six extra domains; optional; skipping = score 50 (cost and health weighted equally).
- No accounts, no network calls for user data; answers and finances stay in localStorage.
- Every external source ships first as a mock, labelled "sample data" in the UI; each price shows source and date.
- SOLID/DRY: UI and ranking depend on interfaces only; one definition each of cost (per serve, AUD) and health score.
- Finance inputs: weekly food budget (AUD, required to personalise), weekly income (AUD, optional). Location: optional suburb/postcode, on-device.
- Low scores show food-support options plus a "not medical advice" note.
- English only; phone-first, plain language; no offline/PWA work.
- Work on branch `rewrite/focused`; preserve the current uncommitted work first.

## Review Focus

- Empty or whitespace craving text → show the picklist, no crash, no results list.
- Craving matches nothing → category-level fallback with a visible "no exact match" message.
- Weekly food budget 0, negative or blank → treated as "not provided"; ranking falls back to score-only.
- Partially answered questionnaire → no score is saved; the user sees what is missing.
- All-yes and all-no FIES answers → exactly 0 and 100 at the extremes.
- A swap with no price from any source → shown as "price unavailable", never as $0.
- localStorage missing, full or holding corrupt JSON → app still loads with defaults.

---

### Task 1: Branch, preserve old work, test tooling, clear the old app

**Files:**
- Modify: `package.json`, `vite.config.ts` (add `test` block), `src/main.tsx`, `src/App.tsx`
- Delete: `src/views/*`, `src/components/*`, `src/lib/*`, `src/types/index.ts` (old code; see Task 2+ for replacements)
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `npm test` runs Vitest (jsdom, globals on); an `App` component rendering a placeholder.

- [ ] **Step 1:** Run `git switch -c backup/pre-rewrite && git add -A src && git commit -m "chore: snapshot pre-rewrite work"` (commit only `src`; leave `Archive.zip`, `dist`, `.DS_Store` untracked), then `git switch -c rewrite/focused`.
- [ ] **Step 2:** `npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`; add script `"test": "vitest run"`; configure Vitest with `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, `globals: true`; setup imports `@testing-library/jest-dom/vitest`.
- [ ] **Step 3:** Delete the old folders listed above; make `App` return `<main>Culinerity</main>`.
- [ ] **Step 4:** Write `src/App.test.tsx` asserting `render(<App />)` shows text "Culinerity". Run `npm test`. Expected: 1 passed. Run `npm run build`. Expected: succeeds.
- [ ] **Step 5:** Commit `chore: reset app, add vitest`.

### Task 2: Domain types and source interfaces

**Files:**
- Create: `src/domain/types.ts`, `src/sources/interfaces.ts`

**Interfaces:**
- Produces in `types.ts`:
  - `type Aud = number`
  - `interface Profile { foodBudgetWeekly?: Aud; incomeWeekly?: Aud; suburb?: string; score?: number; scoreTakenAt?: string }`
  - `interface PricePoint { itemId: string; store: 'Coles'|'Woolworths'|'Aldi'|'IGA'|'Market'; pricePerServe: Aud; unitLabel: string; observedAt: string; isSample: boolean }`
  - `interface Nutrition { itemId: string; energyKj: number; proteinG: number; fibreG: number; sugarG: number; sodiumMg: number }`
  - `interface FoodItem { id: string; name: string; category: string; keywords: string[] }`
  - `interface SwapCandidate { craving: FoodItem; alternative: FoodItem; note: string }`
  - `interface SupportPlace { id: string; name: string; kind: 'pantry'|'community-fridge'|'meal'; suburb: string; notes: string; isSample: boolean }`
- Produces in `interfaces.ts`:
  - `interface PriceSource { getPrices(itemId: string): Promise<PricePoint[]> }`
  - `interface NutritionSource { getNutrition(itemId: string): Promise<Nutrition | null> }`
  - `interface FoodSupportSource { findSupport(suburb?: string): Promise<SupportPlace[]> }`
  - `interface FoodCatalogue { findCravings(text: string): FoodItem[]; swapsFor(cravingId: string): SwapCandidate[]; popularCravings(): FoodItem[] }`

- [ ] **Step 1:** Create both files exactly as above (types only). `npx tsc --noEmit` passes.
- [ ] **Step 2:** Commit `feat: domain types and source interfaces`.

### Task 3: Food-security score

**Files:**
- Create: `src/domain/scoring/questionnaire.ts`, `src/domain/scoring/score.ts`
- Test: `src/domain/scoring/score.test.ts`

**Interfaces:**
- Produces: `FIES_QUESTIONS: readonly string[]` (8 plain-language yes/no items); `DOMAINS: Record<DomainId, readonly string[]>` for the six domains B–G (≥2 items each, answered 0–4); `interface Answers { fies: (boolean|null)[]; domains: Record<DomainId, (number|null)[]> }`; `computeScore(a: Answers): number | null` (null when anything is unanswered); `scoreBand(score: number): 'Critical'|'Struggling'|'Strained'|'Steady'|'Secure'`.
- Consumes: weights `{A:0.30,B:0.25,C:0.12,D:0.08,E:0.09,F:0.09,G:0.07}`, carried over from the old `CLH_WEIGHTS`. Load = weighted severity (0–100, higher worse); `computeScore` returns `round(100 - load)`.

- [ ] **Step 1: Tests** in `score.test.ts`: all FIES `true` plus all domain answers 4 → `0`; all `false` plus all 0 → `100`; one `null` anywhere → `null`; `scoreBand` boundaries: 0–19 Critical, 20–39 Struggling, 40–59 Strained, 60–79 Steady, 80–100 Secure; score is monotonic (flipping one FIES answer to true never raises the score).
- [ ] **Step 2:** `npm test -- score` → FAIL (module missing).
- [ ] **Step 3:** Implement the two files. Add a header comment citing FAO FIES and naming the source of each added domain (the builder fills these in from the old `headspace.ts` comments and its own research; mark any unsourced domain "unvalidated").
- [ ] **Step 4:** `npm test -- score` → PASS. Commit `feat: food-security score`.

### Task 4: Mock sources and catalogue

**Files:**
- Create: `src/sources/mock/mockPriceSource.ts`, `mockNutritionSource.ts`, `mockFoodSupportSource.ts`, `mockCatalogue.ts`, `data.ts`
- Test: `src/sources/mock/mock.test.ts`

**Interfaces:**
- Consumes: Task 2 interfaces.
- Produces: classes `MockPriceSource implements PriceSource`, `MockNutritionSource implements NutritionSource`, `MockFoodSupportSource implements FoodSupportSource`, `MockCatalogue implements FoodCatalogue`. Every price/support record has `isSample: true`.

Mock data: at least 10 common cravings (e.g. burger, hot chips, bubble tea, instant noodles, pizza, chocolate, fried chicken, kebab, pastry, soft drink), each with ≥2 swaps; ≥2 prices per item from different stores (Coles/Woolworths among them, with `observedAt` dates); nutrition for every item; ≥3 support places, one being the Monash Caulfield pantry (note: limited, registration required).

- [ ] **Step 1: Tests:** `findCravings('burger')` is non-empty; `findCravings('  ')` is `[]`; `findCravings('zzzz')` is `[]`; every catalogue swap id has nutrition and at least one price; every price has `isSample === true`; `MockPriceSource.getPrices('unknown')` resolves to `[]`; `findSupport('Caulfield')` returns the Monash pantry first.
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement (keyword matching: case-insensitive substring on name and keywords). **Step 4:** PASS. **Step 5:** Commit `feat: mock data sources`.

### Task 5: Swap ranking

**Files:**
- Create: `src/domain/swaps/rank.ts`, `src/domain/swaps/health.ts`
- Test: `src/domain/swaps/rank.test.ts`

**Interfaces:**
- Produces: `healthScore(n: Nutrition): number` (0–100, higher is healthier; single definition; rewards protein and fibre, penalises sugar, sodium and energy density); `interface RankedSwap { candidate: SwapCandidate; price: PricePoint | null; cost: Aud | null; health: number; withinBudget: boolean | null }`; `rankSwaps(input: { candidates: SwapCandidate[]; prices: Record<string, PricePoint[]>; nutrition: Record<string, Nutrition>; score: number | null; budgetPerServe: Aud | null }): RankedSwap[]`.
- Rule: `w = (score ?? 50)/100`; each swap's value = `(1 - w) * cheapness + w * health` where `cheapness` is 0–100 and cheaper than the craving's own price scores higher; `cost` is the lowest available price per serve; `withinBudget = cost <= budgetPerServe`, or `null` when either is unknown; swaps with no price sort after priced ones and have `cost: null`.

- [ ] **Step 1: Tests:** with the same candidates, `score: 10` puts the cheapest swap first and `score: 90` puts the healthiest first; `score: null` equals `score: 50`; `budgetPerServe: null` gives `withinBudget: null` for all; a swap with no prices has `cost: null` and ranks after priced swaps; over-budget swaps are flagged `false` but still returned; `rankSwaps` with `[]` returns `[]`; `healthScore` stays in [0,100] and a high-sugar item scores below a high-fibre item.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5:** Commit `feat: score-aware swap ranking`.

### Task 6: Profile store

**Files:**
- Create: `src/storage/profileStore.ts`
- Test: `src/storage/profileStore.test.ts`

**Interfaces:**
- Produces: `interface ProfileStore { load(): Profile; save(p: Profile): void; clear(): void }`; `class LocalProfileStore implements ProfileStore` (key `culinerity.profile.v1`); `budgetPerServe(p: Profile): Aud | null` = `foodBudgetWeekly / 21` when positive, else `null`.

- [ ] **Step 1: Tests:** save then load round-trips; load with corrupt JSON returns `{}`; load when `localStorage.getItem` throws returns `{}`; save when `setItem` throws does not throw; `budgetPerServe({foodBudgetWeekly: 42})` is `2`; for `0`, `-5` and `undefined` it is `null`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5:** Commit `feat: profile store`.

### Task 7: Services container and swap service

**Files:**
- Create: `src/services/container.ts`, `src/services/swapService.ts`, `src/services/ServicesContext.tsx`
- Test: `src/services/swapService.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 4, 5, 6.
- Produces: `interface Services { catalogue: FoodCatalogue; prices: PriceSource; nutrition: NutritionSource; support: FoodSupportSource; profiles: ProfileStore }`; `createServices(): Services` (the only place concrete classes are named; returns mocks); `swapService(s: Services)` exposing `getSwaps(cravingId: string, profile: Profile): Promise<RankedSwap[]>`; `ServicesProvider`, `useServices(): Services`.

- [ ] **Step 1: Tests** using the mocks: `getSwaps` for a known craving returns a non-empty list ordered cheapest-first for `{score: 10}` and healthiest-first for `{score: 90}`; unknown craving id resolves to `[]`; a rejecting `PriceSource` (inject a stub) yields swaps with `cost: null` and does not throw.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5:** Commit `feat: services and swap service`.

### Task 8: Questionnaire and finances UI

**Files:**
- Create: `src/ui/Questionnaire.tsx`, `src/ui/FinanceForm.tsx`
- Test: `src/ui/Questionnaire.test.tsx`, `src/ui/FinanceForm.test.tsx`

**Interfaces:**
- Produces: `<Questionnaire onComplete={(score:number)=>void} onSkip={()=>void} />` (one screen per section, a "Skip for now" action, visible note "100 = secure, 0 = critical", never saves a score until every question is answered, and says which are missing); `<FinanceForm value={Profile} onChange={(p:Profile)=>void} />` (weekly food budget, optional weekly income, optional suburb; blank input yields `undefined`, never `NaN`).

- [ ] **Step 1: Tests:** answering everything "No" calls `onComplete(100)`; submitting with a question unanswered does not call `onComplete` and shows a message naming the gap; Skip calls `onSkip`; typing `abc` or `-3` in budget calls `onChange` with `foodBudgetWeekly: undefined`.
- [ ] **Step 2:** FAIL. **Step 3:** implement with Tailwind, large tap targets, plain language. **Step 4:** PASS. **Step 5:** Commit `feat: questionnaire and finance forms`.

### Task 9: Swap search and results UI

**Files:**
- Create: `src/ui/CravingSearch.tsx`, `src/ui/SwapResults.tsx`
- Test: `src/ui/swaps.test.tsx`

**Interfaces:**
- Consumes: `useServices`, `swapService`, `Profile`.
- Produces: `<CravingSearch profile={Profile} />`: text box plus picklist of `popularCravings()`; results rendered by `<SwapResults swaps={RankedSwap[]} />` showing for each swap its name, price per serve with store, "Sample data" badge, observed date, a health indicator, and a within-budget marker when known; a "Price unavailable" line when `cost` is `null`; a "no exact match" message with category suggestions when the text matches nothing; and an empty/whitespace input shows only the picklist.

- [ ] **Step 1: Tests** (render inside `ServicesProvider` with mocks): typing "burger" and submitting shows ≥1 swap with a "Sample data" badge; whitespace input shows the picklist and no results; "zzzz" shows the no-match message; a swap with `cost: null` renders "Price unavailable" and never "$0".
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5:** Commit `feat: swap search and results`.

### Task 10: Food support and app shell

**Files:**
- Create: `src/ui/SupportPanel.tsx`, `src/ui/Landing.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `<SupportPanel suburb?={string} />` listing `findSupport` results with a "Sample data" badge and the line "Culinerity is not medical advice."; `App` flow: Landing (neutral, for anyone in Melbourne; one gentle prompt to take the optional questionnaire) → home with CravingSearch, FinanceForm, a score summary showing its band and "100 = secure", and the SupportPanel shown whenever the saved score is below 40 (also reachable from a menu for everyone). Score and finances persist through `ProfileStore`.

- [ ] **Step 1: Tests:** first launch with empty storage shows the swap search and an optional questionnaire prompt, with no blocking step; completing the questionnaire with the worst answers saves score 0 and shows the support panel and the disclaimer; with a saved score of 80 the panel is hidden from the home view; reloading restores the saved score and budget; corrupt stored JSON still renders the first-launch state.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5:** Commit `feat: app shell, landing and support`.

### Task 11: Verify in the running app and tidy

**Files:**
- Modify: `AGENTS.md`/`README` (short architecture note), remove any unused dependency (e.g. `recharts` if unused)

- [ ] **Step 1:** `npm test` (all pass), `npm run build` (succeeds), `npx tsc --noEmit` (clean).
- [ ] **Step 2:** With the dev server on `http://localhost:8443/`, use the Playwright MCP to walk three paths and screenshot each: (a) skip the questionnaire and search "burger"; (b) take the questionnaire with worst answers, check the low-score ordering and the support panel; (c) enter a budget of 0 and confirm swaps still appear with no budget markers. Check the console for errors at a phone width of 390px.
- [ ] **Step 3:** Fix anything found, re-run Step 1, commit `chore: verify and tidy`.

### Task 12: Backend with a database (Hono + SQLite)

The user requires a real backend with a database. It holds **reference data only** (catalogue, swaps, prices, nutrition, support places); questionnaire answers and finances stay on the user's device, per the spec. User accounts/sync are out of scope until the user asks.

**Files:**
- Create: `server/index.ts`, `server/db.ts` (opens SQLite, runs `schema.sql`), `server/schema.sql`, `server/seed.ts` (loads `src/sources/mock/data.ts` into the DB), `server/repositories.ts`, `server/routes.ts`, `server/ingest.ts`, `server/scraperClient.ts`, `src/sources/http/HttpCatalogue.ts`, `HttpPriceSource.ts`, `HttpNutritionSource.ts`, `HttpFoodSupportSource.ts`
- Modify: `package.json` (scripts `server`, `seed`, `dev:all`; deps `hono`, `@hono/node-server`, `better-sqlite3`, `tsx`), `vite.config.ts` (proxy `/api` to the server in dev), `src/services/container.ts`, `.gitignore` (`server/data/`)
- Test: `server/repositories.test.ts`, `server/routes.test.ts`, `server/ingest.test.ts`, `src/sources/http/http.test.ts`

**Interfaces:**
- Produces:
  - Repository interfaces in `server/repositories.ts` (`CatalogueRepository`, `PriceRepository`, `NutritionRepository`, `SupportRepository`) with SQLite implementations; routes depend only on the interfaces.
  - Tables: `items(id, name, category)`, `keywords(item_id, keyword)`, `swaps(craving_id, alternative_id, note)`, `prices(item_id, store, price_per_serve, unit_label, observed_at, is_sample)`, `nutrition(item_id, energy_kj, protein_g, fibre_g, sugar_g, sodium_mg)`, `support_places(id, name, kind, suburb, notes, is_sample)`.
  - Routes: `GET /api/cravings?q=`, `GET /api/cravings/popular`, `GET /api/swaps/:cravingId`, `GET /api/prices/:itemId`, `GET /api/nutrition/:itemId`, `GET /api/support?suburb=`; JSON shapes equal the Task 2 types.
  - `interface ScraperClient { fetchPrices(itemId: string): Promise<PricePoint[]> }` with `MockScraperClient` (default) and `ApifyScraperClient` (reads `APIFY_TOKEN`; disabled when unset); `ingest(client, repo, itemIds)` upserts prices with `is_sample=false` for live data.
  - `Http*` classes implement the Task 2 interfaces (`FoodCatalogue` is synchronous today: make the plan-consistent change by adding async variants or an `HttpCatalogue` that preloads popular cravings and swaps at start-up; the builder decides and records it). Each resolves the interface's empty value on any network error, non-200 status or malformed JSON.
- Consumes: Task 2 types/interfaces, Task 4 `data.ts` (seed source).
- Rules: parameterised SQL only (no string-built queries); API errors return `{error}` with no stack trace; `APIFY_TOKEN` never reaches the browser or the repo; the app uses the HTTP sources only when `VITE_USE_BACKEND=true`, otherwise the mocks stay. **No paid scraper call and no token use while building or testing: tests use an in-memory SQLite DB, `MockScraperClient` and injected fetch stubs. A real Apify run needs the user's explicit go-ahead and their own token; check the actor's terms first.**

- [ ] **Step 1: Tests:** repositories against an in-memory DB seeded from `data.ts`: popular cravings count is 10, each has >=2 swaps, every swap item has prices and nutrition; `q='  '` returns `[]`; SQL-injection-style input (`"'; DROP TABLE items;--"`) returns `[]` and leaves tables intact; routes return 200 with the Task 2 shapes, `[]`/200 for unknown ids, 400 for a missing `q` parameter type, and `{error}` with no stack on a repository throw; `ingest` with `MockScraperClient` upserts without duplicating rows and marks live rows `is_sample=false`; an `ApifyScraperClient` without a token rejects with a clear message and makes no network call; `Http*` classes return empty values on rejected fetch, 500 and malformed JSON and the parsed data on 200.
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement. **Step 4:** `npm test` and `npm run build` pass; start `npm run dev:all`, `curl localhost:<port>/api/cravings/popular` returns 10 items; with `VITE_USE_BACKEND` off the app still uses mocks. **Step 5:** Commit `feat: backend with SQLite`.

### Task 13: Design polish (Linear-style, engaging)

Runs after Task 11a lands. The user said the app looks amateur and asked for an engaging, Linear-like feel. Done by a design-minded implementer with the user's taste skill if it is installed (read it first), otherwise the design critique below.

**Files:** `src/index.css` (tokens), `src/App.tsx`, `src/ui/*` (restyle only; no behaviour or prop changes), plus tests only where markup the tests rely on changes.

**Direction (Linear-like):** one confident, restrained palette (warm neutral surfaces, pomegranate as the single accent, the amber highlight used sparingly for the one primary action); tight type scale with one display font for the hero only and the sans for everything else; 4/8px spacing rhythm; 1px hairline borders and soft layered shadows instead of heavy outlines; consistent 12px card radius; crisp 120–180ms transitions (`motion-safe:`) on hover/press/focus; keyboard-first (visible focus rings, `/` focuses the craving search, Enter submits); skeleton rows while swaps load; results as a clean list with price as the visual anchor and a "saves $X vs your craving" chip; empty and error states with friendly copy. Keep phone-first at 390px and scale up (two-column layout from `md:` with the search and results on the left, check-in and budget on the right).

**Critique findings to fix (from the live 390px screens):**
1. Hero is heavy: a large dark gradient block dominates before the user reaches the core action (the craving search). Make search the hero; shrink the check-in prompt to a slim dismissible banner.
2. Header nav buttons are full-width bordered pills that look like form buttons; use a compact segmented/tab bar with an underline or filled active state.
3. Result cards bury the value: price is small and mono, the "saves" comparison is missing, and badges ("Sample data", "Healthier") have equal weight. Make price the anchor, add saving vs the craving, and quiet the sample-data badge into a single note per list.
4. Budget form sits below results as three tall empty inputs; collapse into a compact "Your week" card with a single budget field first and the optional fields behind a disclosure.
5. Duplicate "What are you craving?" heading and label.
6. Popular cravings wrap ragged; use a horizontal scroll row or a tidy grid with icons/emoji-free glyphs.
7. No score presence until the check-in is taken; show a small, friendly score chip in the header once available.

## Mobile direction (user decision, replaces Task 13 above)

The user asked for a mobile app instead of web. **Task 13 (web design polish) is replaced by Tasks 14–16.** Tasks 1–11 stand: they produce the shared logic and the web reference. See the design spec's "Update 2026-10-25: native mobile app".

### Task 14: Shared core package
Move `src/domain`, `src/sources` (interfaces + mocks), `src/services/swapService.ts`, `src/storage` (interface + pure helpers) into `packages/core` (npm workspace, TypeScript, Vitest), with `ProfileStore` implementations injected (no `localStorage` in core). Web app imports from the package; all existing tests still pass. Commit `refactor: extract core package`.

### Task 15: Expo app scaffold and storage
Create `apps/mobile` (Expo, TypeScript, expo-router, NativeWind). `AsyncProfileStore implements ProfileStore` (never throws; corrupt data returns `{}`), `createServices()` for mobile, theme tokens ported from `src/index.css`. Tests with `jest-expo` for the store and one smoke render. Run `npx expo export` to confirm it bundles. Commit `feat: expo app scaffold`.

### Task 16: Native screens
Bottom tabs (Swaps, Support, Check-in), Linear-style design per the spec (hairline cards, price as anchor, "saves $X" chip, skeleton loading, haptics on swap tap and check-in finish, safe areas, 44pt targets, dark mode, accessibility labels). Port Questionnaire, FinanceForm, CravingSearch/SwapResults, SupportPanel, ScoreSummary behaviour with the same tests (React Native Testing Library). Verify on the iOS Simulator or Expo web export with screenshots at iPhone sizes. Commit per screen.

Task 12 (backend) is unchanged and runs before or after Task 16 at the controller's choice; the mobile app consumes it through HTTP sources behind a config flag.
