# Implementation Plan: Parameter Exploration & Sharing

**Branch**: `003-parameter-exploration` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-parameter-exploration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Adds three additive capabilities to the existing RAG module's Pipeline
Walkthrough view: a chunk-size sensitivity sweep (9 fixed points,
rendered as a keyboard-navigable curve, each point clickable to load
that exact configuration), a shareable permalink (plain query-string
encoding of every pipeline parameter except API keys and custom pasted
documents), and three curated, automated-check-verified failure presets
plus a reset-to-defaults control. `/speckit.clarify` (2026-08-10)
resolved five ambiguities before this plan: the sweep's range/point
count is fixed to the existing chunk-size slider's own bounds (not
learner-adjustable), a second sweep started mid-sweep cancels and
replaces the first (not queued), the sweep's plotted metric is fixed to
top-1 similarity score, only chunk size is sweepable this milestone, and
every sweep point must be individually keyboard-focusable and
Enter/Space-activatable. All new state and controls attach to
`PipelineWalkthrough.tsx`, which already owns every parameter this
feature needs (research.md's "where state lives" decision) -- no state
is newly lifted to `RagConcept.tsx`, and Compare Variants is untouched.
The one edit outside `src/concepts/rag/` is a generic `<Suspense>`
wrapper in `src/app/concepts/[conceptId]/page.tsx`, required by
`useSearchParams()`'s static-rendering constraint (discovered by reading
Next's own docs per AGENTS.md) and applying uniformly to every concept
module. No new npm dependency: sweep math is pure functions over the
existing `chunkText`/`embed`/`cosineSimilarity` primitives, the sweep
curve is hand-built SVG+HTML matching `StarChart.tsx`'s style, and
permalinks use native `URLSearchParams`/`Clipboard`. See `research.md`
for the six decisions this plan resolves (sweep range/point algorithm,
overlap clamping, metric choice, cancellation mechanism, Real Mode call
cost, and the permalink transport format).

## Technical Context

**Language/Version**: TypeScript 5, Node.js (Next.js 16 runtime) --
unchanged from Milestones 1-2.

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind
CSS v4 -- per tech-stack.md (locked), unchanged. No new runtime
dependency: the sweep curve is hand-built SVG+HTML (matching
`StarChart.tsx`'s existing style, per tech-stack.md's "revisit only for
genuinely general-purpose charting" bar, which a 9-point line chart
doesn't trigger), and permalinks use native `URLSearchParams` +
`navigator.clipboard` (see research.md's "permalink transport" decision).

**Storage**: N/A -- still no backend/database. Sweep state is transient
component state (cleared on navigation away from Retrieval); permalinks
round-trip through the URL only, never persisted server-side (no server
exists to persist them to).

**Testing**: Extends the existing check pattern rather than replacing
it: two new pure-function scripts
(`scripts/checks/permalink-safety.ts` for SC-002,
`scripts/checks/failure-presets.ts` for SC-004, both in
`determinism.ts`'s no-browser style) plus a new `tests/parameter-
exploration/` Playwright directory (`sweep-keyboard-and-confirmation.spec.ts`
for SC-001/SC-005, `permalink-roundtrip.spec.ts` for SC-003, both
mocked-provider where Real Mode is involved -- no real API key in CI,
same policy as Milestone 2), plus a third `tests/a11y/` spec file for
this feature's new controls. `check:extensibility`, `check:disclosure`,
and `check:determinism` need no new rule (nothing here introduces a
concept-id conditional, a new simulated-vs-real surface beyond what
Milestone 2 already discloses, or a new pure pipeline function outside
the sweep's own new checks). A new `check:parameter-exploration` npm
script bundles all of this feature's checks, added to `check:all`.

**Target Platform**: Same as Milestones 1-2 -- Next.js web app, desktop
browser primary, usable down to 375px.

**Project Type**: Single Next.js project (web), client-only, unchanged.

**Performance Goals**: None beyond feeling responsive -- the Simulated
sweep is 9 synchronous chunk/embed/rank passes over a handful of chunks
(same order of magnitude as one existing Retrieval computation, just
run 9 times), and a Real Mode sweep's latency is provider-dependent
(10 sequential real calls) and outside this project's control, same
caveat as Milestone 2's generation latency.

**Constraints**: FR-003 (Real Mode sweeps >1 call require an
up-front estimate and explicit confirmation before any call, mirroring
spec 002 FR-010's existing disclosure pattern exactly -- estimate text
next to a Run/Start-sweep button, not a separate modal); FR-006/FR-007
(permalinks structurally cannot carry an API key or custom document text
-- enforced by `PermalinkSourceState`'s own field list, not just by
omission at the call site, per contracts/permalink-contract.md); the
sweep's keyboard-operability requirement from `/speckit.clarify`
(Constitution Principle VII, each point individually focusable).

**Scale/Scope**: One pipeline view extended (Pipeline Walkthrough only
-- Compare Variants is out of scope per spec.md's FR enumeration); three
new small modules (`sweep/`, `permalink/`, `failurePresets/`) inside
`src/concepts/rag/`; 9 fixed sweep points; 3 shipped failure presets;
one new automated-check script pair plus two new Playwright spec files.
Single-learner, single session, no accounts, no cross-session
persistence -- unchanged from prior milestones (a permalink is the one
exception, and it persists only in the URL the learner shares, not on
any server).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Extensibility Is Structural | PASS | All new code lives inside `src/concepts/rag/` (three new subfolders: `sweep/`, `permalink/`, `failurePresets/`, plus edits to `PipelineWalkthrough.tsx`/`RetrievalStep.tsx`). The one file touched outside that folder, `src/app/concepts/[conceptId]/page.tsx`, gains a generic `<Suspense>` wrapper around `<Component />` with no `concept.id`-keyed branch before or after -- `check:extensibility`'s existing scan needs no new rule and continues passing. |
| II. Never Blur Simulated vs Real | PASS | No new simulated-vs-real surface is introduced -- the sweep reuses `EmbeddingStep`/`RetrievalStep`'s existing disclosure markers verbatim in both modes (Simulated sweep computation is the same `mockEmbedding.ts` path already disclosed; Real Mode sweep points reuse `RetrievalStep`'s existing `data-real-disclosure` marker). `check:disclosure` needs no new rule. |
| III. Every Interaction Teaches Something | PASS | Every new control maps to a named spec.md FR/SC: the sweep -> FR-001/FR-002/SC-001 (parameter sensitivity, shape not a point); the permalink -> FR-005/SC-003 (configuration is discussable/shareable); failure presets -> FR-009/SC-004 (a named failure is a deliberate lesson, curated and kept truthful by an automated check, not an accident a learner has to stumble into). |
| IV. Guided, Not Just Dense | PASS | The sweep control lives inside the existing Retrieval step's guided layout (no new unguided panel); the permalink button and preset picker live in `PipelineWalkthrough.tsx`'s existing chrome (above `StepperNav`), not a new settings surface requiring separate navigation. |
| V. Deterministic By Default | PASS | Simulated sweep computation is pure functions over already-deterministic primitives (`chunkText`, `embed`, `cosineSimilarity`) -- `runSimulatedSweep` produces byte-identical output for identical inputs by construction. Real Mode sweeps inherit the same documented scope boundary Milestone 2 already established (Principle V governs simulated behavior specifically; a live API response isn't guaranteed byte-identical run-to-run) -- not a new exception, the existing one. |
| VI. Spec Before Code | PASS | spec.md 003 is drafted and clarified (2026-08-10, five ambiguities resolved) before this plan. |
| VII. Accessible and Reduced-Motion by Default | PASS | The sweep curve's keyboard-operability requirement was made explicit and resolved during `/speckit.clarify` specifically because this principle demanded it be decided at spec time, not discovered late the way Milestone 1's chart interactions were (roadmap.md's 2026-08-05 history). `tests/a11y/parameter-exploration.spec.ts` (this plan's deliverable) covers the sweep curve, permalink button, preset picker, and reset control from the start. |

**Technology Constraints gate** (tech-stack.md): This plan adds a
"Parameter exploration" row set (hand-built sweep chart following
`StarChart.tsx`'s existing pattern, native `URLSearchParams`-based
permalinks, two new pure-function check scripts) to tech-stack.md,
amended alongside this plan. No new npm dependency is introduced, so
the "no charting library / state library without justification" bar
isn't triggered -- the amendment records *how* the existing hand-built-
SVG and pure-function-check patterns extend to this milestone's two new
surfaces, consistent with how tech-stack.md already records each
milestone's testing additions.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-parameter-exploration/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── data-model.md                        # Phase 1 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/                           # Phase 1 output (/speckit-plan command)
│   ├── sweep-contract.md
│   ├── permalink-contract.md
│   └── failure-preset-contract.md
└── tasks.md                             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Existing structure (unchanged in shape), extended additively:

```text
src/concepts/rag/
├── RagConcept.tsx                         # unchanged -- no new state lifted here (research.md)
├── sweep/                                 # (new) US1
│   ├── runSweep.ts                        # generateSweepChunkSizes(), runSimulatedSweep() (contracts/sweep-contract.md)
│   ├── sweepCallEstimate.ts               # Real Mode: (pointCount + 1) formula, mirrors callEstimate.ts's style
│   └── SweepCurve.tsx                     # decorative aria-hidden SVG background + one native <button> per point, individually focusable (FR-002, Constitution VII)
├── permalink/                             # (new) US2
│   ├── permalinkParams.ts                 # buildPermalinkParams()/parsePermalinkParams() -- structurally excludes apiKey/custom text (contracts/permalink-contract.md)
│   └── PermalinkButton.tsx                # "Generate permalink" + clipboard copy + aria-live confirmation; states custom-doc exclusion when applicable (FR-007)
├── failurePresets/                        # (new) US3
│   ├── failurePresets.ts                  # FAILURE_PRESETS: 3 shipped values + their expectedFailure predicates (contracts/failure-preset-contract.md)
│   └── FailurePresetPicker.tsx            # preset selector + reset-to-defaults control, rendered above StepperNav (reachable from any step)
├── lib/
│   ├── sampleDocs.ts                      # unchanged (chunkText/chunkTextBySentence reused as-is by runSweep.ts and failure-presets.ts)
│   └── mockEmbedding.ts                   # unchanged
├── realMode/                              # unchanged -- RealModeError/RealModeSession types reused as-is by sweep error state
├── pipeline/
│   ├── PipelineWalkthrough.tsx            # + on-mount permalink-apply effect, + PermalinkButton/FailurePresetPicker render, + onSweepJump handler threaded to RetrievalStep (edit)
│   └── steps/
│       └── RetrievalStep.tsx              # + SweepCurve integration, sweep run/cancel/confirm state (edit, largest change)
└── variants/                              # unchanged -- Compare Variants is out of scope for this feature

scripts/checks/
├── permalink-safety.ts                    # (new) SC-002 -- fixture-based: fake key/custom text must never appear in buildPermalinkParams() output
└── failure-presets.ts                     # (new) SC-004 -- runs FAILURE_PRESETS through the live chunk/embed/rank functions, asserts expectedFailure holds

tests/a11y/
└── parameter-exploration.spec.ts          # (new) sweep curve points, permalink button, preset picker, reset control -- keyboard + axe

tests/parameter-exploration/                # (new)
├── sweep-keyboard-and-confirmation.spec.ts # SC-001 (curve renders, points Tab/Enter-reachable) + SC-005 (Real Mode cost estimate + confirm gate, mocked provider)
└── permalink-roundtrip.spec.ts             # SC-003 -- generate non-default permalink, open in fresh context, assert every param reproduced

src/app/concepts/[conceptId]/page.tsx        # + <Suspense> wrapper around <Component/> (generic, required by useSearchParams' static-rendering constraint -- research.md) (edit)

package.json                                 # + check:parameter-exploration script; check:all gains it (edit)
```

**Structure Decision**: No structural change to the existing single
Next.js project. All new/edited files live inside `src/concepts/rag/`
(three new subfolders plus targeted edits to `PipelineWalkthrough.tsx`/
`RetrievalStep.tsx`) or inside the already-established `scripts/checks/`/
`tests/` top-level directories. The single exception,
`src/app/concepts/[conceptId]/page.tsx`, gains a generic `<Suspense>`
wrapper with no concept-specific logic. `src/lib/concept-registry.ts` and
`src/lib/concept-types.ts` remain untouched, preserving Principle I.
`src/concepts/rag/variants/` (Compare Variants) is untouched -- this
feature's FR enumeration scopes entirely to Pipeline Walkthrough.

## Complexity Tracking

*No Constitution Check violations -- table intentionally empty.*
