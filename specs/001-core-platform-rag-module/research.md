# Phase 0 Research: Core Extensible Platform + RAG Concept Module

**Feature**: `001-core-platform-rag-module` | **Date**: 2026-08-03

This milestone was prototyped before this plan was written (see
roadmap.md's "A note on sequencing"), so most of the Technical Context is
observed from the existing codebase rather than newly chosen. The
research below covers only what remains genuinely undecided: how to
close the three tracked Milestone-1 gaps (SC-002, SC-003, SC-005
automated checks; SC-006 re-verification) and how to build the two
missing controls confirmed unimplemented during `/speckit.clarify`
(FR-013 similarity-threshold, FR-014 chunking-strategy toggle).

## Decision: Testing approach for SC-002 (extensibility), SC-003 (disclosure), SC-005 (accessibility)

**Decision**: Three narrowly-scoped, standalone check scripts, not a
project-wide test framework:

- `scripts/checks/no-cross-module-conditionals.ts` (SC-002) -- a plain
  Node/TypeScript script (run via `tsx`) that reads the home page,
  concept-registry, and dynamic route files as text and fails if any
  contains a per-concept-id conditional (regex for patterns like
  `id === "rag"` or `case "rag"` outside `src/concepts/*/`). No new
  runtime dependency beyond `tsx`.
- `scripts/checks/simulated-disclosure.ts` (SC-003) -- renders
  `EmbeddingStep` and `GenerationStep` with `react-dom/server`'s
  `renderToStaticMarkup` (no browser needed, since disclosure is static
  text, not an interaction) and asserts every element carrying the new
  `data-simulated-disclosure` marker (see data-model.md) has non-empty
  text content.
- `tests/a11y/keyboard-operability.spec.ts` (SC-005) -- a Playwright
  spec, using real keyboard events (`Tab`, `Enter`, `Space`) to confirm
  every control in the Pipeline Walkthrough and Compare Variants views
  is reachable and operable by keyboard alone, plus `@axe-core/playwright`
  for the "has an accessible name" half of the requirement.

**Rationale**: tech-stack.md explicitly deferred the testing-framework
decision to "when SC-002/003/005's automated checks are actually built"
-- that's now. But roadmap.md's Milestone 6 is explicitly scoped to
formalize *all* prior milestones' verification into one chosen framework
wired into CI. Committing to a full framework now would either duplicate
that work or lock in a choice Milestone 6 would need to unwind. Three
small, purpose-built scripts close Milestone 1's specific DoD gap without
pre-empting that later decision. Playwright is not a new choice -- it is
already named in tech-stack.md as the project's behavioral-verification
tool, just "driven manually" until now; SC-005 is the first check that
genuinely needs real browser keyboard/focus behavior, which SSR-based
checks can't provide, so this is the minimal, justified case for
promoting it from manual to committed.

**Alternatives considered**:
- *Vitest + Testing Library for all three*: rejected for SC-005
  specifically -- jsdom's focus/tab-order emulation is not a reliable
  proxy for real keyboard operability, which is exactly what SC-005
  measures.
- *One Playwright suite for all three checks*: rejected as heavier than
  necessary for SC-002 (pure static text scan) and SC-003 (pure static
  render); adding a browser dependency to checks that don't need one
  increases CI time and flakiness surface for no accuracy gain.
- *Deferring all three checks to Milestone 6*: rejected -- roadmap.md is
  explicit that these are Milestone 1's own Definition-of-Done gap, not
  Milestone 6 scope; Milestone 6 formalizes verification for Milestones
  1-5 collectively, it doesn't newly invent Milestone 1's.

**tech-stack.md amendment**: This decision amends tech-stack.md's
Testing & quality table (the SC-002 row) and narrows -- but does not
close -- the "testing framework... not yet decided" line: the general,
project-wide framework choice for Milestone 6 remains open; only these
three Milestone-1-scoped checks are now decided. See tech-stack.md diff
accompanying this plan.

## Decision: SC-006 (determinism) re-verification method

**Decision**: A fourth, even smaller script,
`scripts/checks/determinism.ts`, that runs the pure retrieval-ranking
function (`embed` + `cosineSimilarity` composed over `chunkText`) ten
times against the same fixed document/chunk-settings/query fixture and
asserts byte-for-byte identical ranked output each time.

**Rationale**: SC-006 only concerns the pipeline's pure computation
(chunking → embedding → similarity ranking), which has zero DOM or
browser dependency -- it doesn't need Playwright or SSR, just ten calls
to already-exported, already-pure functions. This is the cheapest
possible way to convert "not yet explicitly re-verified" into a real,
repeatable regression check, and it composes with the same `tsx`
mechanism as the SC-002 script above, adding no new dependency.

**Alternatives considered**: A Playwright-driven UI re-run (load the
page ten times, screenshot/compare) -- rejected as far more expensive
and indirect than testing the pure function directly, and the constitution's
determinism principle (V) is about the computation, not the rendering.

## Decision: FR-013 (similarity-threshold) and FR-014 (chunking-strategy toggle) implementation

**Decision**: Build both now, per the `/speckit.clarify` outcome
confirming they're required Milestone-1 scope, using the algorithms
already resolved during clarification:
- Similarity threshold: a second `Slider` (0.00-1.00, step 0.01, default
  0) in `RetrievalStep.tsx`, filtering `ranked` before `topK` slicing
  rather than after, so an empty result is reachable independent of
  Top-K (per FR-013 and SC-007).
- Chunking strategy: a two-option toggle (`fixed` | `sentence`) in
  `ChunkingStep.tsx`, driving a new `chunkTextBySentence(text, chunkSize,
  overlap)` function in `sampleDocs.ts` alongside the existing
  `chunkText` (renamed conceptually to "fixed-size" but kept as-is to
  avoid an unnecessary rename), implementing the greedy
  sentence-grouping algorithm resolved in `/speckit.clarify`.

**Rationale**: Already resolved in spec.md via clarification; no further
research needed beyond confirming where each control's state should
live, which is `PipelineWalkthrough.tsx` (the existing lifted-state
parent), consistent with tech-stack.md's "lifted to the smallest common
parent" state-management choice.

**Alternatives considered**: None -- the clarify session already
resolved the open design questions (range/scale, algorithm); this
section exists only to record where in Technical Context this
information originates.

## Decision: Document-switch and strategy-switch stale-state reset

**Decision**: A single `useEffect` in `PipelineWalkthrough.tsx` keyed on
`docId` and `chunkingStrategy` that resets `query`, `results`, and
`stepIndex` back to their defaults (empty query, empty results, step 0)
whenever either changes, implementing both the pre-existing
chunking-strategy edge case and the newly clarified document-switch edge
case with one mechanism rather than two.

**Rationale**: Both edge cases in spec.md describe the identical failure
mode (stale retrieval/generation state computed from a chunk set that no
longer exists) and the identical resolution (reset to defaults). A
single effect keyed on both dependencies is simpler than two separate
handlers and structurally guarantees they can't drift apart.

**Alternatives considered**: Resetting only `results` and leaving `query`
intact -- rejected because it was explicitly not the option chosen during
`/speckit.clarify` for the document-switch case, and using a different
reset scope for the two cases would reintroduce the inconsistency
`/speckit.clarify` was resolving.
