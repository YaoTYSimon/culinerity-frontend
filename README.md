# Culinerity

Culinerity helps anyone in Melbourne find cheaper, healthier swaps for what they crave. Pick a craving, see what costs less and sits better, and optionally take a short, private check-in about food and money. The check-in gives one number out of 100 on a plate-shaped dial, tunes the swaps and points to free food support nearby. There is no sign-up and no server account: you can use it as a guest, or make a local profile on your device.

## What is in it

- **Welcome**: one question and a "Find my number" or "Skip to cheaper swaps" choice on first visit. Reopen it any time from the Menu.
- **Check-in**: one question at a time, with a progress bar, Back and Skip.
- **Your number**: the score on a dial whose rim fills once (static with reduced motion), what it means in plain words, and your earlier scores. A low score also shows a link to free food nearby.
- **Swaps**: cheaper, healthier swaps for a craving, each with an "Add to my week" button, and an optional budget.
- **Food support**: nearby places that give out free food, with directions.
- **Budget**: a plate showing what is left of your weekly food budget (weeks run Monday to Sunday), a plain pace message, spending you add, remove or undo, past weeks, what swaps saved, and "How this compares" with cited figures. The budget is optional: the tracker works on spending alone.
- **Data and policy**: a plain-language page of sourced figures on food insecurity in Australia and Victoria (cost of living, students, Melbourne areas by disadvantage, what helps), each with its source, year and how it was checked. Open it from the Menu or the footer link.
- **My week**: the swaps you added in the last 7 days and what you saved, shareable as savings-only text.
- **Local profiles** (optional): name, an avatar colour and an optional 4 to 8 digit passcode, kept on this device only. A round avatar button in the header opens Switch profile, Lock, Delete this profile and its data, and Sign out. Guests can make a profile from the same button and choose whether to bring their current data along.
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
npm test           # core, web and server tests (time zone pinned to Australia/Melbourne)
npm run typecheck
npm run build
npm run build:benchmarks   # regenerate the benchmark data from the research JSON
node scripts/contrast.mjs   # WCAG contrast of the four themes
```

## Privacy

Answers to the check-in, your score and its history, budget, suburb, My week and theme stay on your device and are never sent anywhere. The app makes no third-party requests (no analytics, CDNs or remote fonts). The optional server only serves reference data.

## Local profiles and the passcode lock

Profiles live only in this browser's storage. They are a convenience for a shared device, not security:

- The passcode is never stored. A PBKDF2-SHA-256 verifier (random salt, 210,000 iterations) is, and the passcode lock only gates the app's own screens. The saved data is **not encrypted**: anyone with access to the browser's developer tools can read it, and a 4 to 8 digit code can be guessed offline.
- After 5 wrong passcodes there is a 30 second pause. It is tracked in storage and in memory, and clearing the site's storage resets it. Nothing is ever deleted because of wrong tries.
- If a browser has no Web Crypto (very old or insecure contexts), only profiles without a passcode can be made.
- A forgotten passcode cannot be reset. Anyone using the browser can delete that profile from the sign-in screen (typing its name) and start a new one.
- Duplicating a tab copies its signed-in session (the copy starts signed in as the same profile), and two tabs open at once can under-count wrong passcodes, so the 5-try pause is a soft limit.
- Closing the tab signs you out (the signed-in id lives in `sessionStorage`). A refresh stays signed in. A fresh tab with profiles on the device asks who is eating; "Skip for now" continues as a guest. The theme is device-wide and not part of a profile.

Storage keys:

| Key | Where | Holds |
| --- | --- | --- |
| `culinerity.accounts.v1` | localStorage | names, avatar colours, passcode verifiers |
| `culinerity.attempts.v1` | localStorage | wrong-passcode counts and pause times |
| `culinerity.session.v1` | sessionStorage | the signed-in profile id for this tab |
| `culinerity.profile.v1` | localStorage | the guest's data (also what "start from my current data" moves) |
| `culinerity.profile.v1.<id>` | localStorage | one profile's data |
| `culinerity.theme.v1` | localStorage | the theme (shared by everyone on the device) |

To reset: delete a profile from the header menu or sign-in screen, or clear this site's data in the browser settings (removes everything above). In devtools: `localStorage.clear(); sessionStorage.clear()`.

## Sample data and benchmark data

Prices, nutrition figures and support places are sample data, labelled "Sample data" in the app. They are not real quotes. Culinerity is not medical advice.

The benchmark figures on the Budget and Data and policy views are different: they are real published figures (19 sources, 37 indicators, 12 Melbourne areas, 6 interventions), each linked to its source. The rule is **no invented numbers**: a figure is added or changed only after reading its source. Each carries a verification label shown in the app:

- **Read from the source itself**: `primary`.
- **Read from a published report that cites it**: `secondary`.
- **Press report only (not checked against the study)**: `press`.

Figures from before known changes, or more than five years old, show "Older data". Things the research looked for and could not find are listed on the page rather than guessed.

To refresh the data, edit `docs/superpowers/research/2026-10-26-food-security-data.json`, then run `npm run build:benchmarks`, which validates it and rewrites `packages/core/src/benchmarks/generated/benchmarks.generated.ts`. Commit both files. A test fails if the generated file is out of date. Full rules are in [docs/superpowers/research/README.md](docs/superpowers/research/README.md).

## Photo credits

The 13 photographs (ten cravings and three home-cooked dishes on the welcome, check-in and support screens) come from Wikimedia Commons. The full list with authors and licence links is under "Photo credits (13)" at the foot of every screen (source: `src/assets/photos/credits.ts`).

## Design and plan

- Plate redesign spec: [docs/superpowers/specs/2026-10-26-welcome-themes-plate-redesign-design.md](docs/superpowers/specs/2026-10-26-welcome-themes-plate-redesign-design.md) and plan: [docs/superpowers/plans/2026-10-26-plate-redesign.md](docs/superpowers/plans/2026-10-26-plate-redesign.md)
- Developer notes (structure, design rules, how to add a theme): [AGENTS.md](AGENTS.md)
- Design spec: [docs/superpowers/specs/2026-10-25-culinerity-rewrite-design.md](docs/superpowers/specs/2026-10-25-culinerity-rewrite-design.md)
- Implementation plan: [docs/superpowers/plans/2026-10-25-culinerity-rewrite.md](docs/superpowers/plans/2026-10-25-culinerity-rewrite.md)
