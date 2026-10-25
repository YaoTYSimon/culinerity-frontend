# Culinerity

Cheaper, healthier swaps for what you crave, for anyone in Melbourne. React 19 + Vite 8 + Tailwind CSS v4 web app, with a platform-free core package and an optional reference-data server. Requires Node >= 22.

## Layout

- `packages/core` (`@culinerity/core`): platform-free TypeScript. Domain types, scoring, swap ranking, the `swapService`, source interfaces, mock and HTTP sources, and the `ProfileStore` interface. No `window`, `document`, `localStorage`, React or Node APIs (a test enforces this).
- `server` (`@culinerity/server`): Hono + better-sqlite3 API for reference data only (cravings, swaps, prices, nutrition, support places). See `server/README.md`. Never stores anything about a person.
- `src/ui`: React components. `src/App.tsx` is the shell and view switch.
- `src/services`: `createServices` (the only place concrete sources and stores are wired for the web app), `loadServices` (mocks, or HTTP sources when `VITE_USE_BACKEND=true`), `ServicesContext` and `ServicesLoader` (renders the shell at once; the backend catalogue loads in the background).
- `src/storage`: `LocalProfileStore`, the localStorage-backed profile store.
- `src/index.css`: Tailwind v4 import, `@theme` design tokens (colours, fonts, radii), dark scheme, and the shared `focus-ring` / `motion-colors` utilities.
- `docs/superpowers/`: design spec and implementation plan.

## Scripts

- `npm run dev`: Vite on http://localhost:8443/ (host 127.0.0.1; `/api` proxies to http://127.0.0.1:8787).
- `npm run build`, `npm run preview`.
- `npm test`: core, web and server tests. `npm run typecheck`: root, core and server.
- `npm run seed`: create and fill the local SQLite database. `npm run server`: start the API on 8787.
- `npm run dev:all`: server and dev server together. Use `VITE_USE_BACKEND=true npm run dev:all` to run the web app against the server.

## Privacy rules

- A person's answers (check-in, score, budget, suburb) stay on their device in localStorage. They are never sent anywhere.
- No third-party requests: no analytics, CDNs, remote fonts or embeds. Fonts are bundled via `@fontsource`.
- The server only serves reference data and receives no profile data.

## Data

Mock-first. By default the app runs on bundled sample data (prices, nutrition, support places) and labels it "Sample data". Do not present sample data as real.

## Conventions

- SOLID and DRY. Depend on the core interfaces (`FoodCatalogue`, `PriceSource`, `NutritionSource`, `FoodSupportSource`, `ProfileStore`); wire concrete classes only in `createServices` / `createHttpServices`.
- Keep `packages/core` platform-free. Put browser code in `src`, Node code in `server`.
- Style with Tailwind utilities and the tokens in `src/index.css`; do not hard-code colours. Reuse `focus-ring` and `motion-colors` rather than repeating those class strings.
- Accessibility: visible focus, 44px touch targets, plain language, respect reduced motion.
- Every behaviour change comes with a test (Vitest + Testing Library for UI; `*.test.ts` beside the code in core and server).
