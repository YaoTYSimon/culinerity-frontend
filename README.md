# Culinerity

Culinerity helps anyone in Melbourne find cheaper, healthier swaps for what they crave. Pick a craving, see what costs less and sits better, and optionally take a short, private check-in about food and money. The check-in gives one number out of 100 on a plate-shaped dial, tunes the swaps and points to free food support nearby. There is no sign-up and no account.

## What is in it

- **Welcome**: one question and a "Find my number" or "Skip to cheaper swaps" choice on first visit. Reopen it any time from the Menu.
- **Check-in**: one question at a time, with a progress bar, Back and Skip.
- **Your number**: the score on a dial whose rim fills once (static with reduced motion), what it means in plain words, and your earlier scores. A low score also shows a link to free food nearby.
- **Swaps**: cheaper, healthier swaps for a craving, each with an "Add to my week" button, and an optional budget.
- **Food support**: nearby places that give out free food, with directions.
- **My week**: the swaps you added in the last 7 days and what you saved, shareable as savings-only text.
- **Four themes** (tobacco, sand, walnut, cream), chosen with the dots in the header and remembered on your device.

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
node scripts/contrast.mjs   # WCAG contrast of the four themes
```

## Privacy

Answers to the check-in, your score and its history, budget, suburb, My week and theme stay on your device and are never sent anywhere. The app makes no third-party requests (no analytics, CDNs or remote fonts). The optional server only serves reference data.

## Sample data

Prices, nutrition figures and support places are sample data, labelled "Sample data" in the app. They are not real quotes. Culinerity is not medical advice.

## Photo credits

The 13 photographs (ten cravings and three home-cooked dishes on the welcome, check-in and support screens) come from Wikimedia Commons. The full list with authors and licence links is under "Photo credits (13)" at the foot of every screen (source: `src/assets/photos/credits.ts`).

## Design and plan

- Plate redesign spec: [docs/superpowers/specs/2026-10-26-welcome-themes-plate-redesign-design.md](docs/superpowers/specs/2026-10-26-welcome-themes-plate-redesign-design.md) and plan: [docs/superpowers/plans/2026-10-26-plate-redesign.md](docs/superpowers/plans/2026-10-26-plate-redesign.md)
- Developer notes (structure, design rules, how to add a theme): [AGENTS.md](AGENTS.md)
- Design spec: [docs/superpowers/specs/2026-10-25-culinerity-rewrite-design.md](docs/superpowers/specs/2026-10-25-culinerity-rewrite-design.md)
- Implementation plan: [docs/superpowers/plans/2026-10-25-culinerity-rewrite.md](docs/superpowers/plans/2026-10-25-culinerity-rewrite.md)
