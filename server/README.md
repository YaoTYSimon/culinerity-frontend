# Culinerity API

A small Hono + SQLite (better-sqlite3) server for **reference data only**: the craving catalogue, swaps, prices, nutrition and food-support places. There are no accounts. Questionnaire answers, finances and the score stay on the user's device and are never sent here.

## Run it

```sh
npm run seed       # creates server/data/culinerity.db (gitignored); safe to run twice
npm run server     # http://127.0.0.1:8787
npm run dev:all    # server + Vite together; Vite proxies /api to the server
```

The web app uses the sample mocks by default. To use the server, start `VITE_USE_BACKEND=true npm run dev:all`. If the server is down the app shows empty results with its usual friendly messages rather than crashing.

## Endpoints (JSON only)

| Route | Returns |
| --- | --- |
| `GET /api/cravings?q=` | `FoodItem[]` matching name or keyword (`q` required, max 100 chars; blank gives `[]`) |
| `GET /api/cravings/popular` | the 10 popular `FoodItem`s |
| `GET /api/cravings/all` | every `FoodItem` craving, for the web app's picklist and the cultural-food matching done on the device (no parameters) |
| `GET /api/swaps/:cravingId` | `SwapCandidate[]` (`[]` if unknown) |
| `GET /api/food-info` | `FoodInfo[]` for every item (ingredient flags, allergens, traditions, kitchen items), read once so the device can match rules locally |
| `GET /api/food-info/:itemId` | one `FoodInfo`, or `404 {"error": ...}` |
| `GET /api/prices/:itemId` | `PricePoint[]` (live rows win over sample rows) |
| `GET /api/nutrition/:itemId` | `Nutrition` or `null` |
| `GET /api/support?suburb=` | `SupportPlace[]`, that suburb first (suburb max 80 chars) |

No route reads a request body or a profile: a person's food traditions, rules, allergies and meals are matched on their device and are never sent here (a test checks that a profile-shaped body or header changes no response).

Bad input gives `400 {"error": "..."}`; failures give `500 {"error": "Internal server error"}` with no stack trace.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | listen port |
| `HOST` | `127.0.0.1` | bind address (local only by default) |
| `DB_PATH` | `server/data/culinerity.db` | SQLite file |
| `API_PROXY_TARGET` | `http://127.0.0.1:8787` | Vite dev proxy target |
| `APIFY_TOKEN`, `APIFY_ACTOR_ID` | unset | only for live prices, read only by `ApifyScraperClient` |

No CORS headers are sent; in development use the Vite proxy.

## Sample data and live prices

The seeded prices, nutrition and support places are **invented sample data** (`is_sample = 1`). The `ingest` function and `ApifyScraperClient` exist but are not wired to any command, and the Apify client stays disabled unless `APIFY_TOKEN` is set. **A real scrape needs the user's explicit go-ahead and their own token** (check the actor's terms first); never commit a token. Tests use in-memory SQLite, `MockScraperClient` and fetch stubs only.

## Layout

`schema.sql` / `db.ts` (idempotent schema), `seed.ts` (loads core's `SEED_DATA`), `repositories.ts` (interfaces plus SQLite implementations, parameterised SQL only), `routes.ts` (depends only on the interfaces), `scraperClient.ts`, `ingest.ts`, `index.ts` (wiring).
