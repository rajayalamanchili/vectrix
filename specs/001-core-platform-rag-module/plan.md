# Implementation Plan: Core Extensible Platform + RAG Concept Module

**Branch**: `001-core-platform-rag-module` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-core-platform-rag-module/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The `ConceptModule` contract, central registry, and RAG module (Pipeline
Walkthrough + Compare Variants) were already prototyped and are running
in `src/`. This plan does not re-architect that work; it closes
Milestone 1's Definition of Done as corrected in roadmap.md on
2026-08-03: (1) build the two confirmed-missing controls, FR-013
(similarity-threshold) and FR-014 (chunking-strategy toggle), plus the
document-switch/strategy-switch stale-state reset resolved during
`/speckit.clarify`; and (2) close the three tracked verification gaps
(SC-002, SC-003, SC-005 automated checks; SC-006 re-verification) with
four small, purpose-built scripts rather than a full test-framework
rollout, deferring that broader decision to Milestone 6 per roadmap.md.

## Technical Context

**Language/Version**: TypeScript 5, Node.js (Next.js 16 runtime)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind
CSS v4 -- all per tech-stack.md (locked). New dev-only dependencies added
by this plan: `tsx` (run standalone TS check scripts), `playwright` +
`@axe-core/playwright` (SC-005 keyboard/accessible-name check -- see
research.md and the tech-stack.md amendment accompanying this plan).

**Storage**: N/A -- client-side only, no persistence, no backend (per
spec.md Assumptions).

**Testing**: Four standalone checks (`scripts/checks/*.ts` run via `tsx`
for SC-002/SC-003/SC-006; two Playwright specs for SC-005, one per view
so each story stays independently testable), each with an independent
pass/fail contract -- see `contracts/automated-checks-contract.md` and
`research.md`'s "Testing approach" decision. Existing manually-driven
Playwright screenshot verification (SC-001, SC-004) continues unchanged.

**Target Platform**: Static-exportable Next.js web app, evaluated in a
desktop browser as primary target, degrading usably to a 375px-wide
mobile viewport (SC-004).

**Project Type**: Single Next.js project (web), client-only -- no
frontend/backend split.

**Performance Goals**: None beyond feeling instant -- all computation
(chunking, mock embedding, cosine similarity) is synchronous, client-side,
over two hardcoded documents of a few hundred words each. No throughput
or latency budget is meaningful at this scale.

**Constraints**: Deterministic output for fixed inputs (Constitution
Principle V, SC-006); simulated-behavior disclosure visible in the
rendered UI, not just code comments (Principle II, SC-003); zero
per-concept conditionals outside a concept's own folder (Principle I,
SC-002); 100% keyboard operability with accessible names (Principle VII,
SC-005); reduced-motion respected (FR-012); usable down to 375px (SC-004).

**Scale/Scope**: 2 sample documents (~150-200 words each), 3 sample
queries per document, 6 RAG variants (naive + 5), 5 pipeline steps, 2
views (Pipeline Walkthrough, Compare Variants). Single-learner, single
session, no accounts, no cross-session state.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Extensibility Is Structural | PASS | Contract + registry already exist and are followed by the sole module (RAG); SC-002's automated regression check is this plan's own deliverable, not a gap left open by it. |
| II. Never Blur Simulated vs Real | PASS | `EmbeddingStep`/`GenerationStep` already carry disclosure prose; this plan adds a stable `data-simulated-disclosure` marker (data-model.md) so SC-003 can verify it automatically instead of by inspection. |
| III. Every Interaction Teaches Something | PASS | New controls (threshold slider, strategy toggle) each map to a specific spec.md Marginalia teaching point (FR-013/FR-014) already written and clarified -- not added for their own sake. |
| IV. Guided, Not Just Dense | PASS | New controls live inside the existing stepped, Marginalia-annotated layout; no new unguided surface introduced. |
| V. Deterministic By Default | PASS | New sentence-boundary chunking function is pure/seed-free like the existing `chunkText`; SC-006's automated re-verification is this plan's deliverable. |
| VI. Spec Before Code | PASS | spec.md is approved and clarified (2026-08-03) before this plan; the one documented exception (initial prototype preceding the spec) is historical, not repeated here. |
| VII. Accessible and Reduced-Motion by Default | PASS | Existing controls already use native `<input type="range">`/`<button>` with `aria-label`; SC-005's automated check (this plan) verifies that stays true as new controls are added, rather than taking it on faith. |

**Technology Constraints gate** (tech-stack.md): This plan adds `tsx`,
`playwright`, and `@axe-core/playwright` as dev dependencies. Per the
constitution's rule that a plan deviating from tech-stack.md must amend
it first, tech-stack.md's Testing & quality table is updated alongside
this plan (see repo diff) to record this decision, narrowing --  but not
closing -- the "testing framework not yet decided" line, which still
applies to Milestone 6's broader, CI-wide framework choice.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-platform-rag-module/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── concept-module-contract.md
│   └── automated-checks-contract.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Existing structure (unchanged in shape, extended with new files/fields
below):

```text
src/
├── app/
│   ├── page.tsx                          # Home page -- reads conceptRegistry only
│   └── concepts/[conceptId]/page.tsx      # Dynamic route -- reads conceptRegistry only
├── lib/
│   ├── concept-types.ts                   # ConceptModule contract
│   └── concept-registry.ts                # The one central registry array
├── components/
│   ├── ui/ (Panel, Badge, Slider, StepperNav)
│   └── charts/ (StarChart, FlowDiagram)
└── concepts/rag/
    ├── meta.ts, RagConcept.tsx
    ├── lib/
    │   ├── sampleDocs.ts                  # + chunkTextBySentence() (new), Chunk.strategy field (new)
    │   └── mockEmbedding.ts               # unchanged
    ├── pipeline/
    │   ├── PipelineWalkthrough.tsx        # + chunkingStrategy/similarityThreshold state, reset effect (new)
    │   └── steps/
    │       ├── DocumentStep.tsx           # unchanged
    │       ├── ChunkingStep.tsx           # + strategy toggle UI (new)
    │       ├── EmbeddingStep.tsx          # + data-simulated-disclosure marker (new)
    │       ├── RetrievalStep.tsx          # + threshold slider, filter-then-slice order (new)
    │       └── GenerationStep.tsx         # + data-simulated-disclosure marker (new)
    └── variants/ (VariantsComparison.tsx, variantData.ts)   # unchanged

scripts/checks/                            # (new) SC-002/003/006 standalone scripts
├── no-cross-module-conditionals.ts
├── simulated-disclosure.ts
└── determinism.ts

tests/a11y/                                # (new) SC-005 Playwright specs, split per view
├── pipeline-walkthrough.spec.ts           # Pipeline Walkthrough controls, incl. new strategy toggle + threshold slider
└── compare-variants.spec.ts               # Compare Variants controls
```

**Structure Decision**: No structural change to the existing single
Next.js project (Option 1, single project, adapted for a client-only
web app -- no `backend/`/`frontend/` split needed since there is no
backend). New work is additive: two new top-level directories
(`scripts/checks/`, `tests/a11y/`) for the four automated checks, plus
targeted edits inside `src/concepts/rag/` for the two new controls and
the disclosure marker. No file outside `src/concepts/rag/` and the
already-registry-only `src/app/page.tsx` / `src/app/concepts/[conceptId]/page.tsx`
is touched, preserving the extensibility contract this plan is itself
verifying.

## Complexity Tracking

*No Constitution Check violations -- table intentionally empty.*
