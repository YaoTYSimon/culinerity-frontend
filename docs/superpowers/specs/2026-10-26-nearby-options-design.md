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
