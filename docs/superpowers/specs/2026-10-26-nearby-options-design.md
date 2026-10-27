# Nearby cheap and healthy options: Design

Requested by the user on 26 October 2026: "a proximity-relative feature which shows you cheap/healthy options that are close by or local relative to your location." Written without a question round because the user is away from the keyboard working through a task queue; every decision below is the designer's call and can be changed. Builds on the plate design system, the mock-first source pattern (`PriceSource`, `FoodSupportSource`) and the privacy rules of the rewrite design.

## Intent and why
Cheap and healthy only helps if you can reach it. Today swaps say what to buy and the support panel lists help in general. This view answers "what is near me, and is it cheap or healthy?": markets, budget grocers, social supermarkets, community meals and food relief, sorted by how close they are, with plain labels for price and healthiness. It must work for someone with no car and little data, so the list is lightweight and works without a map.

## What gets built
1. **Nearby view** (`View 'nearby'`, Menu item "Nearby", after Food support): h1 "Close to you."; a round primary button "Use my location" and a quieter "Type a suburb or postcode" field.
2. **Places list:** plain rows (round photo or glyph, name, kind, distance as "350 m" or "1.2 km", price band word "Budget / Mid / Pricier / Free", healthy-fit words "Fresh produce / Packaged / Meals", opening-hours note when known, "Open in Maps" external link, "Last checked" date). Filter pills: All, Fresh produce, Budget, Free or low cost. Sorted by a transparent score: distance first, then price band, then fresh-produce fit; the score is explained in one sentence, never hidden.
3. **Tie to the score:** at a low hunger score the list leads with free and low-cost options; at a high score it leads with fresh produce. The ordering rule is a pure core function.
4. **States:** permission asked only after the button is pressed; denied, unavailable, timeout and offline each get a calm message and the manual suburb path; nothing found within 10 km says so and shows the closest few.
5. **No map tiles.** A map would call third-party tile servers and leak location. "Open in Maps" is a plain user-initiated link.

## Privacy (hard rules)
- Location is requested only on a button press, used in memory, **never stored, never sent to our server or any third party, never in the share text**. The place list is bundled data, so no request carries the position.
- Typed suburb/postcode is matched against a bundled table of Melbourne suburb centroids (no geocoding service).
- The "Open in Maps" link opens the place's address, never the user's position.
- Copy says so in one sentence on the view.

## Data
- `Place { id; name; kind: 'market' | 'grocer' | 'social-supermarket' | 'community-meal' | 'food-relief' | 'co-op'; lat; lng; address; suburb; priceBand: 'free' | 'budget' | 'mid' | 'pricier'; fit: ('fresh' | 'packaged' | 'meals')[]; hours?: string; sourceId; checked: string }`.
- `PlaceSource` interface (`list()`), `MockPlaceSource` first, then `StaticPlaceSource` over a generated dataset built from sourced, open material (candidates to research: the Victorian government open data portal, OpenStreetMap under ODbL with attribution, council community-meal directories, Foodbank Victoria and social-supermarket networks, the Victorian Farmers Markets Association list, Queen Victoria Market). Same rules as the benchmark dataset: every place has a source and a checked date; never invent a place, address or opening hour; unverified hours are omitted; attribution kept where a licence requires it.
- Pure core helpers (platform-free, tested): `haversineMetres(a, b)`, `formatDistance(m)`, `rankPlaces(places, origin, score, filter)`, `suburbCentroid(text)`.

## Constraints
Plate design system (round shapes, no cards/chips/hairlines/shadows/gradients, AA, 44px targets, one h1, themes, phone-first, no horizontal scroll 320-1280). Geolocation through a small web-layer adapter behind an interface (`LocationProvider`) so tests inject fakes; the core stays platform-free. Tone: kind, no pressure; no health claims beyond "fresh produce available"; prices are bands from the source, never invented dollar figures.

## Goals / non-goals / anti-goals
- **Goals:** a fast, private, honest nearby list ranked by distance, price and fit.
- **Non-goals:** live stock or live prices, directions or routing, maps, reviews, accounts, saving locations, notifications.
- **Anti-goals:** storing or transmitting location, invented places or hours, implying a place is open when unknown, ranking hidden behind opaque scores.

## Calls made (designer)
1. No map; list plus external Maps link. 2. Suburb centroid table instead of a geocoding API. 3. Price as bands, not dollar amounts. 4. Mock source first, then a researched static dataset. 5. Menu position after Food support. 6. Ranking explained on screen. 7. Location never persisted, even per profile.

