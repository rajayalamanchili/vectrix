# Implementation Plan: Real Mode Depth -- Simulated-vs-Real Comparison & Cumulative Cost Tracking

**Branch**: `004-real-mode-depth` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-real-mode-depth/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Adds two capabilities on top of the existing RAG module: a new third
top-level "Compare Simulated vs Real" view (sibling to Pipeline
Walkthrough and Compare Variants) that runs naive RAG, HyDE, or
RAG-Fusion for a chosen document/question and shows each chunk's
Simulated-Mode rank next to its Real-Mode rank; and a cumulative,
session-wide cost/call ledger, visible from any view, that tracks every
real API call made anywhere in the app (Pipeline Walkthrough, Compare
Variants, the new comparison view, sweeps, and recall@K evaluation
runs) and warns when a learner-configurable ($1.00 default) threshold is
crossed. `/speckit.clarify` (2026-08-10) resolved five ambiguities
before this plan: the comparison view is a new sibling tab, not a
Pipeline Walkthrough toggle; it covers all three real-executable
configurations (naive/HyDE/RAG-Fusion), not naive only; the default
warning threshold is $1.00; the ledger lives in memory only and resets
on refresh (matching the existing API-key storage pattern); and opening
the comparison view without a key yet still renders the Simulated half
immediately, prompting for a key inline for the Real half.

This plan resolves one further design question the spec left open:
Simulated Mode has no generation model capable of producing HyDE's
hypothesis text or RAG-Fusion's reworded queries (`mockEmbedding.ts` is
a deterministic bag-of-words projection, not a text generator), so
there is no existing notion of a "simulated HyDE ranking" anywhere in
the codebase today. Rather than fabricate one, the comparison view's
Simulated half **always shows naive RAG's simulated ranking**,
explicitly labeled as an approximation when HyDE or RAG-Fusion is
selected -- see research.md's "Simulated half for HyDE/RAG-Fusion"
decision. The cost ledger is built as a decorator around the existing
`RealModeProvider` interface (`createLedgerTrackingProvider`,
research.md) so every existing real-call site (`RetrievalStep.tsx`,
`EmbeddingStep.tsx`, `GenerationStep.tsx`, `VariantsComparison.tsx`,
`EvalPanel.tsx`, the sweep in `RetrievalStep.tsx`) needs only a
one-line change at its provider-construction call, not a rewrite --
matching tech-stack.md's existing "one function, one seam" swap-out
pattern. No new npm dependency.

## Technical Context

**Language/Version**: TypeScript 5, Node.js (Next.js 16 runtime) --
unchanged from Milestones 1-3.

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind
CSS v4 -- per tech-stack.md (locked), unchanged. No new runtime
dependency: the comparison view reuses `StarChart.tsx` (two instances
side by side) and the existing `RetrievedChunk`/ranking primitives; the
cost ledger is pure arithmetic over a flat, static per-call pricing
table (no token-counting library, no charting library for the ledger
display -- a running total and a short list, not a chart).

**Storage**: N/A -- still no backend/database. `SessionCostLedger` and
`ComparisonResult` are transient in-memory component state, lifted to
`RagConcept.tsx` (ledger) or local to the new view (comparison result),
matching every prior milestone's client-only stance. Per
`/speckit.clarify`, the ledger explicitly does NOT survive a page
refresh (no sessionStorage/localStorage), mirroring the existing API-key
storage decision (tech-stack.md, Milestone 2).

**Testing**: Extends the existing check pattern: one new pure-function
script (`scripts/checks/cost-ledger-sum.ts` for SC-002, in
`failure-presets.ts`'s no-browser style) plus a new
`tests/real-mode-depth/` Playwright directory (three specs, mocked
provider, no real key in CI -- same policy as Milestones 2-3) plus two
new `tests/a11y/` spec files for this feature's new controls.
`check:extensibility`, `check:disclosure`, and `check:determinism` each
need a small extension rather than a new script: `check:disclosure`
gains a rule for the comparison view's Simulated-approximation caveat
and the ledger's cost-estimate labeling (FR-008); the other two need no
new rule (research.md). A new `check:real-mode-depth` npm script bundles
this feature's checks, added to `check:all`.

**Target Platform**: Same as Milestones 1-3 -- Next.js web app, desktop
browser primary, usable down to 375px.

**Project Type**: Single Next.js project (web), client-only, unchanged.

**Performance Goals**: None beyond feeling responsive -- the comparison
view's Simulated half is one synchronous chunk/embed/rank pass (same
cost as one existing Retrieval computation); its Real half's latency is
provider-dependent, same caveat as every other Real Mode action. The
ledger's per-call bookkeeping is O(1) per call (append one entry, sum a
short array), never a performance concern at this app's scale.

