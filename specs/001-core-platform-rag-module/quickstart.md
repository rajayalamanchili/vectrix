# Quickstart: Validating Milestone 1

**Feature**: `001-core-platform-rag-module` | **Date**: 2026-08-03

Two layers: manual scenario walkthroughs (proving the spec's acceptance
scenarios work end-to-end) and the four automated checks this plan adds
(proving the tracked DoD gaps are closed). Run automated checks after
`npm install` picks up the new dev dependencies (`tsx`, `playwright`,
`@axe-core/playwright`) this plan introduces.

## Prerequisites

```bash
npm install
npm run dev   # http://localhost:3000
```

## Manual scenario validation (spec.md User Stories 1-3)

1. **US1 core pipeline** -- open the RAG module, pick a sample document,
   move through all five steps, confirm a ranked/scored result list and
   assembled prompt appear (spec.md US1 Acceptance Scenario 1-4).
2. **US1 threshold empties results (new, FR-013/SC-007)** -- pick the
   "coffee" sample document, ask its first listed sample query, then on
   the Retrieval step raise the similarity-threshold slider above that
   query's top-ranked chunk's score (the pinned SC-007 fixture) until
   the retrieved list becomes empty and the chart shows no highlighted
   chunk.
3. **US1 chunking-strategy changes boundaries (new, FR-014/SC-008)** --
   on the "coffee" sample document at chunk size 60 (default, the pinned
   SC-008 fixture), on the Chunking step, toggle from fixed-size to
   sentence-boundary at that same chunk-size value and confirm the chunk
   boundaries visibly differ.
4. **US1 document-switch reset (new, per `/speckit.clarify`)** -- get
   retrieval results for one document, go back to the Document step,
   switch to the other sample document, and confirm the stepper returns
   to Document, the previous query/results no longer appear anywhere
   downstream, and keyboard focus lands on the newly active document's
   selector chip (FR-011 focus-management rule, added 2026-08-04).
5. **US1 focus after a stepper jump (new, FR-011, added 2026-08-04)** --
   using only the keyboard, jump the stepper directly from Document to
   Retrieval (skipping Chunking/Embedding), and confirm focus lands on
   the Retrieval step's first interactive control (the query input), not
   left on the stepper navigation.
6. **US2 home page discovery** -- load `/`, confirm the RAG module card
   shows title/tagline/category/time and navigates correctly.
7. **US3 compare variants** -- open Compare Variants, select two
   variants, confirm side-by-side detail, then select a third and
   confirm FIFO replacement (spec.md US3 Acceptance Scenario 3).
8. **US1 non-color chart distinction (new, FR-005, added 2026-08-04)** --
   on the Embedding or Retrieval step, use browser DevTools to emulate a
   color-vision deficiency (Chrome/Edge: Rendering tab → "Emulate vision
   deficiencies") or a grayscale filter, and confirm highlighted
   chunk/query points on the chart remain distinguishable from
   non-highlighted points by shape, size, or an adjacent label -- not by
   hue alone.

## Automated checks (this plan's new work)

```bash
npm run check:extensibility   # SC-002 -- exits 0 if no cross-module conditionals AND all conceptRegistry ids are unique (FR-001)
npm run check:disclosure      # SC-003 -- exits 0 if every simulated surface discloses
npm run check:a11y            # SC-005 -- exits 0 if 100% controls are keyboard-operable
npm run check:determinism     # SC-006 -- exits 0 if 10 runs produce identical ranking
npm run check:all             # runs all four, non-zero exit if any fails
```

Each script's pass/fail contract is documented in
`contracts/automated-checks-contract.md`. A failing script prints the
offending file/line (extensibility, disclosure), selector (a11y), or
diverging run (determinism) -- there should be no need to read the
script source to interpret a failure.

## Expected outcome

All eight manual scenarios behave as described, and all four `npm run
check:*` commands exit `0`. That combination is what closes Milestone
1's Definition of Done per roadmap.md (as corrected 2026-08-03) plus the
2026-08-04 additions: the SC-002/003/005 automated-check gap, the SC-006
re-verification gap, the FR-013/FR-014 build gap, FR-001's registry
id-uniqueness rule (folded into `check:extensibility`), and the
accessibility-checklist-driven FR-005/FR-011 closure (scenarios 5 and 8
above, plus `check:a11y`'s expanded assertions covering the rest).
