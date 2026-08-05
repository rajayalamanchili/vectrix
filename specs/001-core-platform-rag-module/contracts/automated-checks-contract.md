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
- **Rule (per-concept conditionals)**: fail if any input file contains a
  string/regex match for a per-concept-id conditional pattern (e.g.
  `=== "rag"`, `case "rag":`, or any literal concept id from
  `conceptRegistry` used in a comparison) -- per FR-002 (2026-08-03),
  this means a hardcoded-literal-id comparison specifically. Comparisons
  against a runtime-supplied id (`c.id === id` inside `getConcept(id)`)
  are not per-concept conditionals and MUST NOT be flagged, since no
  concept's specific id is named.
- **Rule (registry id uniqueness, added 2026-08-04)**: fail if
  `conceptRegistry` (imported from `src/lib/concept-registry.ts`)
  contains two or more entries with the same `id` -- per FR-001 and its
  Edge Case. This is a plain array inspection (`Set` size vs. array
  length), not a text scan, and runs as part of the same script/exit
  code since both rules concern the same registry contract.
- **Exit code**: `0` = no conditionals found AND all ids unique (SC-002
  and FR-001 satisfied). `1` = at least one conditional match (printed
  with file + line) or at least one duplicate id (printed with the
  offending id and its entries' positions in the array).
- **Supports**: SC-002, FR-001, FR-002.

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
  Compare Variants view. Both run `@axe-core/playwright` against its
  default ruleset, which targets WCAG 2.1 A/AA.
- **Rule** (expanded 2026-08-04 to match FR-011's rewrite): fail if any
  control in FR-011's canonical enumeration (the chunk-size, overlap,
  Top-K, and similarity-threshold sliders; the stepper's step buttons;
  the view tabs; the chunking-strategy toggle; sample-document and
  sample-query chips; variant cards; and all other buttons) fails any
  of:
  - (a) `Tab` cannot reach it in DOM order;
  - (b) it lacks a visible focus indicator (minimum 2px outline, at
    least 3:1 contrast against its adjacent background);
  - (c) `Enter`/`Space` does not activate a focused button, tab, or
    toggle option, or an Arrow key does not adjust a focused slider or
    move the stepper by an amount matching that control's stated `step`;
  - (d) `@axe-core/playwright` reports it missing an accessible name, or
    the name is a generic control-type label (e.g. "Slider") shared
    across multiple same-type controls rather than purpose-specific;
  - (e) it is disabled (e.g. Back/Next at a pipeline boundary) but still
    reachable via Tab (native `disabled` state not applied).

  Additionally (Pipeline Walkthrough spec only, depends on tasks.md's
  Phase 6.5): fail if (f) focus does not move to the newly active step's
  first interactive control after a stepper jump (T055); (g) focus does
  not move to the document-selector chip after the document/strategy-switch
  auto-reset (T056); or (h) the empty-retrieved-list message is not
  within a reachable landmark or heading (T057).

  Additionally (Compare Variants spec only): fail if (i) the
  FIFO-replacement interaction on a third variant selection is not
  reachable/operable via keyboard identically to the first two
  selections (FR-009).
- **Exit code**: `0` = both specs pass, i.e. 100% of controls in both
  views are keyboard-operable with accessible names per the rules above
  (SC-005 satisfied). `1` = any control in either spec fails any rule,
  printed with the control's selector, the failing rule letter, and
  which spec file it came from.
- **Supports**: SC-005, FR-009, FR-011, Constitution Principle VII.

Note: this contract does not cover FR-005's non-color chart-marker
requirement (highlighted points must be distinguishable by more than
color) -- that is verified manually, not by this automated check; see
quickstart.md step 7 and tasks.md T036.

## `check:determinism` -- `scripts/checks/determinism.ts`

- **Input**: SC-006's pinned fixture (2026-08-04) -- `docId: "coffee"`,
  `chunkingStrategy: "fixed"`, `chunkSize: 60`, `overlap: 15`, `query`:
  the "coffee" document's first listed sample query.
- **Rule**: run `chunkText`/`chunkTextBySentence` → `embed` →
  `cosineSimilarity` → rank, ten times against the identical input; fail
  if any run's ranked `(chunkId, score)[]` output differs, by strict
  equality, from run 1's.
- **Exit code**: `0` = all ten runs byte-for-byte identical (SC-006
  satisfied). `1` = at least one run diverged, printed with the diverging
  run index and the first differing entry.
- **Supports**: SC-006, Constitution Principle V.
