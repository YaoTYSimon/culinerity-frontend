# App polish: eight requested changes

> For agentic workers: run the tasks in order, one at a time (they share files). Each task: tests first, then code, then `npm run typecheck`, then separately `npm test`, then commit by explicit path (no `npm run format`).

**Goal:** the eight items the user pasted on 2026-11-22.

**Branch:** `feature/app-polish` (off `main` at `e58c8a8`).

**Stack and rules:** React 19, Vite 8, Tailwind v4, TypeScript, Vitest. Plate design system (round pills and photos, no cards, chips, hairlines or shadows), Schibsted Grotesk, four themes, `design-taste-frontend` skill. Privacy first: no third-party requests, nothing leaves the device. Mock-first, no invented numbers. Visual changes are checked with real Playwright screenshots at 390 px and about 1280 px by the controller.

## Rulings (the user's answers and my calls)

- R1 (user): passcode becomes a **password**, up to 64 characters. My calls: 6 to 64 characters, any characters, normal keyboard (no `inputMode="numeric"`), show/hide toggle kept. Existing 4 to 8 digit passcodes keep working at sign-in (sign-in already accepts up to 64 characters and verifies by hash). The verifier format is unchanged. Wording changes from "passcode" to "password" in the UI.
- R2 (user): the map is **drawn on the device**: no tile server, no third-party requests. Built from a bundled, simplified Greater Melbourne outline from an official open source (licence and checked date recorded in `src/content/dataLicences.ts`), with place dots and the user's own dot (only when they have chosen to use their location or typed a suburb).
- R3 (my call): the welcome page shows to a first-time visitor with no profiles: Sign in is shown only when profiles exist; "Create a profile" and "Browse as a guest" are always offered. Choosing guest stores a non-sensitive `culinerity.welcomed` flag so it is not shown again. The profile panel still offers "Create a profile" to guests.
- R4 (my call): "Welcome, NAME" shows on the home screen for a signed-in profile (profile name, escaped, never from the URL). Guests see no name.
- R5 (my call): one header button combines Profile and Menu: the avatar plus a "Menu" label opens a single panel with the profile block (name, switch, lock, create) on top and the destinations grouped below.
- R6 (my call): menu groups: **Today** (Home, Swaps, Check-in, My week), **Money** (Budget, What if, Trade-offs), **Food** (Cook with what you have, My pantry, My food, Meals that felt like home, Food safety), **Find help** (Nearby, Food support), **About** (Welcome, Data and policy). Groups are collapsed to headings with compact rows, so the panel fits a phone without scrolling much.
- R7 (my call): Nearby filters become multi-select groups: **Type** (Markets, Grocers, Food relief, Community meals, Pantries), **Cost** (Free, Low cost), **Food** (Fresh produce, Meals, Packaged), **Access** (Walk in, Referral or appointment), **Checked** (Checked by us only). Within a group, picks are OR; across groups they are AND. Only fields that exist in the data are used; no filter is invented (for example no "open now", since hours are free text).
- R8: security-sensitive changes (R1, R3) are not merged or pushed until the user says yes. The other tasks follow the standing rule (tested work may be fast-forwarded to `main`).

- R9 (user, 2026-11-22): "cut down on the word bulk and wall of words spread out throughout the system, and make it more visual than wordy." Applies to every task and to a final copy pass (Task 7): short labels, one-line helper text, icons, round photos, dots, bars and numbers in place of sentences; long explanations go behind a disclosure, never in the main flow. Safety and privacy statements stay but shrink to one short line each. Source and licence text moves to the existing "Data and policy" page and the per-place "details" disclosure. No new paragraph-length copy in any task.

## Tasks

### Task 1: one header button, grouped compact menu (items: combine profile and menu, compact menu)
Files: `src/ui/Header.tsx`, `src/ui/Menu.tsx`, `src/ui/ProfileMenu.tsx`, their tests, `src/App.tsx` wiring, `docs/FEATURES.md`.
Replace the separate Profile avatar and Menu buttons with one button and one panel (R5, R6). Keep keyboard behaviour (Escape closes, focus returns), `aria-expanded`, `aria-current`, focus on first item, no card or hairline styling.

