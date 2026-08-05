# Implementation Plan: Real Mode for the RAG Concept Module

**Branch**: `002-real-mode` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-real-mode/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Layers an opt-in Real Mode onto the existing Milestone 1 RAG module:
real embeddings/generation via a provider-agnostic abstraction
(`ProviderConfig` + `RealModeProvider`, shipping one default adapter
targeting OpenAI -- see research.md; the projection method and provider
are disclosed, mirroring Simulated Mode's disclosure requirement),
learner-supplied documents/questions, a learner-adjustable temperature
control, genuinely executable HyDE and RAG-Fusion variants with their
intermediate steps surfaced and their key parameters (hypothesis count,
query-variant count) learner-adjustable, and a lightweight recall@K
evaluation against learner-defined (question, expected chunk) pairs.
Simulated Mode stays fully intact and unaffected -- every new prop
defaults to an inactive Real Mode session, which is what makes that
regression guarantee structural rather than a separate code path to
maintain. No new npm dependency is introduced: real API calls use native
`fetch`, and the 2D projection is a hand-rolled PCA function matching
the existing `mockEmbedding.ts` style. `/speckit.clarify` (2026-08-05)
resolved five ambiguities before this plan: an explicit accessibility
FR/SC for Real Mode's new controls (FR-015/SC-009), custom-document
input scoped to paste-only (no upload), the eval's K reusing the
pipeline's existing Top-K rather than a separate parameter, FR-010's
cost indication scoped to call-count only (no dollar figure -- that's
Milestone 4 scope), and a 10,000-character document size limit. See
`research.md` for the technical decisions this plan itself resolves
(provider choice, projection method, key storage, call-count formulas,
HyDE/RAG-Fusion retrieval mechanics, and the testing approach for the
new/extended Success Criteria).

## Technical Context

**Language/Version**: TypeScript 5, Node.js (Next.js 16 runtime) --
unchanged from Milestone 1.

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind
CSS v4 -- all per tech-stack.md (locked), unchanged. No new runtime
dependency: real API calls use native `fetch`; the 2D projection uses a
hand-rolled PCA function (power iteration), matching `mockEmbedding.ts`'s
existing hand-rolled-math style rather than adding a math/ML library
(see research.md). Existing dev dependencies (`tsx`, `playwright`,
`@axe-core/playwright`) are reused for this feature's new checks/specs;
no new dev dependency either.

**Storage**: N/A for persistence -- still no backend/database (per
spec.md 002 Assumptions). The API key is held in-memory-only React state
(not `sessionStorage`/`localStorage`), scoped to `RagConcept.tsx`'s
component lifetime, so it's trivially cleared on tab close or hard
refresh -- see research.md's key-storage decision (supports SC-006).

**Testing**: Extends Milestone 1's four-check pattern rather than
replacing it: `check:disclosure` gains a real-mode-disclosure rule
(FR-004), a new `check:key-isolation` (static + Playwright network-
capture halves, SC-006), a new `check:real-mode` (three mocked-provider
Playwright specs, SC-004/SC-007/SC-008), and `check:a11y` gains a third
spec file for Real Mode's new controls (SC-009, FR-015).
`check:extensibility` and `check:determinism` need no new rules (see
research.md's scope note). All automated specs mock the provider's HTTP
responses via Playwright route interception -- deterministic, free,
CI-safe. One real end-to-end run against the actual shipped provider
(OpenAI) is a manual verification task (tasks.md), not part of the
automated/CI suite, since committing a real API key to CI is out of
scope.

**Target Platform**: Same as Milestone 1 -- static-exportable Next.js
web app, desktop browser primary, usable down to 375px.

**Project Type**: Single Next.js project (web), client-only. Real
Mode's API calls go straight from the learner's browser to the
configured provider -- no new backend route is introduced (per spec.md
002 Assumptions; verified structurally by `check:key-isolation`'s static
half).

**Performance Goals**: None beyond feeling responsive for local
computation (chunking, cosine ranking, PCA projection all synchronous
over a handful of chunks); real API call latency is provider-dependent
and outside this project's control. SC-003's 60-second budget is the
only latency-adjacent target, dominated by the learner's own
API-key-entry time, not computation.

**Constraints**: SC-001/SC-002 (002-spec) (Simulated Mode must stay
byte-for-byte unaffected -- enforced by every new prop defaulting to an
inactive/undefined Real Mode session); SC-006 (API key never reaches a
first-party server/log -- the one requirement in this feature with a
real security consequence if wrong, verified not assumed); FR-004 (real-
mode disclosure, mirroring not just removing Simulated Mode's); FR-015/
SC-009 (keyboard operability + accessible names for every new control,
same bar as Milestone 1's FR-011); FR-005 (10,000-character document
limit enforced client-side before any API call).

**Scale/Scope**: One `ProviderConfig` shipped, wired in, and end-to-end
tested (OpenAI, see research.md), behind a provider-agnostic
`RealModeProvider` abstraction general enough that another
OpenAI-compatible endpoint is a config change, not new code; two views
extended (Pipeline Walkthrough, Compare Variants); one new provider-
abstraction module; 3 of 6 variants made genuinely executable (naive,
HyDE, RAG-Fusion); a
small learner-defined `EvalPair` set. Single-learner, single session, no
accounts, no cross-session persistence -- unchanged from Milestone 1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Extensibility Is Structural | PASS | All new code lives inside `src/concepts/rag/` (a new `realMode/` subfolder plus edits to existing RAG-only files); no core file (`page.tsx`, dynamic route, `concept-registry.ts`, `concept-types.ts`) is touched. `check:extensibility`'s existing regression gate (SC-001, 002-spec) needs no new rule and continues passing. |
| II. Never Blur Simulated vs Real | PASS | FR-004/FR-006 require visible real-mode disclosure mirroring (not removing) Simulated Mode's -- `check:disclosure` is extended, not replaced, to assert both a `data-simulated-disclosure` marker (Simulated Mode) and a `data-real-disclosure` marker (Real Mode) are present with content. |
| III. Every Interaction Teaches Something | PASS | Every new control maps to a named spec.md FR/SC: temperature -> FR-012/SC-007 (sampling stochasticity), RAG-Fusion N -> FR-013/SC-008 (query-phrasing robustness), HyDE hypothesis count -> FR-014 (hypothesis agreement/disagreement). No control added without a stated teaching point. |
| IV. Guided, Not Just Dense | PASS | Real Mode controls live inside the existing stepped/Marginalia layout (Pipeline Walkthrough) and the existing card-based layout (Compare Variants) -- no new unguided settings panel. |
| V. Deterministic By Default | PASS | Simulated Mode's pipeline is untouched. Real Mode's own local computations (PCA projection, cosine ranking, recall@K scoring) are pure functions of their inputs, deterministic by construction given fixed embedding vectors -- but the live API response itself isn't guaranteed byte-identical run-to-run, which spec.md 002's Edge Cases already correctly acknowledge for temperature. Principle V governs *simulated* behavior specifically; Real Mode is by definition not simulated, so this is a documented scope boundary (research.md), not a violation. |
| VI. Spec Before Code | PASS | spec.md 002 is drafted and clarified (2026-08-05, five ambiguities resolved) before this plan. |
| VII. Accessible and Reduced-Motion by Default | PASS | FR-015/SC-009 (added during `/speckit.clarify`) require every new Real Mode control to match Milestone 1's FR-011 keyboard/accessible-name bar. `tests/a11y/real-mode.spec.ts` (this plan's deliverable) verifies it, not a gap left open. |

**Technology Constraints gate** (tech-stack.md): This plan adds a "Real
Mode AI behavior" table (a provider-agnostic `ProviderConfig` +
`RealModeProvider` abstraction, one default adapter shipped targeting
OpenAI, hand-rolled PCA, in-memory key storage) and extends the Testing
& quality table with the new/extended checks. tech-stack.md is amended
alongside this plan (see repo diff), per the constitution's rule that a
plan deviating from it must amend it first. No new npm dependency is
introduced, so the "no charting library / state library without
justification" bar isn't triggered at all -- the substantive amendment
is naming a provider where spec.md 002's Assumptions had deliberately
left that as a plan-level decision.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-real-mode/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── real-mode-provider-contract.md
│   └── real-mode-automated-checks-contract.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Existing structure (unchanged in shape), extended additively:

```text
src/concepts/rag/
├── RagConcept.tsx                         # + lifted RealModeSession/GenerationParams state, RealModeToggle render (edit)
├── realMode/                              # (new) Real Mode-only code, RAG-scoped
│   ├── types.ts                           # RealModeSession, ProviderConfig, RealModeError, RealEmbeddingResult, VariantExecutionTrace, EvalPair, RecallResult, GenerationParams
│   ├── providerConfigs.ts                 # the one shipped ProviderConfig value (OpenAI) -- adding a config is editing this file, not adapter code
│   ├── openaiCompatibleProvider.ts        # RealModeProvider impl, takes a ProviderConfig -- embedBatch()/generate() (contracts/real-mode-provider-contract.md)
│   ├── pca.ts                             # hand-rolled 2-component PCA projection (deterministic power iteration)
│   ├── callEstimate.ts                    # FR-010/FR-013 call-count formulas (M+3, N+3), pure functions
│   ├── RealModeToggle.tsx                 # toggle + API-key prompt + format pre-validation (FR-002/FR-003)
│   ├── ErrorBanner.tsx                    # FR-007 error + fallback-to-Simulated-Mode UI, shared by both views
│   └── CustomDocumentInput.tsx            # FR-005 paste + 10,000-char limit, shared component, independent state per view
├── lib/
│   ├── sampleDocs.ts                      # unchanged
│   └── mockEmbedding.ts                   # unchanged
├── pipeline/
│   ├── PipelineWalkthrough.tsx            # + CustomDocumentInput state, realMode/params props threaded to steps (edit)
│   └── steps/
│       ├── DocumentStep.tsx               # + CustomDocumentInput when real mode active (edit)
│       ├── ChunkingStep.tsx                # unchanged -- chunking itself stays local/pure in both modes
│       ├── EmbeddingStep.tsx              # + real embedBatch()+PCA path, data-real-disclosure marker (edit)
│       ├── RetrievalStep.tsx              # + real query-embedding path (edit)
│       └── GenerationStep.tsx             # + real generate() call, temperature control, data-real-disclosure marker (edit)
└── variants/
    ├── variantData.ts                     # unchanged
    ├── VariantsComparison.tsx             # + independent doc/query state, Run-for-real per executable variant, trace display (edit, largest change)
    └── EvalPanel.tsx                      # (new) US6 -- EvalPair authoring + recall@K display, reuses VariantsComparison's doc/query state

scripts/checks/
├── no-cross-module-conditionals.ts        # unchanged (SC-001, 002-spec, regression)
├── simulated-disclosure.ts                # + data-real-disclosure rule (FR-004), still one script/command
├── determinism.ts                         # unchanged, scope note only (research.md)
└── key-isolation.ts                       # (new) static half of SC-006 -- fails if any server-route file exists

tests/a11y/
├── pipeline-walkthrough.spec.ts           # unchanged
├── compare-variants.spec.ts               # unchanged
└── real-mode.spec.ts                      # (new) SC-009 -- toggle, key input, temperature/N/count sliders, custom-doc textarea

tests/real-mode/                            # (new)
├── key-isolation.spec.ts                  # dynamic half of SC-006 -- network-capture, mocked provider
├── failure-fallback.spec.ts               # SC-004 -- each failure path -> error + fallback, mocked
├── temperature-effect.spec.ts             # SC-007 -- mocked high/low-temperature responses differ/stable
└── fusion-n-effect.spec.ts                # SC-008 -- mocked N-variant responses, call count matches N+3
```

**Structure Decision**: No structural change to the existing single
Next.js project. All new/edited files live inside `src/concepts/rag/`
(a new `realMode/` subfolder plus targeted edits to existing
pipeline/variants files) or inside the already-established
`scripts/checks/`/`tests/` top-level directories, extending existing
scripts/specs wherever one already owns the relevant Success Criterion
rather than introducing a parallel one. No file outside these surfaces
is touched -- `src/app/page.tsx`, `src/app/concepts/[conceptId]/page.tsx`,
`src/lib/concept-registry.ts`, and `src/lib/concept-types.ts` remain
untouched, preserving Principle I and this feature's own SC-001
(002-spec) regression gate.

## Complexity Tracking

*No Constitution Check violations -- table intentionally empty.*