**Constraints**: FR-003 (triggering the comparison's Real half follows
spec 002 FR-010's existing cost/call disclosure pattern exactly --
estimate text next to a Run/confirm button, not a new modal); FR-006
(a document/reset change must ask, not silently reset or silently keep
accumulating the ledger -- a new confirm-prompt UI, not a silent
branch); FR-007 (the $1.00-default warning threshold must block with a
visible warning before the *next* call once crossed, not only log it
after the fact -- mirrors the sweep's existing
`awaiting-confirmation`/confirm-button two-step pattern in
`RetrievalStep.tsx`); FR-008 (every cost figure must name its
pricing-assumption basis, never read as an exact bill).

**Scale/Scope**: One new top-level view (`compareReal/`, ~1 component +
1 types file); one new cross-cutting module (`costLedger/`, ~4 files:
types, pricing table, tracked-provider decorator, display component)
whose consumers are every existing real-call site (5 files gain a
one-line provider-construction change plus a threshold-gate check before
firing); one new pure-function check script; three new Playwright specs
plus two new a11y specs. Single-learner, single session, no accounts,
no cross-session persistence -- unchanged from prior milestones.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Extensibility Is Structural | PASS | All new code lives inside `src/concepts/rag/` (two new subfolders: `compareReal/`, `costLedger/`, plus edits to `RagConcept.tsx` and the five existing files that construct a `RealModeProvider`). No file outside `src/concepts/rag/` is touched. `check:extensibility`'s existing scan needs no new rule. |
| II. Never Blur Simulated vs Real | PASS, with one design decision load-bearing here | The comparison view is this milestone's biggest risk to this principle -- resolved by never fabricating a "simulated HyDE/RAG-Fusion": the Simulated half always shows the real, already-disclosed naive-RAG simulated ranking, with an explicit `data-simulated-disclosure`-style caveat when the selected configuration isn't naive (research.md). Both halves keep their own existing mode-disclosure markers verbatim (FR-001). Every cost figure is labeled an estimate with its basis named (FR-008), never presented as exact. |
| III. Every Interaction Teaches Something | PASS | The comparison view -> FR-001/FR-002/SC-001 (the simulation-vs-reality gap becomes a concrete, inspectable fact instead of a caption a learner has to take on faith). The cost ledger -> FR-005/SC-002 (real budget intuition builds over a realistic multi-call session, not one action at a time) and FR-007/SC-004 (a threshold teaches "notice when you're spending real money," not just display a number). |
| IV. Guided, Not Just Dense | PASS | The comparison view follows the exact `TABS`/`Marginalia` pattern the other two views already use -- no new navigation paradigm. The cost ledger is a small, always-visible widget in `RagConcept.tsx`'s existing chrome (next to `RealModeToggle`), not a new settings page requiring separate navigation. |
| V. Deterministic By Default | PASS | The comparison view's Simulated half is the same already-deterministic `chunkText`/`embed`/`cosineSimilarity` pipeline, unchanged. The ledger is a pure function of the sequence of real calls that actually succeeded -- deterministic given that sequence, though the sequence itself (a live API response) isn't guaranteed identical run-to-run, the same documented Real Mode scope boundary Milestone 2 already established (not a new exception). |
| VI. Spec Before Code | PASS | spec.md 004 is drafted and clarified (2026-08-10, five ambiguities resolved) before this plan. |
| VII. Accessible and Reduced-Motion by Default | PASS | The comparison view's variant selector reuses `VariantsComparison.tsx`'s existing `aria-pressed` selector pattern (already accessibility-verified). The ledger's reset-prompt and threshold-warning banners reuse `ErrorBanner.tsx`'s existing `role="alert"`/keyboard pattern rather than inventing a new one. `tests/a11y/cost-ledger.spec.ts` and `tests/a11y/compare-simulated-vs-real.spec.ts` (this plan's deliverables) cover both from the start. |

**Technology Constraints gate** (tech-stack.md): This plan adds a "Real
Mode Depth" row set to tech-stack.md (amended alongside this plan,
Phase 1): the `RealModeProvider`-decorator pattern for cost tracking
(`createLedgerTrackingProvider`, wrapping the existing behavioral
interface rather than modifying it or its callers' internal logic), and
a flat, static per-call pricing table (not per-token metering -- the
project has no token-counting infrastructure and spec.md's own
Assumptions rule out a live pricing lookup). No new npm dependency is
introduced, so the "no charting library / state library without
justification" bar isn't triggered.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-real-mode-depth/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── data-model.md                        # Phase 1 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/                           # Phase 1 output (/speckit-plan command)
│   ├── comparison-contract.md
│   └── cost-ledger-contract.md
└── tasks.md                             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Existing structure (unchanged in shape), extended additively:

```text
src/concepts/rag/
├── RagConcept.tsx                         # + third TABS entry ("compare-real"), + costLedger state lifted here, + <CostLedgerDisplay> in chrome, + <CompareSimulatedVsReal> render branch (edit)
├── compareReal/                           # (new) US1
│   ├── types.ts                           # ComparisonResult, ChunkRankPair (contracts/comparison-contract.md)
│   └── CompareSimulatedVsReal.tsx         # new top-level view: doc/query picker (independent state, mirrors VariantsComparison's precedent), configuration selector, two StarCharts + a merged rank table
├── costLedger/                            # (new) US2
│   ├── types.ts                           # CostLedgerEntry, SessionCostLedger, DEFAULT_WARNING_THRESHOLD_USD (contracts/cost-ledger-contract.md)
│   ├── pricing.ts                         # PricingTable, openaiPricing -- flat $/call, assumption basis documented inline (FR-008)
│   ├── costEstimate.ts                    # embedCallsForConfiguration()/generateCallsForConfiguration()/costEstimateUsd() -- mirrors callEstimate.ts's per-configuration switch (contracts/cost-ledger-contract.md)
│   ├── trackedProvider.ts                 # createLedgerTrackingProvider() decorator + createTrackedProvider(realMode, onCall) convenience wrapper (contracts/cost-ledger-contract.md)
│   ├── CostLedgerDisplay.tsx              # always-visible running total + call count (FR-005), reset-prompt banner (FR-006)
│   └── CostWarningBanner.tsx              # reusable pre-call threshold-crossed warning, "Proceed anyway" gate (FR-007) -- same two-step shape as RetrievalStep's existing sweep confirm
├── realMode/                              # unchanged types/adapter; five call sites below swap their provider construction
├── pipeline/
│   └── steps/
│       ├── RetrievalStep.tsx              # + createTrackedProvider swap (corpus-embed, query-embed, sweep's per-point embeds), + threshold gate before sweep confirm (edit)
│       ├── EmbeddingStep.tsx              # + createTrackedProvider swap (edit)
│       └── GenerationStep.tsx             # + createTrackedProvider swap (edit)
└── variants/
    ├── VariantsComparison.tsx             # + createTrackedProvider swap (runNaive/runHyde/runFusion), + threshold gate before each Run (edit)
    └── EvalPanel.tsx                      # + createTrackedProvider swap, + threshold gate before eval run (edit)

scripts/checks/
└── cost-ledger-sum.ts                     # (new) SC-002 -- fixture-based: runs createLedgerTrackingProvider against a fake resolving-provider for a known call sequence, asserts the ledger's summed total equals costEstimateUsd()'s own pre-call estimate for that same sequence

tests/a11y/
├── compare-simulated-vs-real.spec.ts      # (new) configuration selector, both charts' focus order, run/confirm controls -- keyboard + axe
└── cost-ledger.spec.ts                    # (new) ledger display, reset-prompt banner, warning banner -- keyboard + axe

tests/real-mode-depth/                     # (new)
├── comparison-view.spec.ts                # SC-001, SC-003 -- both charts render for the same input, rank pairs readable without extra clicks, cost/call disclosure shown before the Real half fires (mocked provider)
├── cost-ledger-accumulation.spec.ts       # SC-002 -- 3+ real actions across different steps/views, displayed total matches the sum of individual estimates, persists across navigation (mocked provider)
└── warning-threshold.spec.ts              # SC-004 -- deliberately cross a low custom threshold, assert the warning shows before, not after, the next call (mocked provider)

package.json                               # + check:real-mode-depth script; check:all gains it (edit)

tech-stack.md                              # + "Real Mode Depth (Milestone 4)" row set: provider-decorator pattern, flat per-call pricing table (edit, amended alongside this plan)
```

**Structure Decision**: No structural change to the existing single
Next.js project. All new/edited files live inside `src/concepts/rag/`
(two new subfolders plus targeted edits to five existing real-call
sites and `RagConcept.tsx`) or inside the already-established
`scripts/checks/`/`tests/` top-level directories. `src/lib/concept-
registry.ts` and `src/lib/concept-types.ts` remain untouched, preserving
Principle I. `src/app/concepts/[conceptId]/page.tsx` is untouched --
unlike Milestone 3, this feature adds no `useSearchParams()` usage, so
no new `<Suspense>` constraint is introduced.

## Complexity Tracking

*No Constitution Check violations -- table intentionally empty.*
