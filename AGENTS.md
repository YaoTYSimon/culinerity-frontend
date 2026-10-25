# Culinerity

Cheaper, healthier swaps for what you crave, for anyone in Melbourne. React 19 + Vite 8 + Tailwind CSS v4 web app, with a platform-free core package and an optional reference-data server. Requires Node >= 22.

## Layout

- `packages/core` (`@culinerity/core`): platform-free TypeScript. Domain types, scoring, swap ranking, the `swapService`, source interfaces, mock and HTTP sources, and the `ProfileStore` interface. No `window`, `document`, `localStorage`, React or Node APIs (a test enforces this).
- `server` (`@culinerity/server`): Hono + better-sqlite3 API for reference data only (cravings, swaps, prices, nutrition, support places). See `server/README.md`. Never stores anything about a person.
- `src/ui`: React components. `src/App.tsx` is the shell and view switch (plain state, no router): `welcome`, `checkin`, `number`, `swaps`, `support`, `week`.
- `src/theme`: `tokens.ts` (the single TypeScript source of the four theme palettes), `ThemeProvider` (sets `data-theme` on `<html>` and persists the choice).
- `src/assets/photos`: the 13 bundled Wikimedia Commons photographs (10 cravings, 3 home-cooked welcome photos) and `credits.ts`. Drawn illustrations in `src/ui/illustrations` are the fallback for cravings without a photo.
- `src/services`: `createServices` (the only place concrete sources and stores are wired for the web app), `loadServices` (mocks, or HTTP sources when `VITE_USE_BACKEND=true`), `ServicesContext` and `ServicesLoader` (renders the shell at once; the backend catalogue loads in the background).
- `src/storage`: `LocalProfileStore` (profile) and `LocalThemeStore` (theme), both localStorage-backed and never throwing.
- `src/index.css`: Tailwind v4 import, the six colour roles per theme (`:root` and `[data-theme=...]`), `@theme` names (`bg`, `surface`, `ink`, `muted`, `accent`, `accent-ink`), the food-illustration palette, the plate-rim animation, and the shared `focus-ring` / `motion-colors` utilities.
- `scripts/contrast.mjs`: `node scripts/contrast.mjs` checks WCAG contrast of every theme from `src/index.css`.
- `docs/superpowers/`: design specs and implementation plans (the plate redesign is `specs/2026-10-26-welcome-themes-plate-redesign-design.md`).

## Scripts

- `npm run dev`: Vite on http://localhost:8443/ (host 127.0.0.1; `/api` proxies to http://127.0.0.1:8787).
- `npm run build`, `npm run preview`, `npm run format` (oxfmt).
- `npm test`: core, web and server tests (`npm run test:server` runs the server tests alone). `npm run typecheck`: root, core and server.
- `npm run seed`: create and fill the local SQLite database. `npm run server`: start the API on 8787.
- `npm run dev:all`: server and dev server together. Use `VITE_USE_BACKEND=true npm run dev:all` to run the web app against the server.

## Product flow

- First visit opens **Welcome** (one question, "How much is food on your mind?"). "Find my number" starts the check-in; "Skip to cheaper swaps" goes to the swaps. Either marks `welcomeSeen`; opening Welcome from the Menu does not.
- **Check-in** asks one question at a time (the FIES questions, then the domain questions) with a progress bar, Back and Skip. Finishing saves the score and shows the **number screen**.
- **Number screen**: the score on a plate-shaped dial whose rim fills once (shows its final state under reduced motion), a plain band headline, the history of earlier scores, and a swap nudge. A score below `SUPPORT_BELOW` (40, in `packages/core/src/domain/bands.ts`) also shows a link to **Food support**.
- **Swaps**: search or pick a popular craving; results rank cheaper, healthier swaps with an "Add to my week" button on each. A collapsed "Your budget" holds the optional weekly budget, income and suburb.
- **Food support**: nearby free food places with a Directions link (sample data unless the server is used).
- **My week**: the swaps added in the last 7 days grouped with their savings, "Remove one", "Clear week", and Share (Web Share, else the clipboard, else text to copy by hand). The share text is savings only: never the score, answers, finances, suburb or a name.

## Design rules (the plate)

- Flat colour only: no shadows at rest, gradients, hairlines or cards. Tone steps (`bg` then `surface`) separate things.
- Everything is fully round: buttons (`PillButton`), inputs, focus rings, photos (`RoundPhoto`), dots. A photo is never hard-cropped at a screen edge.
- One typeface, Schibsted Grotesk (bundled). Display text is weight 800, tight tracking, sentence case (`.font-display`).
- Touch targets are at least 44px; plain language; motion only through `motion-safe` and the one-time dial fill.
- Use the semantic colour names only (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `bg-accent`, `text-accent-ink`). Do not add Tailwind important (`!`) overrides.

## Themes

Four themes: tobacco (default), sand, walnut, cream, switched by the dots in the header. The palettes live in `src/theme/tokens.ts` (single TypeScript source, used by `ThemeDots`); `src/index.css` must hold the same six values (and the no-flash script in `index.html` the `bg` colour), and `src/theme/tokens.test.ts` fails when they drift. `src/theme/contrast.test.ts` enforces contrast.

To add a theme: add its id to `ThemeId` and `THEME_IDS`/`THEME_NAMES` in `packages/core/src/theme/theme.ts`; add its six values to `THEME_TOKENS` in `src/theme/tokens.ts`, a `[data-theme='id']` block in `src/index.css`, and the `themes` map (bg colour) in `index.html`; then run `npm test` and `node scripts/contrast.mjs`.

## Privacy rules

- A person's answers (check-in, score, score history, budget, suburb, My week, theme) stay on their device in localStorage (`culinerity.profile.v1`, `culinerity.theme.v1`). Sharing the week sends nothing to us. They are never sent anywhere.
- No third-party requests: no analytics, CDNs, remote fonts or embeds. Fonts are bundled via `@fontsource`.
- The server only serves reference data and receives no profile data.

## Data

Mock-first. By default the app runs on bundled sample data (prices, nutrition, support places) and labels it "Sample data". Do not present sample data as real.

## Conventions

- SOLID and DRY. Depend on the core interfaces (`FoodCatalogue`, `PriceSource`, `NutritionSource`, `FoodSupportSource`, `ProfileStore`); wire concrete classes only in `createServices` / `createHttpServices`.
- Keep `packages/core` platform-free. Put browser code in `src`, Node code in `server`.
- Style with Tailwind utilities and the theme tokens; do not hard-code colours (the food-illustration palette is the one exception). Reuse `focus-ring` and `motion-colors` rather than repeating those class strings.
- Accessibility: visible focus, 44px touch targets, plain language, respect reduced motion.
- Every behaviour change comes with a test (Vitest + Testing Library for UI; `*.test.ts` beside the code in core and server).
