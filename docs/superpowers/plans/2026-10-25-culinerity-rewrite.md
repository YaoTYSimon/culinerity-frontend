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

### Task 12: Live-prices backend (stubbed, no paid calls)

**Files:**
- Create: `server/index.ts`, `server/priceRoute.ts`, `server/scraperClient.ts`, `src/sources/http/HttpPriceSource.ts`
- Modify: `package.json` (scripts `server`, `dev:all`; deps `hono`, `@hono/node-server`, `tsx`), `vite.config.ts` (proxy `/api` to the server in dev), `src/services/container.ts`
- Test: `server/priceRoute.test.ts`, `src/sources/http/HttpPriceSource.test.ts`

**Interfaces:**
- Produces: `GET /api/prices/:itemId` returning `PricePoint[]` JSON; `interface ScraperClient { fetchPrices(itemId: string): Promise<PricePoint[]> }` with `MockScraperClient` (default) and `ApifyScraperClient` (reads `APIFY_TOKEN` from the environment, disabled when unset); `class HttpPriceSource implements PriceSource` (calls `/api/prices/:itemId`, resolves `[]` on any network or non-200 failure).
- Consumes: `PricePoint`, `PriceSource` (Task 2).
- Rule: the app uses `HttpPriceSource` only when `VITE_USE_LIVE_PRICES=true`; otherwise the mock source stays. The API token never reaches the browser. Live prices keep `isSample: false` and show their source and observed date. **Do not call any paid scraper or send any token anywhere while building or testing; tests use `MockScraperClient` and injected fetch stubs. A real Apify run needs the user's explicit go-ahead and their own token.** Before enabling it, check the chosen actor's terms of use.

- [ ] **Step 1: Tests:** `priceRoute` returns 200 and the client's prices for a known id; returns `[]` (200) for an unknown id; returns 502 with `{error}` and no stack trace when the client throws; `HttpPriceSource` returns `[]` on a rejected fetch, on 500, and on malformed JSON; returns the parsed `PricePoint[]` on 200.
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement the server, clients and `HttpPriceSource`; wire the container flag. **Step 4:** `npm test` passes, `npm run build` passes, and with the flag off the app still uses mocks. **Step 5:** Commit `feat: live-prices backend (stubbed)`.
