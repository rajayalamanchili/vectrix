# Contract: Milestone 1 automated checks (SC-002, SC-003, SC-005, SC-006)

**Status**: New, this plan. Each check is a standalone script/spec with a
pass/fail exit code, runnable individually via `npm run check:*` and
collectively via `npm run check:all`. None depend on each other. This is
a deliberately minimal contract -- Milestone 6 may later re-wire these
into whatever CI-formalized test framework it chooses; that framework
only needs to keep satisfying the same four pass/fail contracts below,
not this plan's specific file layout.

## `check:extensibility` -- `scripts/checks/no-cross-module-conditionals.ts`

- **Input**: `src/app/page.tsx`, `src/app/concepts/[conceptId]/page.tsx`,
  `src/lib/concept-registry.ts`, `src/lib/concept-types.ts`.
- **Rule**: fail if any input file contains a string/regex match for a
  per-concept-id conditional pattern (e.g. `=== "rag"`, `case "rag":`,
  or any literal concept id from `conceptRegistry` used in a comparison)
  -- per FR-002 (2026-08-03), this means a hardcoded-literal-id
  comparison specifically. Comparisons against a runtime-supplied id
  (`c.id === id` inside `getConcept(id)`) are not per-concept
  conditionals and MUST NOT be flagged, since no concept's specific id
  is named.
- **Exit code**: `0` = no conditionals found (SC-002 satisfied). `1` =
  at least one match, printed with file + line.
- **Supports**: SC-002, FR-002.

## `check:disclosure` -- `scripts/checks/simulated-disclosure.ts`

- **Input**: `EmbeddingStep` and `GenerationStep`, rendered via
  `react-dom/server`'s `renderToStaticMarkup` with minimal fixture props.
- **Rule**: fail if any rendered output is missing an element with
  `data-simulated-disclosure="true"` and non-empty text content.
- **Exit code**: `0` = every simulated-behavior surface discloses. `1` =
  at least one surface is missing or has an empty disclosure element.
- **Supports**: SC-003, FR-005, FR-007, Constitution Principle II.

## `check:a11y` -- `tests/a11y/pipeline-walkthrough.spec.ts` + `tests/a11y/compare-variants.spec.ts` (Playwright)

Two spec files, one per view, so each remains independently runnable and
each story (US1, US3) owns its own file per tasks.md's story-independence
organization -- `npm run check:a11y` (`playwright test tests/a11y/`) runs
both together and the contract below applies to their combined result.

- **Input**: the running app -- `pipeline-walkthrough.spec.ts` covers the
  Pipeline Walkthrough view (including the strategy toggle and
  similarity-threshold slider); `compare-variants.spec.ts` covers the
  Compare Variants view.
- **Rule**: fail if (a) `Tab` cannot reach every interactive control
  (slider, stepper step, toggle, button) in DOM order, (b) `Enter`/`Space`
  does not activate a focused button/toggle, or (c) `@axe-core/playwright`
  reports any element missing an accessible name.
- **Exit code**: `0` = both specs pass, i.e. 100% of controls in both
  views are keyboard-operable with accessible names (SC-005 satisfied).
  `1` = any control in either spec fails (a), (b), or (c), printed with
  the control's selector and which spec file it came from.
- **Supports**: SC-005, FR-011, Constitution Principle VII.

## `check:determinism` -- `scripts/checks/determinism.ts`

- **Input**: one fixed `(docId, chunkSize, overlap, chunkingStrategy,
  query)` fixture tuple.
- **Rule**: run `chunkText`/`chunkTextBySentence` → `embed` →
  `cosineSimilarity` → rank, ten times against the identical input; fail
  if any run's ranked `(chunkId, score)[]` output differs, by strict
  equality, from run 1's.
- **Exit code**: `0` = all ten runs byte-for-byte identical (SC-006
  satisfied). `1` = at least one run diverged, printed with the diverging
  run index and the first differing entry.
- **Supports**: SC-006, Constitution Principle V.
