# Nearby Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private, no-map "Nearby" view that lists verified cheap and healthy food places ranked by straight-line distance, price and fresh-produce fit, from a device position or a typed Melbourne suburb or postcode.

**Architecture:** Platform-free logic and types in `packages/core/src/places/` (haversine, formatting, ranking, centroid lookup, `Place`, `PlaceSource`, `LocationProvider` type). Places and centroids are generated from committed research JSON by scripts, like the benchmarks. The web layer adds a browser `LocationProvider`, a `Nearby` view, a `View = 'nearby'` entry in the Menu and App. No network call, storage write or share text ever carries a position.

**Tech Stack:** React 19, Vite, Tailwind v4, TypeScript, Vitest + Testing Library, Playwright MCP for screenshots.

**Spec:** `docs/superpowers/specs/2026-10-26-nearby-options-design.md` (read it whole, including "Builder-check rulings"; rulings win over the earlier sections). Design system: `docs/superpowers/specs/2026-10-26-welcome-themes-plate-redesign-design.md`; taste skill `~/.agents/skills/design-taste-frontend`. Patterns to copy: `scripts/build-benchmarks.mjs` + `docs/superpowers/research/README.md`, `src/ui/SupportPanel.tsx`, `packages/core/src/sources/mock/mockFoodSupportSource.ts`, `src/ui/views.ts`, `src/ui/Menu.tsx`.

## Global Constraints

