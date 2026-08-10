# Quickstart: Validating Parameter Exploration & Sharing

**Feature**: `003-parameter-exploration` | **Date**: 2026-08-10

## Prerequisites

```bash
npm install
npm run dev   # http://localhost:3000/concepts/rag
```

Real Mode scenarios (2, 5) additionally need an OpenAI API key with
access to `text-embedding-3-small` -- never commit it; enter it only in
the running app's Real Mode prompt.

## 0. Regression pass (run first)

With this feature's controls untouched, re-run every manual scenario
and automated check from `specs/001-core-platform-rag-module/quickstart.md`
and `specs/002-real-mode/quickstart.md`. Nothing here should change
existing behavior when unused.

## Manual scenario validation (spec.md User Stories 1-3)

1. **US1 sweep renders and is navigable** (Acceptance Scenarios 1-2) --
   on the Retrieval step with the "coffee" document and its first
   sample query selected, activate the chunk-size sweep. Confirm a
   9-point curve renders (Simulated Mode: instantly, no confirmation
   step). Tab to a non-default point and press Enter; confirm the
   Chunking/Embedding/Retrieval views now reflect that exact chunk
   size, with the Retrieval step's own chunk/chart/results updating in
   place (no stepper jump).
2. **US1 Real Mode cost gate** (Acceptance Scenario 4, SC-005) -- with
   Real Mode active and a valid key, activate the sweep. Confirm an
   estimated call count (10 = 9 points + 1 shared query embed) is shown
   and no API call fires until the sweep is explicitly confirmed/started.
3. **US1 flat curve is labeled, not broken** (Acceptance Scenario 3) --
   pick a document/query combination where chunk size barely moves the
   top-1 score; confirm the curve renders with an explicit "doesn't
   move the outcome much here" caption rather than looking like an
   error or an empty chart.
4. **US2 permalink round-trip** (Acceptance Scenarios 1, 3; SC-003) --
   set a non-default chunk size, overlap, chunking strategy, threshold,
   Top-K, and question; generate a permalink; open it in a fresh private
   window with no prior state. Confirm every one of those six values
   matches exactly.
5. **US2 Real Mode params, no key required to view** (Acceptance
   Scenario 2-3) -- with Real Mode active and temperature/fusionN/
   hydeCount at non-default values, generate a permalink; inspect the
   URL directly (not just via the app) and confirm no API key substring
   appears anywhere in it. Open the link in a session with no key
   configured; confirm every parameter applies immediately and Real Mode
   shows active but prompts for a key before making any call.
6. **US2 custom document exclusion** (Acceptance Scenario 4) -- in Real
   Mode, paste a custom document, then generate a permalink; confirm the
   UI states the custom text is excluded, and that the generated link
   (when opened) does not attempt to reproduce it.
7. **US2 removed-document failure** (Edge Cases) -- manually craft a
   URL with `doc=nonexistent-id`; confirm the app shows a clear "this
   document no longer exists" message rather than silently loading a
   different document.
8. **US2 permalink during an active sweep** (Edge Cases) -- start a
   chunk-size sweep, and while it's still running (or, in Real Mode,
   while awaiting confirmation), generate a permalink. Confirm the
   resulting URL encodes only the pre-sweep chunk size/parameters --
   never a mid-sweep or partial-sweep snapshot.
9. **US3 failure presets** (Acceptance Scenarios 1-2) -- from any
   pipeline step, select "Threshold too strict"; confirm the app jumps
   to Retrieval showing zero results and an explanation naming the
   threshold value as the cause. Repeat for "Chunk too large" and
   "Chunk too small," confirming each explanation names chunk size
   specifically.
10. **US3 reset to defaults** (Acceptance Scenario 3) -- from a
    preset-loaded state, and separately from a mid-sweep state, activate
    "Reset to defaults"; confirm all parameters return to their original
    defaults in both cases.

## Automated checks (this feature's additions to `npm run check:all`)

```bash
npm run check:parameter-exploration
# = tsx scripts/checks/permalink-safety.ts
#   && tsx scripts/checks/failure-presets.ts
#   && playwright test tests/parameter-exploration/
```

- `permalink-safety.ts` (SC-002) -- calls `buildPermalinkParams` with a
  fixture containing a fake API key and custom document text; fails if
  either appears in the output.
- `failure-presets.ts` (SC-004) -- runs each shipped preset's exact
  configuration through the live chunking/embedding/ranking functions;
  fails if any preset's `expectedFailure` predicate no longer holds.
- `tests/parameter-exploration/sweep-keyboard-and-confirmation.spec.ts`
  -- Playwright, mocked provider: asserts every sweep point is
  Tab-reachable and Enter/Space-activatable (Constitution VII), and that
  a Real Mode sweep shows its call estimate and blocks calls until
  confirmed (SC-005).
- `tests/parameter-exploration/permalink-roundtrip.spec.ts` --
  Playwright: generates a permalink with non-default values, opens it in
  a fresh browser context, asserts every encoded parameter round-trips
  (SC-003).
- `tests/a11y/parameter-exploration.spec.ts` -- extends the existing
  `check:a11y` command (no new npm script) with axe + keyboard coverage
  for the sweep curve, permalink button, preset picker, and reset
  control.

See `contracts/sweep-contract.md`, `contracts/permalink-contract.md`,
and `contracts/failure-preset-contract.md` for the exact function
signatures these checks and specs exercise.
