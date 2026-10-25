# Culinerity

Culinerity helps anyone in Melbourne find cheaper, healthier swaps for what they crave. Pick a craving, see what costs less and sits better, and optionally take a short, private check-in about food and money that tunes the swaps and points to free food support nearby. There is no sign-up and no account.

Requires Node >= 22.

## Run it

```sh
npm install
npm run dev        # http://localhost:8443/
```

By default the app runs on bundled sample data and needs nothing else.

### With the reference-data server

```sh
npm run seed       # create and fill the local SQLite database
npm run server     # API on http://127.0.0.1:8787
VITE_USE_BACKEND=true npm run dev:all   # server + web app together
```

If the server is down the app still opens and shows a plain message with a Retry button. See `server/README.md`.

## Checks

```sh
npm test           # core, web and server tests
npm run typecheck
npm run build
```

## Privacy

Answers to the check-in, your score, budget and suburb stay on your device and are never sent anywhere. The app makes no third-party requests (no analytics, CDNs or remote fonts). The optional server only serves reference data.

## Sample data

Prices, nutrition figures and support places are sample data, labelled "Sample data" in the app. They are not real quotes. Culinerity is not medical advice.

## Photo credits

Craving photographs come from Wikimedia Commons under their original licences. The full list with authors and licence links is in the "Photo credits" section at the foot of the home page (source: `src/assets/photos/credits.ts`).

## Design and plan

- Design spec: [docs/superpowers/specs/2026-10-25-culinerity-rewrite-design.md](docs/superpowers/specs/2026-10-25-culinerity-rewrite-design.md)
- Implementation plan: [docs/superpowers/plans/2026-10-25-culinerity-rewrite.md](docs/superpowers/plans/2026-10-25-culinerity-rewrite.md)
