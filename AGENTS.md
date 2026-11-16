# Ascendance of a Brush

A deterministic painter, a client-only web app: it turns an uploaded image, or a selection of it, into a painting made of brush strokes. The same source, settings and seed always give the same painting.

## Reference implementation

`docs/reference/brush-bench.html` is the approved prototype. Its inline `<script>` is the source of truth for the planner, both brushes, the analysis and the metrics. Port its behavior exactly, PRNG draw order included. The user approved its brushes as final, so a difference from the prototype is a bug unless an ADR says otherwise. Read the matching ADR before changing any engine behavior. `docs/adr/` records every settled decision and every rejected approach.

## Determinism rules

- Randomness comes only from the seeded PRNG (`rngFrom(seed, salt)`). oxlint rejects `Math.random`.
- Each stroke carries its own seed. Drawing a stroke never reads shared PRNG state.
- Pixel hashes are compared within one browser engine only (Chromium in tests). See ADR-0003.

## Tests

Two Vitest projects, chosen by file name:

- `*.test.ts` runs in Node (`unit`). Pure math goes here. The pre-commit hook runs this lane.
- `*.browser.test.ts` runs in headless Chromium (`browser`). Anything that reads canvas pixels, uses OffscreenCanvas or spawns a Worker goes here. CI runs both lanes.

Engine changes ship with fixed-seed hash tests and metric threshold tests (ADR-0008). Fixtures must be redistributable (ADR-0015).

`pnpm check` runs everything CI runs. If Playwright's Chromium is missing locally, install it with `pnpm exec playwright install chromium`.

## Planning artifacts

Plans, specs and working notes go in `docs/plans/`, which is gitignored. Glossary and ADRs are committed.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on M4ss1ck/ascendance-of-a-brush, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