- **Privacy (hard):** location is requested only after "Use my location" is pressed; held only in React state; rounded to 3 decimals on arrival; never stored (`localStorage`, `sessionStorage`, IndexedDB, cookies), never sent to our server or any third party, never in share text, never logged. Typed suburb text is never stored (a profile's own `suburb` may prefill the field; Nearby never writes it). No map tiles. "Open in Maps" is a user-initiated link to the place's name and address with `rel="noopener noreferrer"`, never the user's position. One sentence on the view: "Your location stays on this device. It is not saved or sent anywhere."
- **No invented places, addresses, hours or prices.** Every place has `sourceId` (https URL, licence text), `verification` and a real `checked` date; a place that cannot be verified from the operator's or council's own page, or from the City of Casey dataset, is left out. Hours are the source's own words or absent ("Hours not listed"); no "open now". Prices are bands (`free`, `budget`, `mid`, `pricier`) by kind, never dollars. No health claims beyond "fresh produce available". Starter-set label and generated coverage statement are always shown.
- **Not used:** OpenStreetMap (ODbL share-alike), Foodbank locator data (link only), VFMA list (facts entered one by one), bulk copying of any directory.
- **Plate design system:** Schibsted Grotesk, fully round shapes, flat colour, no cards/chips/hairlines/shadows/gradients, themes via tokens, AA contrast, `focus-visible`, `motion-safe`, 44px targets, one `h1` per screen with focus moved to it on view change, live regions for status, no horizontal scroll 320-1280px, phone-first, centred 520px column. Photo: existing `nearby-market` (already in `src/assets/photos/credits.ts`).
- **Tone:** kind, plain, no pressure; never "failed"; copy exactly as the spec rulings give it where quoted.
- **Core stays platform-free** (`packages/core/src/platformFree.test.ts`); geolocation lives in `src/location/`.
- Existing tests keep their intent. Every task ends green: `npm test`, `npx tsc --noEmit` (root, packages/core, server), `npm run build`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01CVJsJBKSnSRKS1F3CWccnQ`. Stage by explicit path. Never push or merge. Sonnet only.

## Review Focus

- Position exactly on a place, two places at the same distance and same attributes, and `NaN`/missing coordinates: `distance 0` formats "under 100 m", ties resolve by name then id, a bad coordinate fails closed (no crash, no NaN row). (Task 2)
- Typed input like `"  FOOTSCRAY, VIC "`, `"3011"`, `"Footscray 3011"`, `"fitzroy"` (several prefix hits), `"Melborne"`, emoji or an empty string: normalised or a calm no-match, never a throw. (Task 3)
- Permission denied then a later grant, a second press while "Finding you…", Cancel followed by a late result, and a provider that throws: no stale or duplicate state, no unhandled rejection. (Task 4)
- A device far outside Melbourne (e.g. Sydney) and an empty or all-filtered list: honest "covers Melbourne for now" and "Nothing matches", not a blank screen or 600 km rows presented as nearby. (Task 4)
- Score `undefined`, `0`, `39`, `40`, `59`, `60`, `100` map to the right nudge and sentence; signed-out guest and signed-in profile behave the same. (Tasks 2, 4)
- Keyboard-only and screen-reader use of the filter group and result count; 320px width with long place names. (Tasks 4, 5)

---

## File Structure

- `docs/superpowers/research/2026-10-27-nearby-places.json` — place dataset (Task 1)
- `docs/superpowers/research/2026-10-27-melbourne-centroids.json` — suburb and postcode centroids (Task 3)
- `scripts/build-places.mjs` (+ `.d.mts`, `.test.ts`), `scripts/build-centroids.mjs` (+ test) — validators and generators
- `packages/core/src/places/{types.ts,source.ts,distance.ts,rank.ts,centroid.ts,generated/places.generated.ts,generated/centroids.generated.ts}` plus tests; `packages/core/src/sources/mock/mockPlaceSource.ts`
- `src/location/BrowserLocationProvider.ts`, `src/location/LocationContext.tsx`
- `src/ui/Nearby.tsx`, `src/ui/NearbyFilters.tsx`, `src/ui/NearbyPlaceRow.tsx` plus tests
- Modify: `packages/core/src/index.ts`, `packages/core/src/services/container.ts`, `src/ui/views.ts`, `src/ui/Menu.tsx`, `src/App.tsx`, `docs/FEATURES.md`, `docs/superpowers/research/README.md`, `package.json`

---

### Task 1: Place dataset, generator and PlaceSource

**Files:**
- Create: `docs/superpowers/research/2026-10-27-nearby-places.json`, `scripts/build-places.mjs`, `scripts/build-places.d.mts`, `scripts/build-places.test.ts`, `packages/core/src/places/types.ts`, `packages/core/src/places/source.ts`, `packages/core/src/places/generated/places.generated.ts`, `packages/core/src/sources/mock/mockPlaceSource.ts`, `packages/core/src/places/places.test.ts`
- Modify: `package.json` (script `"build:places": "node scripts/build-places.mjs"`), `packages/core/src/index.ts`, `packages/core/src/services/container.ts`, `docs/superpowers/research/README.md` (Places rules), `packages/core/src/platformFree.test.ts` (exclude `places/generated` like benchmarks)

**Interfaces:**
- Produces (`types.ts`): 
  `type PlaceKind = 'market'|'grocer'|'social-supermarket'|'community-meal'|'food-relief'|'co-op'`; `type PriceBand = 'free'|'budget'|'mid'|'pricier'`; `type PlaceFit = 'fresh'|'packaged'|'meals'`; `type PlaceAccess = 'open'|'referral'|'membership'`;
  `interface PlaceSourceRecord { id; publisher; title; url; licence; accessed }`;
  `interface Place { id; name; kind: PlaceKind; lat: number; lng: number; address; suburb; priceBand: PriceBand; fit: PlaceFit[]; access: PlaceAccess; hours?: string; sourceId: string; verification: 'primary'|'secondary'; checked: string }`;
  `interface PlaceData { generatedAt: string; sources: PlaceSourceRecord[]; places: Place[]; notFound: string[] }`.
- Produces (`source.ts`): `interface PlaceSource { list(): Promise<Place[]> }`; `class StaticPlaceSource implements PlaceSource` (returns copies of generated places); `function placeSourceFor(id: string, data?: PlaceData): PlaceSourceRecord | undefined`; `function coverage(places: Place[]): { count: number; suburbs: string[] }` (sorted unique, used for the generated coverage statement); `placeData: PlaceData` re-exported.
- Produces: `MockPlaceSource` (three obviously fake places, "Test Market" etc.), used only in tests. `Services` gains `places: PlaceSource`; `createCoreServices` uses `StaticPlaceSource`.
- Produces (`build-places.mjs`): `validatePlaces(d): string[]`, `buildPlaces(d): string` (TypeScript source), same export style as `build-benchmarks.mjs`.

- [ ] **Step 1: Research and enter the starter set.** For each candidate place read the operator's or council's own page (or the City of Casey "Emergency Food Relief Groups" record after re-reading its licence on the publisher's metadata page; portal says CC BY 3, data.gov.au mirror says unspecified; record both). Candidates to check, not to assume: Boroondara Farmers Market (Patterson Reserve, 484 Auburn Road, Hawthorn; 3rd and 5th Saturday; already read 2026-10-27), Queen Victoria Market (address from its visitor page), Footscray, Preston, Dandenong and Prahran markets, Casey relief and meal providers with stated hours, social supermarkets. Enter only what a page states: name, address, schedule words, kind. Coordinates come from the source's geodata or from the official address on the ABS/council map and must be within about 100 m; record in the source `title` how they were obtained. Anything unverified goes to `notFound` as plain text. Aim for honesty, not a count.
- [ ] **Step 2: Write failing tests** in `scripts/build-places.test.ts`: `validatePlaces` returns an error for each of: duplicate place id; unknown `sourceId`; non-https source url; missing licence; `checked` in the future or not `YYYY-MM-DD`; lat/lng outside Greater Melbourne (-38.6..-37.4, 144.3..145.8); bad kind/priceBand/fit/access; empty address; `hours` present with empty string; and `[]` for the committed dataset. Another test regenerates `buildPlaces(committed JSON)` and equals the committed generated file (drift). In `places.test.ts`: `StaticPlaceSource.list()` returns every generated place and a mutation of the result does not change the next call; `coverage` returns sorted unique suburbs; every committed place has `kind` consistent with the price-band defaults (`free` for food-relief/community-meal, `budget` for social-supermarket/co-op, `mid` for market/grocer unless a source note overrides, `pricier` only for accredited farmers' markets).
- [ ] **Step 3: Run** `npx vitest run scripts/build-places.test.ts packages/core/src/places` — expect FAIL (missing modules).
- [ ] **Step 4: Implement** the types, generator (copy the structure of `build-benchmarks.mjs`, generated file header "generated, do not edit"), `StaticPlaceSource`, `MockPlaceSource`, container wiring and exports. Add Places rules to the research README (sources, checked date, no hours without a source, refresh with `npm run build:places`).
- [ ] **Step 5: Run** `npm run build:places && npm test && npx tsc --noEmit && (cd packages/core && npx tsc --noEmit) && npm run build` — expect all green and no diff after a second `build:places`.
- [ ] **Step 6: Commit** `feat: nearby places dataset, generator and PlaceSource` (explicit paths).

### Task 2: Core logic — distance, formatting, ranking

**Files:**
- Create: `packages/core/src/places/distance.ts`, `packages/core/src/places/rank.ts`, `packages/core/src/places/distance.test.ts`, `packages/core/src/places/rank.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Place`, `PriceBand` (Task 1); `rankNudge(score: number): 'cheapest'|'balanced'|'healthiest'` from `domain/bands.ts`.
- Produces: `interface LatLng { lat: number; lng: number }`; `haversineMetres(a: LatLng, b: LatLng): number` (R = 6,371,008.8 m; `NaN` if any input is not finite); `formatDistance(m: number): string`; `type PlaceFilter = 'all'|'fresh'|'free'|'low-cost'`; `interface RankedPlace { place: Place; metres: number }`; `rankPlaces(places: Place[], origin: LatLng, score: number | undefined, filter: PlaceFilter): RankedPlace[]` (filtered, ordered, not truncated, input not mutated, places with non-finite distance dropped); `rankSentence(score: number | undefined): string`; `nudgeFor(score: number | undefined)` (undefined → `'balanced'`); `roundOrigin(p: LatLng): LatLng` (3 decimals); `PRICE_LABEL: Record<PriceBand,string>` ("Free", "Budget", "Mid", "Pricier").

- [ ] **Step 1: Failing tests.** `distance.test.ts`: Flinders Street Station (-37.8183, 144.9671) to Southern Cross Station (-37.8184, 144.9524) is between 1,250 and 1,350 m; symmetry; `haversineMetres(a, a) === 0`; `NaN` input returns `NaN`. `formatDistance`: `0 → "under 100 m"`, `99 → "under 100 m"`, `100 → "100 m"`, `349 → "350 m"`, `999 → "1 km"` (metres under 1,000 round to the nearest 50 first; a result of 1,000 switches to km), `1000 → "1 km"`, `1234 → "1.2 km"`, `9949 → "9.9 km"`, `10000 → "10 km"`, `12400 → "12 km"`, `NaN → "distance unknown"`, `-5 → "distance unknown"`. `roundOrigin({lat:-37.81234,lng:144.96321})` equals `{lat:-37.812,lng:144.963}`.
- [ ] **Step 2: Failing tests** in `rank.test.ts` with small hand-built `Place` fixtures: distance bands (<1 km, 1-2, 2-5, 5-10, >10) always dominate (a free place at 3 km never beats a pricier one at 800 m); per nudge the in-band order from the spec table (cheapest: price, fresh, distance; balanced: fresh, distance, price; healthiest: fresh, price, distance); tie-breaks exact distance, then `localeCompare('en-AU')` of name, then id; filters `fresh`, `free`, `low-cost` (free or budget) and `all`; filter applies before ranking; input array not mutated; same input twice gives identical output; scores `undefined, 0, 39, 40, 59, 60, 100` map to balanced, cheapest, cheapest, balanced, balanced, healthiest, healthiest and the matching `rankSentence` (cheapest "Sorted by distance, then cheapest first.", balanced "Sorted by distance, then fresh produce.", healthiest "Sorted by distance, then fresh produce and price.").
- [ ] **Step 3: Run** `npx vitest run packages/core/src/places` — expect FAIL.
- [ ] **Step 4: Implement** in `distance.ts` and `rank.ts` (sort with a comparator built from band index, then the nudge tuple, then distance, name, id). Export from the core index.
- [ ] **Step 5: Run** full gates as in Task 1 Step 5 — expect green, including `platformFree`.
- [ ] **Step 6: Commit** `feat: nearby distance, formatting and ranking` (explicit paths).

### Task 3: Suburb and postcode centroids

**Files:**
- Create: `docs/superpowers/research/2026-10-27-melbourne-centroids.json`, `scripts/build-centroids.mjs` (+ `.d.mts`, `.test.ts`), `packages/core/src/places/centroid.ts`, `packages/core/src/places/centroid.test.ts`, `packages/core/src/places/generated/centroids.generated.ts`
- Modify: `package.json` (`"build:centroids"`), `packages/core/src/index.ts`, `docs/superpowers/research/README.md`, `packages/core/src/platformFree.test.ts` (generated exclusion)

**Interfaces:**
- Consumes: `LatLng` (Task 2).
- Produces: `type CentroidResult = { kind: 'match'; lat: number; lng: number; label: string } | { kind: 'suggest'; options: string[] } | { kind: 'none' }`; `suburbCentroid(text: string, table?: CentroidTable): CentroidResult`; `normaliseName(text: string): string`; `CentroidTable = { suburbs: { name: string; lat: number; lng: number }[]; postcodes: { code: string; lat: number; lng: number; label: string }[]; source: { publisher; title; url; licence; accessed } }`.
- Produces (`build-centroids.mjs`): `validateCentroids(d): string[]`, `buildCentroids(d): string`.

- [ ] **Step 1: Obtain the data.** Download the ABS ASGS 2021 SAL and POA GDA2020 boundaries (confirm CC BY 4.0 on the ABS download page and record URL and date in the JSON `source`). In a scratch directory outside the repo, compute area centroids for Greater Melbourne suburbs and postcodes 3000-3207 and 3750-3999 that intersect it, round to 3 decimals, and write the JSON (about 30 KB). Never commit the boundary file. If the file or licence cannot be confirmed, fall back to the spec's curated ~150-suburb list with each coordinate read from an ABS or council page, and set `postcodes: []` (the view then says "Type a suburb").
- [ ] **Step 2: Failing tests.** `centroid.test.ts` with a tiny fixture table (Footscray, Fitzroy, Fitzroy North, Richmond, postcode 3011 → "Footscray"): `"Footscray"`, `"  FOOTSCRAY, VIC "`, `"footscray vic"`, `"Footscray 3011"` match; `"3011"` matches by postcode; `"fitzroy"` matches exactly Fitzroy (exact wins over prefix); `"fitz"` returns `suggest` with `["Fitzroy","Fitzroy North"]`; `"Melborne"`, `""`, `"   "`, `"🍕"`, `"99999"` return `none`; `"São"`-style diacritics normalise (`"Fîtzroy"` matches); results never throw. Validator tests: duplicate names, lat/lng outside the Melbourne box, postcode not 4 digits, missing source licence. Drift test as in Task 1. A sanity test on the committed table: contains Footscray, Carlton, Clayton; every row inside the box.
- [ ] **Step 3: Run** `npx vitest run scripts/build-centroids.test.ts packages/core/src/places/centroid.test.ts` — expect FAIL.
- [ ] **Step 4: Implement** `normaliseName` (NFD strip diacritics, lower case, drop punctuation, remove trailing "vic"/"victoria", collapse spaces) and `suburbCentroid` (4-digit → postcode; else exact, then unique prefix, else up to five suggestions, else none; "Name 3011" strips the postcode and tries the name then the postcode), the validator and generator.
- [ ] **Step 5: Run** the gates from Task 1 Step 5 — expect green.
- [ ] **Step 6: Commit** `feat: Melbourne suburb and postcode centroids` (explicit paths).

### Task 4: LocationProvider, Nearby view and Menu/App wiring

**Files:**
- Create: `packages/core/src/places/location.ts` (types only), `src/location/BrowserLocationProvider.ts`, `src/location/BrowserLocationProvider.test.ts`, `src/location/LocationContext.tsx`, `src/ui/Nearby.tsx`, `src/ui/NearbyFilters.tsx`, `src/ui/NearbyPlaceRow.tsx`, `src/ui/Nearby.test.tsx`, `src/ui/nearbyPrivacy.test.tsx`
- Modify: `src/ui/views.ts` (add `'nearby'` to `View`), `src/ui/Menu.tsx` (item `{ to: 'nearby', label: 'Nearby' }` after Food support), `src/App.tsx` (render `<Nearby score={profile.score} profileSuburb={profile.suburb} />` for `view === 'nearby'` inside the `!creating` branch), `src/ui/Menu.test.tsx`, `src/ui/views.test.ts`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `Place`, `PlaceSource`, `rankPlaces`, `formatDistance`, `roundOrigin`, `rankSentence`, `suburbCentroid`, `PRICE_LABEL`, `coverage`, `placeData` (Tasks 1-3); `useServices().places`.
- Produces (`location.ts`): `type LocationResult = { ok: true; lat: number; lng: number } | { ok: false; reason: 'denied'|'unavailable'|'timeout' }`; `interface LocationProvider { locate(): Promise<LocationResult> }`.
- Produces: `BrowserLocationProvider implements LocationProvider` (single `navigator.geolocation.getCurrentPosition(..., { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 })`; missing API or insecure context → `unavailable`; code 1 → denied, 2 → unavailable, 3 → timeout; never logs, never watches). `LocationProviderContext` + `useLocationProvider()` default to the browser adapter; `LocationProviderContext.Provider` is how tests inject fakes.
- Produces: `Nearby(props: { score?: number; profileSuburb?: string })`; `NearbyFilters(props: { value: PlaceFilter; onChange(v: PlaceFilter): void })` (fieldset + legend "Show", native radio inputs styled as pills: All, Fresh produce, Free, Low cost); `NearbyPlaceRow(props: { item: RankedPlace })` (name `h2`, kind, distance, price word, fit words, `access` note when not open, hours or "Hours not listed", "Open in Maps" link with `aria-label="Open <name> in Maps"`, "Last checked <date>").

- [ ] **Step 1: Failing tests (browser adapter).** With a stubbed `navigator.geolocation`: success returns rounded-free raw lat/lng; code 1 → `denied`, 2 → `unavailable`, 3 → `timeout`; absent API → `unavailable`; called with exactly the options above; `watchPosition` never called; nothing logged (spy on `console`).
- [ ] **Step 2: Failing tests (view)** in `Nearby.test.tsx` using a fake provider and `MockPlaceSource`: one `h1` "Close to you."; the privacy sentence is shown before any press and `locate` is not called on mount; pressing "Use my location" shows "Finding you…" with "Cancel"; success lists places in ranked order with distances formatted and the rank sentence for the given score; denied shows the spec copy and focuses the suburb field; unavailable and timeout show spec copy (timeout has "Try again"); `navigator.onLine === false` adds the offline sentence; Cancel then a late result is ignored; a second press while busy does nothing; a provider that rejects shows the unavailable copy; typing "Footscray" or "3011" ranks from the centroid and shows "from the middle of Footscray"; "fitz" shows "Did you mean" buttons; no match shows "We don't have that suburb yet. Try one nearby."; profile suburb prefills the field and is not written anywhere; filters change the list and the `aria-live` count ("2 places") without moving focus; a Sydney origin shows "Our starter list covers Melbourne for now." and closest five; nothing within 10 km shows "Nothing in our list within 10 km." plus the closest five; "Show more" after 12 rows; the coverage statement and "Where this comes from" disclosure render licence text; "Clear my location" empties the list.
- [ ] **Step 3: Failing tests (privacy)** in `nearbyPrivacy.test.tsx` per spec items 22-24: static scan of `src/ui/Nearby*.tsx`, `src/location/LocationContext.tsx`, `packages/core/src/places/**` (non-test) for `fetch|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|document.cookie`; full-flow run with spies on `fetch`, `XMLHttpRequest.prototype.open`, `navigator.sendBeacon` asserting zero calls; `localStorage` and `sessionStorage` serialised contain neither `-37.812`, `144.963`, `-37.81234`, `144.96321` nor the typed suburb; every Maps `href` contains none of those digits and the place name; existing share-text builders return identical strings with and without an origin set (find them with `grep -rn "share" src/ui/ShareDial.tsx src/ui/NumberScreen.tsx` and import the real builder).
- [ ] **Step 4: Failing tests (wiring).** `views.test.ts`: `'nearby'` is a valid `View` and `resolveView('nearby', profile)` returns it with or without a score. `Menu.test.tsx`: "Nearby" appears directly after "Food support" and navigating calls `onNavigate('nearby')`. `App.test.tsx`: choosing Nearby from the Menu renders the h1 and focuses it.
- [ ] **Step 5: Run** `npx vitest run src` — expect FAIL.
- [ ] **Step 6: Implement** the adapter, context, components and wiring. Copy the loading, error and heading patterns from `SupportPanel.tsx` (`FocusHeading` and `useFocusOnViewChange` for focus; a request-token ref for cancel; `RoundPhoto` with `photoUrl('nearby-market')`). Origin state holds `{ lat, lng, label? }` only, rounded with `roundOrigin`; reset on unmount. Layout only needs to be plain and correct here; polish is Task 5. Add a plain link "More help from Foodbank" to `https://findfood.foodbank.org.au/?state=vic` and a link to the Food support view.
- [ ] **Step 7: Run** gates from Task 1 Step 5 — expect green.
- [ ] **Step 8: Commit** `feat: nearby view, location provider and menu wiring` (explicit paths).

### Task 5: Visual pass and Playwright verification

**Files:**
- Modify: `src/ui/Nearby.tsx`, `src/ui/NearbyFilters.tsx`, `src/ui/NearbyPlaceRow.tsx`, `src/index.css` only if a token-based style is needed; screenshots go to the untracked `shots/` folder.

**Interfaces:** Consumes Task 4 components; produces no new API.

- [ ] **Step 1: Design pass.** Load `design-taste-frontend` and apply the plate system: round `nearby-market` photo beside the h1 (as in SupportPanel), the primary pill "Use my location", a quieter pill-shaped suburb field and "Go", radio pills with a check glyph on the selected one, rows with no cards or hairlines, price and fit as plain words, generous spacing, long names wrap without horizontal scroll.
- [ ] **Step 2: Verify with Playwright MCP** (clear storage first: `browser_close`, reopen). Start `npm run dev`. Grant geolocation via `browser_run_code_unsafe` (`context.grantPermissions(['geolocation'])` and `context.setGeolocation({ latitude: -37.8136, longitude: 144.9631 })`). Screenshot at 390, 320 and 1280 in two themes: landing, results, a filter selected, the denied state (revoke permission), the suburb-typed state with "Did you mean", the far-away-origin state. Confirm no horizontal scroll with `browser_evaluate` (`document.documentElement.scrollWidth <= innerWidth`), one h1, the filter group reachable and operable by keyboard (`browser_press_key`), 44px targets, selected state visible without colour.
- [ ] **Step 3: Privacy check in the real browser.** After the flow call `browser_network_requests`: every request is same-origin static; none has the coordinates in URL, headers or body; `browser_console_messages` has none of them; `browser_evaluate` dumps `localStorage`/`sessionStorage` and finds no coordinates or typed suburb.
- [ ] **Step 4: Fix what the screenshots show**, re-shoot, then run gates from Task 1 Step 5 (all component tests must still pass unchanged).
- [ ] **Step 5: Commit** `style: nearby view in the plate design` (explicit paths; never `shots/`).

### Task 6: Docs and final gates

**Files:**
- Modify: `docs/FEATURES.md`, `README.md` (only if it lists views or scripts), `docs/superpowers/research/README.md` (final check), spec "Builder-check rulings" (record any deviation found while building, in a short "Build notes" list)

- [ ] **Step 1:** Add Nearby to `docs/FEATURES.md` (what it does, the starter-set caveat, privacy rule, how to refresh the dataset and centroids with `npm run build:places` and `npm run build:centroids`).
- [ ] **Step 2: Final verification.** Run `npm test`, `npx tsc --noEmit` (root, packages/core, server), `npm run build`, `npm run build:places && npm run build:centroids && git status --short` (no changes to generated files); `grep -rn "console\." src/location src/ui/Nearby*.tsx` shows nothing; confirm every place in the dataset has a source URL and `checked` date by reading the generated file once.
- [ ] **Step 3: Commit** `docs: nearby options usage and refresh notes` (explicit paths). Do not push or merge.
