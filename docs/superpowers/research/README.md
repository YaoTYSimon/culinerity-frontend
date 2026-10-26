# Research dataset

`2026-10-26-food-security-data.json` is the single source of every benchmark figure shown in Culinerity (the budget tracker and the Data and policy page). `2026-10-26-food-security-sources.md` is the research report it came from.

## Rules

- No invented numbers. Change a figure only after reading its source, and record the change (value, evidence, source) in the commit message.
- Every indicator has a `sourceId` that resolves to a source with an `https://` URL, a reference `year`, and a `verification`:
  - `primary`: read from the source itself
  - `secondary`: read from a research paper or report that reports it
  - `press`: press report only, not checked against the study
- `dated: true` marks figures that predate known changes; `isOlderData` also flags any figure more than five years before the current year.
- `note` is plain, user-facing text (what the figure means, its caveats). Remarks on how a figure was found (blocked pages, extraction, what was not opened) go in `research`, which is kept here and never shown.
- `notFound` items carry a `group` (`budget` or `policy`) so each screen lists only its own gaps.
- String-valued figures use `value: null` plus `display`.
- Different measures are never combined or put on one axis.

## Refreshing

1. Edit the JSON.
2. Run `npm run build:benchmarks`. It validates the dataset (unique ids, resolvable sources, https URLs, numeric values) and rewrites `packages/core/src/benchmarks/generated/benchmarks.generated.ts`.
3. Commit both files. A test regenerates the file in memory and fails if the committed copy is out of date.