### Task 2: multi-select and more granular Nearby filters (R7)
Files: `packages/core/src/places/` (filter logic and tests), `src/ui/NearbyFilters.tsx`, `src/ui/Nearby.tsx`, `src/ui/NearbyBulk.tsx`, tests, `docs/FEATURES.md`.
Replace the single-choice radio with checkbox groups. Core stays platform-free. Applies to both the checked and the not-checked tiers where the field exists; show the count of results and a "Clear filters" button.

### Task 3: map drawn on the device (R2)
Files: `scripts/build-map-outline.mjs` (build-time, official source downloaded by the controller into a scratch dir outside the repo, never committed raw), `public/` or `src/` bundled simplified outline (small, gzip budget 60 kB), `src/ui/NearbyMap.tsx` + tests, `src/ui/Nearby.tsx` wiring, `src/content/dataLicences.ts`, `docs/FEATURES.md`.
Source (tested by the controller on 2026-11-22): Vicmap Admin, layer 10 "Local Government Area Boundaries (aligned to Topo)", State of Victoria open data (confirm CC BY 4.0 wording from the layer or data.vic.gov.au page and record it), `https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services/Vicmap_Admin/FeatureServer/10/query` with `where=1=1`, envelope `144.4,-38.55,145.9,-37.3` (inSR/outSR 4326), `outFields=name,abs_lga_code`, `maxAllowableOffset=0.001`, `geometryPrecision=4`, `f=geojson`: about 168 kB, 41 features. Keep only the Greater Melbourne councils plus neighbours for context, simplify and project to an SVG path set at build time (a plain equirectangular projection scaled by cos(latitude) is fine), and commit only the small generated output, never the raw query result. The build script is plain Node with `fetch` to that one host, run by hand like `scripts/build-places.mjs`.
SVG map of Greater Melbourne with the places from the current results plotted as round dots (checked and not-checked drawn differently, not by colour alone), the user's location as a distinct dot, tap or focus on a dot shows the place name, and a list stays the accessible source of truth. No requests to other hosts.

### Task 4: password instead of passcode (R1) [security-sensitive: hold for user approval]
Files: `packages/core/src/` (`validatePasscode` and tests), `src/ui/CreateProfile.tsx`, `src/ui/SignIn.tsx`, `src/auth/LocalAuthService.ts`, tests.
6 to 64 characters; the creation input has `maxLength={64}` and no numeric keypad; sign-in accepts old 4 to 8 digit passcodes; copy says password; the password is never stored, logged or kept in state after use.

### Task 5: welcome page with sign in, sign up and guest (R3) [security-sensitive: hold for user approval]
Files: `src/auth/Gate.tsx`, a new welcome screen in `src/auth/`, `src/ui/SignIn.tsx` (add "Browse as a guest"), tests.

### Task 7: copy diet and visual pass (R9)
Audit every screen for text bulk: Nearby place rows (notes, source lines, "cost not stated" paragraphs), Home, Budget, Food safety, Policy, footers and credits. Method: measure words per screen with a script over the rendered text, set a budget per screen, cut or move to disclosures, and replace sentences with icons or small visual cues (kind icon, price dots, access badge as an icon plus one word). Tests that assert exact copy are updated, not deleted; safety, privacy and source wording is shortened, never removed. Playwright before/after screenshots by the controller.

### Task 6: "Welcome, NAME" on the home screen (R4)
Files: the home views (`src/ui/CravingSearch.tsx` page or `NumberScreen.tsx`), `src/App.tsx`, tests.

## Waitlist (user, 2026-11-23)

Run after the craving expansion and the "where to get it" view. Keep working down this list without waiting for a verdict.

### Task 8: collapsible menu groups
Files: `src/ui/Menu.tsx` (exports `GROUPS`), its tests. Each group heading (Today, Money, Food, Help, About) becomes a disclosure button (`aria-expanded`, keyboard operable, round Plate styling, no cards or borders). Default: Today open, others closed; remember nothing sensitive (open state may live in memory only). Re-verify with Playwright at 390 and 1280 px.

### Task 9: pantry results show popular suggestions with pictures
Files: the Cook with what you have screens (`src/ui/` pantry and recipe views), `packages/core/src/recipes/`. After a person enters what they have, show popular recipe suggestions first, each with a picture. Pictures: not hotlinked or copied from recipe sites (copyright, and the app makes no third-party requests). Use a round sample icon per recipe by default; real photos only if CC0 from Wikimedia Commons via the taste skill's assets.mjs, previewed to the user first, and bundled locally. "Popular" needs a cited basis or stays an editorial pick labelled as such; no invented counts.