## Left to the builder
Component names, the filter pill layout, the centroid table's source (ABS postcode/SAL data if licence permits), wording within the tone rules.

## Builder-check rulings (designer, unattended; not yet confirmed by the user)

Checked 27 October 2026 by reading `SupportPanel`, `MockFoodSupportSource`, the benchmark dataset and generator (`scripts/build-benchmarks.mjs`, `docs/superpowers/research/`), `views.ts`, `Menu` and `App`, and by researching the candidate sources below. Where a ruling conflicts with the sections above, the ruling wins. Preference order throughout: privacy, honesty, simplicity.

### A. Data sources (researched 2026-10-27)

| Candidate | Finding | Ruling |
|---|---|---|
| Emergency Food Relief Groups, City of Casey, on data.vic.gov.au | Portal lists CC BY 3 ("other"); the data.gov.au mirror says "Licence Not Specified"; fields are suburb, postcode, provider, address, contact, description and hours "where available"; updated continually; publisher disclaims accuracy. **Covers the City of Casey only.** | **Usable as a primary seed for `food-relief` and `community-meal` in Casey** once the builder re-reads the licence on the publisher's own metadata page and records it. Snapshot rows, not a live feed. Keep CC BY attribution on the view. Every row gets the checked date of the snapshot. |
| OpenStreetMap | ODbL: credit "© OpenStreetMap contributors" and share-alike on a derived database; hours and tags are volunteer-entered and often stale. | **Not used in this version.** A bundled extract would be a derived database and impose ODbL on our dataset; unverifiable hours conflict with "never invent". May be revisited as its own piece of work. |
| Victorian Farmers' Markets Association (31 accredited markets) | A "Find a market" list exists; no reuse licence found. | **Do not copy the list.** A market may be entered only after the builder reads the market's own (or its council's) page and records name, public address and schedule as facts with that page as `sourceUrl`. Verified today: Boroondara Farmers Market, Patterson Reserve, 484 Auburn Road, Hawthorn, 3rd and 5th Saturday each month (hours not stated on the page; accredited by the VFMA). |
| Foodbank Victoria "Find food" locator (`findfood.foodbank.org.au`) | Public locator; no open licence seen. | **Not copied.** The Nearby view carries one plain link to the locator as "More help from Foodbank". |
| Queen Victoria Market | "All rights reserved"; trading days and hours are on its site (Tue, Thu, Fri 6am-3pm; Sat 6am-4pm; Sun 9am-4pm; specialty shopping from 9am), street address not on the page fetched. | Facts only, with the page as `sourceUrl`; the builder confirms the address on the market's visitor page before entering it. No text or images copied. |
| Council community-meal directories | Per-council pages with unclear or no licence. | Facts (name, address, schedule) may be entered one place at a time from the council page, never bulk-copied. |

1. **Seed = a small curated starter set, labelled as such.** Every place is verified by reading the operator's or council's own page (`verification: 'primary'`) or a dataset above; each carries `sourceUrl`, `licence` (or `"facts only"`), `checked` (ISO date) and `verification`. No place enters the data on memory or on a search snippet. A place that cannot be verified is left out, not guessed. The view says "A starter list of places we could check, mostly in a few Melbourne areas. It is not every place." Quantity is not a goal: ten honest places beat fifty guesses. The coverage statement is generated from the data (count and suburbs), never typed.
2. **Dataset and generator follow the benchmark pattern exactly.** `docs/superpowers/research/2026-10-27-nearby-places.json` (`generatedAt`, `sources[]`, `places[]`, `notFound[]`) is the single source; `scripts/build-places.mjs` validates (unique ids, every place's `sourceId` resolves to a source with an https URL and licence text, `checked` is a real past date, lat/lng inside a Greater Melbourne box, priceBand/kind/fit in the enums, no `hours` without a `sourceId`, address non-empty) and writes `packages/core/src/places/generated/places.generated.ts`; a test regenerates in memory and fails on drift; the research README gets a "Places" rule list.
3. **Place gains fields:** `access: 'open' | 'referral' | 'membership'` (free relief often needs a referral; shown as "Referral needed" / "Membership" / nothing for open), `sourceUrl` via source, `hours?` is the source's own words (see F). The `Place.sourceId` stays. Photos are never per-place; one decorative photo only.
4. **Attribution** from `sources[].licence` is rendered in a "Where this comes from" disclosure at the foot of the view (publisher, licence, checked date), plus the existing PhotoCredits entry for `nearby-market`.

### B. Suburb and postcode centroids

5. **Source: ABS ASGS 2021 SAL (suburbs) and POA (postcodes), CC BY 4.0** (ABS content licence; the ArcGIS layer metadata itself states no licence and has no centroid field, so the builder confirms CC BY 4.0 on the ABS download page and records the URL and date). Centroids are computed offline by a one-off script from the downloaded GDA2020 boundary file, filtered to Greater Melbourne, rounded to 3 decimals (about 100 m, enough for ranking and itself a privacy-friendly precision), and committed as `docs/superpowers/research/2026-10-27-melbourne-centroids.json` with its source record. The 100+ MB national file is never committed or bundled. Expected size: about 700 suburbs and 300 postcodes, roughly 30 KB.
6. **Fallback if the ABS file or licence cannot be confirmed:** a curated list of about 150 suburbs whose coordinates are read from each suburb's ABS or council page, same JSON shape; postcode typing is then switched off with the message "Type a suburb" rather than guessing.
7. **Matching:** normalise (trim, lower case, strip diacritics and punctuation, collapse spaces, drop a trailing ", VIC" or "Victoria"). A 4-digit input is a postcode. Order: exact, then a single prefix match, else up to five "Did you mean" suggestions as buttons; no match says "We don't have that suburb yet. Try one nearby." No fuzzy matching, no geocoding service. Output is `{ lat, lng, label }` where the label is the matched name, shown as "from the middle of Footscray" (a centroid is not an address).
8. Typed text is not stored. If the signed-in profile already has a `suburb`, the field is prefilled from it (the person put it there themselves); Nearby never writes it back.

### C. Geolocation permission UX and failure states

9. The browser prompt appears only after "Use my location" is pressed. No Permissions API query on load. One `getCurrentPosition` call with `enableHighAccuracy: false`, `timeout: 10000`, `maximumAge: 0`; never `watchPosition`. While waiting: "Finding you…" with a "Cancel" pill; cancelling ignores a late result (a request token).
10. The position is rounded to 3 decimals the moment it arrives, held only in React state for the Nearby view, and discarded on leaving the view, on "Clear my location" and on unmount. Accuracy and timestamp are discarded.
11. **States** (all calm, each keeps the suburb field available; the message is an `aria-live="polite"` region and focus stays on the control that was pressed, except denied, which moves focus to the suburb field):
   - denied: "Location is off for this site. You can type a suburb instead, or turn it on in your browser settings." (focus moves to the suburb field);
   - unavailable (no API, insecure context, `POSITION_UNAVAILABLE`): "We couldn't work out where you are. Type a suburb instead." and, if `navigator.onLine === false`, add "You also look to be offline; the list still works.";
   - timeout: "That took too long. Try again, or type a suburb." with a "Try again" pill;
   - **offline needs no state of its own**: the list is bundled and works offline; the only offline effect is the extra sentence above.
   - nothing within 10 km: "Nothing in our list within 10 km." and the closest five with their true distances; if the closest is over 50 km: "Our starter list covers Melbourne for now."; empty filter result: "Nothing matches that filter nearby. Try All."
12. `LocationProvider` is `{ locate(): Promise<LocationResult> }` with `LocationResult = { ok: true; lat; lng } | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' }`. The type lives in core, the browser adapter in `src/location/`, injected through a small React context (default: the browser adapter) so tests pass fakes. The adapter does not log.

### D. Ranking function (pure, in core)

13. **Which direction is "low score"?** The existing score is 0-100 where 100 means no food insecurity; `rankNudge(score)` already maps `<40` cheapest, `<60` balanced, else healthiest. Nearby reuses `rankNudge` rather than inventing a second rule. No score (never checked in) is treated as `balanced`. The spec's "low hunger score leads with free" means a low food-security score.
14. **Plain rule, no hidden weights:** filter first; then every place goes into a distance band (under 1 km, 1-2 km, 2-5 km, 5-10 km, over 10 km). Bands come first, so nothing far away beats something close. Inside a band the order is: `cheapest`: price (free, budget, mid, pricier), then fresh produce, then distance; `balanced` and `healthiest`: fresh produce first, then price (healthiest) or distance (balanced), see table. Final tie-breaks, in order: exact distance, name (`localeCompare('en-AU')`), id. The function is deterministic with no randomness and does not mutate its input.

| Nudge | Within a distance band |
|---|---|
| cheapest | price, fresh, distance |
| balanced | fresh, distance, price |
| healthiest | fresh, price, distance |

15. The on-screen sentence is chosen from the same nudge: "Sorted by distance, then cheapest first." / "Sorted by distance, then fresh produce." / "Sorted by distance, then fresh produce and price." No "recommended", no numeric score.
16. **Pills (single choice):** All, Fresh produce (`fit` includes `fresh`), Free (`priceBand === 'free'`), Low cost (`free` or `budget`). This replaces the spec's overlapping "Budget" and "Free or low cost". The list shows 12 rows then "Show more".

### E. Price bands, distance, units

17. **Bands describe the kind of place, not today's prices, and say so** ("Price bands are typical for this kind of place."). Defaults: `free` = no charge (food-relief, community-meal); `budget` = subsidised, pay-what-you-can or member pricing (social-supermarket, co-op); `mid` = general markets and grocers; `pricier` = accredited farmers' markets (producer-direct, not discount). A per-place override is allowed only when its source states the pricing; the override and source are recorded. Dollar figures never appear.
18. **Distance:** straight-line (haversine, Earth radius 6,371,008.8 m), labelled "Straight-line distance, not walking time." `formatDistance(m)`: under 100 m "under 100 m"; under 1,000 m rounded to the nearest 50 m ("350 m"); 1,000 m to under 10 km one decimal ("1.2 km", trailing ".0" dropped); 10 km and over whole km ("12 km"). Negative, NaN or Infinity returns "distance unknown". Metric only; `en-AU` number format.
19. **Origin by suburb** adds "from the middle of Footscray" under the list heading, since a centroid can be up to a few km from the person.

### F. Opening hours

20. No "open now" computation anywhere: schedules, public holidays and timezones are a source of confident wrong answers. `hours` is the source's own words, short (for example "3rd and 5th Saturday each month"), shown as-is under "Hours (check before you go)". Absent hours show "Hours not listed". Never implied open.

### G. Accessibility of the filters

21. The filters are a native radio group in a `<fieldset>` with a visible `<legend>` ("Show"), styled as pills; keyboard behaviour is the browser's (arrows, Tab into the group once). Targets 44 px; the selected pill is also marked by a check glyph and heavier weight, never colour alone; AA contrast in all four themes. The result count ("7 places") is in an `aria-live="polite"` region; changing a filter never moves focus; the list is a `<ul>` with each place's name as an `h2` (one `h1` per screen, focus to it on entering the view via the existing `useFocusOnViewChange`). "Open in Maps" has an `aria-label` including the place name and `rel="noopener noreferrer"`.

### H. Privacy test plan

22. **Static guard (core and view code):** a test fails if any file under `packages/core/src/places/`, `src/location/` (except the adapter's single `navigator.geolocation` use) or `src/ui/Nearby*` mentions `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie`.
23. **Network:** a component test spies on `fetch`, `XMLHttpRequest.open`, `navigator.sendBeacon` and `Image` construction, walks the full flow (press, fix, change filter, type a suburb, tap Maps link) with a fake provider returning `-37.81234, 144.96321`, and asserts zero calls; any call fails the test. The "Open in Maps" `href` contains the place's name and address only and none of the origin's digits.
24. **Storage and share text:** after the flow the test serialises `localStorage` and `sessionStorage` and asserts they contain neither coordinate (rounded or full) nor the typed suburb; a profile save during the flow does not gain a location field; the existing share-text builders are unchanged and a test asserts a share string made while an origin is set matches one made without.
25. **Real browser:** Playwright MCP with granted geolocation set to a Melbourne point and `browser_network_requests` read after the flow: every request is same-origin static asset; none carries the coordinates in URL, headers or body; the console is clean of coordinates. Screenshots at 390, 320 and 1280 in two themes.
26. **Unit tests:** haversine against known pairs and symmetry; `formatDistance` boundaries (99, 100, 999, 1000, 9999, 10000, NaN); `rankPlaces` per nudge, every tie-break, filter-before-rank, input not mutated; `suburbCentroid` normalisation, postcode, ambiguity, no-match; generator validation and drift.

### I. Smaller rulings

27. Menu label "Nearby", `View = 'nearby'`, placed after "Food support". The photo is the credited `nearby-market` (already in `credits.ts`), used as a `RoundPhoto` beside the h1 like the support view.
28. `PlaceSource` joins the services container. The app default is `StaticPlaceSource` over the generated data. `MockPlaceSource` exists for tests only and uses obviously fake names ("Test Market"); it is never the container default so no fake place can reach a person. The HTTP container uses the static source (no server endpoint).
29. The existing Food support view is unchanged; Nearby links to it ("Free food and meals") and does not duplicate its sample data (those are marked sample and are not reused as places).
30. Copy states the privacy rule in one sentence: "Your location stays on this device. It is not saved or sent anywhere."
