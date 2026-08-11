---

description: "Task list for Real Mode Depth -- Comparison & Cost Tracking"
---

# Tasks: Real Mode Depth -- Comparison & Cost Tracking

**Input**: Design documents from `/specs/004-real-mode-depth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: This feature's automated checks (`scripts/checks/cost-ledger-sum.ts`, the extended `scripts/checks/simulated-disclosure.ts` rule, `tests/a11y/compare-simulated-vs-real.spec.ts`, `tests/a11y/cost-ledger.spec.ts`, `tests/real-mode-depth/*.spec.ts`) are not optional TDD scaffolding -- they are the literal verification mechanism spec.md's Success Criteria (SC-001, SC-002, SC-003, SC-004) require and that `contracts/comparison-contract.md` and `contracts/cost-ledger-contract.md` document as deliverables. SC-002 in particular is a hard Definition-of-Done gate per roadmap.md ("a cost tracker that silently drifts from reality is actively worse than no tracker"). Included as regular tasks within each story, matching Milestones 1-3's own precedent.

**Organization**: Tasks are grouped by user story (spec.md priorities US1=P1, US2=P2). Unlike a fully independent pairing, US2 (the cost ledger) genuinely touches US1's own file (`CompareSimulatedVsReal.tsx`, built in US1) once it exists -- research.md's provider-decorator decision means every real-call site, including the one US1 creates, gets a one-line swap during US2. This is expected and intentional: US1 ships and is independently testable on its own (using the plain, already-existing call-count-only disclosure pattern, FR-003), and US2 layers cost tracking on top of it and every pre-existing call site afterward.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1-US2)
- File paths are relative to the repo root

## Path Conventions

Single Next.js project (existing, per plan.md's Structure Decision -- no new top-level directories). New code lives in two new subfolders under `src/concepts/rag/` (`compareReal/`, `costLedger/`), plus edits to five existing real-call sites, `scripts/checks/`, and `tests/`.

---

## Phase 1: Setup

**Purpose**: Confirm the baseline before any change lands, and scaffold this feature's two new subfolders.

- [ ] T001 Run `npm run build` and `npm run dev` on branch `004-real-mode-depth` to confirm Milestones 1-3's build/dev server are unaffected before this feature's work begins
- [ ] T002 [P] Create the `src/concepts/rag/compareReal/` directory (US1's home)
- [ ] T003 [P] Create the `src/concepts/rag/costLedger/` directory (US2's home)

**Checkpoint**: Baseline confirmed clean; scaffolds ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None this feature. Unlike Milestone 3's `<Suspense>` wrapper, plan.md's Structure Decision found no new routing constraint and no shared provider abstraction that must exist before either story can start -- `src/app/concepts/[conceptId]/page.tsx` is untouched by this feature entirely. This phase is intentionally empty; proceed directly to Phase 3.

**Checkpoint**: N/A -- no blocking prerequisite exists.

---

## Phase 3: User Story 1 - See exactly where the simulation and reality diverge (Priority: P1) 🎯 MVP

**Goal**: A new third top-level "Compare Simulated vs Real" view where a learner picks naive RAG, HyDE, or RAG-Fusion and sees that configuration's Simulated-Mode ranking next to its Real-Mode ranking for the same document/question, with each chunk's rank in both readable side by side.

**Independent Test**: With a document and question selected, open the new tab, confirm the Simulated chart/ranking renders immediately (with an explicit approximation caveat if HyDE or RAG-Fusion is selected), and confirm the Real half shows a cost/call estimate before any call fires and a matching ranking once it completes.

### Implementation for User Story 1

- [ ] T004 [P] [US1] Define `ComparisonResult`, `ChunkRankPair`, `RealHalfStatus` types in `src/concepts/rag/compareReal/types.ts` per contracts/comparison-contract.md and data-model.md
- [ ] T005 [US1] Implement `CompareSimulatedVsReal.tsx` in `src/concepts/rag/compareReal/CompareSimulatedVsReal.tsx`: independent `docId`/`customMode`/`query` state (mirroring `VariantsComparison.tsx`'s existing independent-state precedent, research.md), a configuration selector (naive/hyde/fusion) reusing `VariantsComparison.tsx`'s existing `aria-pressed` pill-button pattern but disabled with an accessible reason (e.g. `aria-disabled` + helper text) whenever `realStatus === "running"` for the current `ComparisonResult` (research.md's "Configuration selector during an in-flight Real half" decision), and the Simulated half computed synchronously via `chunkText`/`embed`/`cosineSimilarity` + `rankChunks` from `realMode/variantExecution.ts` -- **always** the naive-RAG ranking regardless of selected configuration (depends on T004)
- [ ] T006 [US1] Add an unconditional `data-simulated-disclosure`-style marker to `CompareSimulatedVsReal.tsx`'s Simulated panel -- present for every configuration, including `naive` -- satisfying FR-001's "each still carrying its own mode-disclosure label" requirement (mirroring how T007 gives the Real panel an unconditional `data-real-disclosure` marker). Additionally set the `simulatedIsApproximation` flag and append its extra caveat text to that same marker's content whenever the selected configuration isn't `naive`, per research.md's "Simulated half for HyDE/RAG-Fusion configurations" decision (depends on T005)
- [ ] T007 [US1] Add the Real half to `CompareSimulatedVsReal.tsx`: an inline key-entry prompt (reusing `RealModeToggle.tsx`'s existing UI) when `realMode.apiKey` is null (FR-004a), a pre-call cost/call estimate + confirm button reusing spec.md 002 FR-010's existing call-count-only disclosure pattern (FR-003), then execution via `rankChunks`/`averageVectors`/`reciprocalRankFusion` (`realMode/variantExecution.ts`) against `createOpenAICompatibleProvider` directly -- not yet ledger-tracked, US2 wires that in later -- with a `data-real-disclosure="true"` marker naming the provider (depends on T005)
- [ ] T008 [US1] Implement `pairRanks()` in `CompareSimulatedVsReal.tsx` merging `simulatedRanking`/`realRanking` by chunk id into `ChunkRankPair[]` (contracts/comparison-contract.md), rendered as a single table/list so both ranks are readable without cross-referencing two charts (FR-002), plus a "Real Mode re-ran; results may differ from the last run" note shown whenever the Real half is re-triggered with unchanged Simulated inputs (Edge Cases). Per FR-004, the table's rendering MUST apply no conditional styling based on how closely `simulatedRank`/`realRank` agree or diverge for any given pair -- close agreement and wide divergence use identical, neutral styling, so the UI never implies divergence is the expected or typical outcome (depends on T007)
- [ ] T009 [US1] Add a third `TABS` entry (`"compare-real"` -> "Compare Simulated vs Real") and its render branch to `src/concepts/rag/RagConcept.tsx`, threading `realMode`/`generationParams`/`topK` to `CompareSimulatedVsReal` the same way as the other two views (depends on T005)
- [ ] T010 [P] [US1] Extend `scripts/checks/simulated-disclosure.ts` with two rules for `CompareSimulatedVsReal`: (a) rendered with `naive` selected, it still carries a non-empty `data-simulated-disclosure`-style element (FR-001's unconditional requirement); (b) rendered with a non-`naive` configuration selected, that same element's text additionally states the approximation caveat (research.md's disclosure decision) (depends on T006)
- [ ] T011 [P] [US1] Create `tests/real-mode-depth/comparison-view.spec.ts` (SC-001, SC-003, FR-004): mocked provider -- both charts/rankings render for the same input, the rank table is readable without extra clicks, the cost/call disclosure appears before the Real half's call fires, and a close-agreement fixture (Simulated and Real rankings nearly identical) renders with the same styling as a wide-divergence fixture (FR-004 -- no visual cue implies divergence was expected) (depends on T009)
- [ ] T012 [P] [US1] Create `tests/a11y/compare-simulated-vs-real.spec.ts`: configuration selector (including its disabled-with-accessible-reason state while a Real half is in flight, research.md), both panels' focus order, run/confirm controls -- keyboard + axe (depends on T009)
- [ ] T013 [US1] Manual scenario validation: quickstart.md scenarios 1-6 (both halves render/labeled, ranks side-by-side, cost disclosure before the Real half fires, close agreement shown honestly, HyDE/RAG-Fusion Simulated-approximation caveat, no-key inline prompt)

**Checkpoint**: US1 independently functional -- comparison view complete, honest about its Simulated-side approximation (Constitution Principle II), cost-disclosed before any real call fires.

---

## Phase 4: User Story 2 - Track real cost across a whole session, not per call (Priority: P2)

**Goal**: A session-wide cost/call ledger, visible from any step or view, tracking every real call made anywhere in the app (not just the comparison view), with a $1.00-default learner-configurable warning threshold and an explicit ask-before-reset prompt on document/pipeline-state changes.

**Independent Test**: In a Real Mode session, make at least three real calls across different steps/views, and confirm a running total (call count + estimated cost) is visible from any step/view and exactly equals the sum of each action's own pre-shown estimate.

### Implementation for User Story 2

- [ ] T014 [P] [US2] Define `CostLedgerEntry`, `SessionCostLedger`, `DEFAULT_WARNING_THRESHOLD_USD`, `sumLedgerUsd()`, `ledgerCallCount()` in `src/concepts/rag/costLedger/types.ts` per data-model.md
- [ ] T015 [P] [US2] Define `PricingTable` and `openaiPricing` in `src/concepts/rag/costLedger/pricing.ts` per data-model.md's flat per-call figures (`embedCallUsd: 0.00001`, `generateCallUsd: 0.00015`), with the assumption basis (assumed token counts, published per-token rates) documented in the table's own `label` field (FR-008)
- [ ] T016 [US2] Implement `embedCallsForConfiguration()`, `generateCallsForConfiguration()`, `costEstimateUsd()` in `src/concepts/rag/costLedger/costEstimate.ts` per contracts/cost-ledger-contract.md's breakdown table (naive: 2 embed/1 generate; hyde: 2 embed/`hydeCount + 1` generate; fusion: `fusionN + 1` embed/2 generate) (depends on T014, T015)
- [ ] T017 [US2] Implement `createLedgerTrackingProvider()` and `createTrackedProvider()` in `src/concepts/rag/costLedger/trackedProvider.ts` per contracts/cost-ledger-contract.md: a `RealModeProvider` decorator appending exactly one `CostLedgerEntry` per underlying call that resolves successfully (never on rejection), plus a convenience wrapper composing it around `createOpenAICompatibleProvider` (depends on T014, T015)
- [ ] T018 [US2] Implement `CostLedgerDisplay.tsx` in `src/concepts/rag/costLedger/CostLedgerDisplay.tsx`: an always-visible running total + call count (FR-005), and a reset-prompt banner rendered whenever `pendingResetPrompt` is true, with "Keep accumulating"/"Reset total" buttons (FR-006) (depends on T014)
- [ ] T019 [P] [US2] Implement `CostWarningBanner.tsx` in `src/concepts/rag/costLedger/CostWarningBanner.tsx`: a reusable pre-call threshold-crossed warning with a "Proceed anyway" button, mirroring `ErrorBanner.tsx`'s existing `role="alert"` pattern (FR-007) (depends on T014)
- [ ] T020 [US2] Lift `costLedger` state (`useState<SessionCostLedger>`, default threshold `DEFAULT_WARNING_THRESHOLD_USD`) to `RagConcept.tsx`, render `CostLedgerDisplay` in its chrome next to `RealModeToggle`, and thread `costLedger`/`onCostLedgerAppend`/`onLedgerResetPrompt` as props to all three views (`PipelineWalkthrough`, `VariantsComparison`, `CompareSimulatedVsReal`) (depends on T018, T009)
- [ ] T021 [US2] Swap `createOpenAICompatibleProvider(...)` for `createTrackedProvider(realMode, onCostLedgerAppend)` in `src/concepts/rag/pipeline/steps/RetrievalStep.tsx` (corpus-embed effect, query-embed effect, and the chunk-size sweep's per-point embeds), gated by a `CostWarningBanner` threshold check before each real-call-triggering action (depends on T017, T019, T020)
- [ ] T022 [P] [US2] Swap `createOpenAICompatibleProvider(...)` for `createTrackedProvider(realMode, onCostLedgerAppend)` in `src/concepts/rag/pipeline/steps/EmbeddingStep.tsx`, gated by the same threshold check (depends on T017, T019, T020)
- [ ] T023 [P] [US2] Swap `createOpenAICompatibleProvider(...)` for `createTrackedProvider(realMode, onCostLedgerAppend)` in `src/concepts/rag/pipeline/steps/GenerationStep.tsx`, gated by the same threshold check (depends on T017, T019, T020)
- [ ] T024 [US2] Swap `createOpenAICompatibleProvider(...)` for `createTrackedProvider(realMode, onCostLedgerAppend)` in `src/concepts/rag/variants/VariantsComparison.tsx`'s `runNaive`/`runHyde`/`runFusion`, gated by the same threshold check before each Run button fires (depends on T017, T019, T020)
- [ ] T025 [P] [US2] Swap `createOpenAICompatibleProvider(...)` for `createTrackedProvider(realMode, onCostLedgerAppend)` in `src/concepts/rag/variants/EvalPanel.tsx`, gated by the same threshold check before the evaluation run (depends on T017, T019, T020)
- [ ] T026 [US2] Swap `createOpenAICompatibleProvider(...)` for `createTrackedProvider(realMode, onCostLedgerAppend)` in `src/concepts/rag/compareReal/CompareSimulatedVsReal.tsx` (built in US1, T007), gated by the same threshold check -- completes US1+US2's integration (depends on T017, T019, T020, T007)
- [ ] T027 [US2] Wire `onLedgerResetPrompt()` into each view's existing doc-change/reset handlers: `PipelineWalkthrough.tsx`'s `handleDocSelect`, `VariantsComparison.tsx`'s `handleDocSelect`/`handleUseCustomDocument`/`handleRevertToSample`, `CompareSimulatedVsReal.tsx`'s own doc-change handler, and `FailurePresetPicker`'s reset-to-defaults control (FR-006) (depends on T020)
- [ ] T028 [P] [US2] Create `scripts/checks/cost-ledger-sum.ts` (SC-002): for each configuration (naive/hyde/fusion) at a representative parameter value, runs a fake resolving provider through `createLedgerTrackingProvider` for that configuration's real call sequence and asserts the resulting ledger's summed total and call count exactly match `costEstimateUsd()`/`callsPerConfiguration()`'s own pre-call estimate. Additionally runs one fixture where the fake provider rejects partway through a multi-call sequence (e.g. fails on the 2nd of 3 calls), asserting the ledger total reflects only the calls that resolved before the rejection (Edge Cases: "a failed call that made no billable request should not be added to the total"); add a `check:real-mode-depth` npm script running it (depends on T016, T017)
- [ ] T029 [P] [US2] Create `tests/real-mode-depth/cost-ledger-accumulation.spec.ts` (SC-002, FR-006): mocked provider, 3+ real actions across different steps/views, displayed total matches the sum of individual actions' own estimates and persists across navigation. Additionally asserts FR-006's reset-prompt behavior: with a non-zero total, trigger a document change and confirm the prompt appears; clicking "Reset total" zeroes the displayed total, while clicking "Keep accumulating" (in a separate case) leaves it unchanged. Also asserts the Edge Cases entry "switches away from Real Mode entirely mid-session": with a non-zero total, toggle Real Mode off via `RealModeToggle` and back on, confirming the displayed total and `entries` count are unchanged throughout (depends on T021-T026)
- [ ] T030 [P] [US2] Create `tests/real-mode-depth/warning-threshold.spec.ts` (SC-004): mocked provider, deliberately cross a low custom threshold, assert the warning appears before, not after, the next real call, and that "Proceed anyway" still allows it through (depends on T021-T026)
- [ ] T031 [P] [US2] Create `tests/a11y/cost-ledger.spec.ts`: ledger display, reset-prompt banner, warning banner -- keyboard + axe (depends on T020, T027)
- [ ] T032 [US2] Manual scenario validation: quickstart.md scenarios 7-13 (ledger persists and sums correctly, reset prompt on document/state change, warning threshold, cost figures always labeled as estimates, failed-call billing exclusion, ledger survives navigation but resets on refresh, ledger survives switching Real Mode off mid-session)

**Checkpoint**: US1 + US2 together complete spec.md 004's full scope; SC-002's hard gate (roadmap.md) is verifiable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Wire this feature's checks into the project-wide aggregate and confirm no regression.

- [ ] T033 Wire `tests/real-mode-depth/*.spec.ts`, `tests/a11y/compare-simulated-vs-real.spec.ts`, and `tests/a11y/cost-ledger.spec.ts` into `check:real-mode-depth`'s Playwright half; add `check:real-mode-depth` to `check:all` in `package.json` (depends on T010, T011, T012, T028, T029, T030, T031)
- [ ] T034 Run the Milestone 1+2+3 regression pass: re-run `specs/001-core-platform-rag-module/quickstart.md`, `specs/002-real-mode/quickstart.md`, and `specs/003-parameter-exploration/quickstart.md`'s scenario 0 with this feature's controls untouched, confirming every existing real-call site behaves identically now that its provider construction routes through `createTrackedProvider` (depends on T021-T026)
- [ ] T035 Run `npm run check:all` (extensibility, disclosure, determinism, a11y, key-isolation, real-mode, parameter-exploration, real-mode-depth) plus `npm run build` and `npx eslint .`, and fix any failure (depends on T033, T034)

**Checkpoint**: spec.md 004's Definition of Done is met.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Empty -- nothing blocks Phase 3
- **User Story 1 (Phase 3)**: Depends only on Setup. No dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends on Setup. Its integration tasks (T026, T027) depend on US1's `CompareSimulatedVsReal.tsx` existing (T007) -- this is the one intentional cross-story touch point research.md's provider-decorator decision creates; everything else in US2 (T014-T025, T028-T031) touches only pre-existing files or US2's own new module.
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each User Story

- Types before the components that consume them (T004 before T005; T014/T015 before T016/T017)
- Simulated half before Real half before pairing (T005 before T007 before T008)
- Components before `RagConcept.tsx` wiring (T005 before T009; T018 before T020)
- Ledger primitives before the provider decorator before the five/six call-site swaps (T014-T017 before T021-T026)
- Automated checks/tests can proceed in parallel with each other once their target files exist
- Manual scenario validation last, once everything else in the story is done

### Parallel Opportunities

- T002/T003 (Setup directory scaffolds) can run in parallel
- T010/T011/T012 (US1's check/test files) can run in parallel once T009 is done
- T014/T015 (US2's two type/pricing files) can run in parallel
- T022/T023/T025 (three of US2's independent call-site swaps -- EmbeddingStep, GenerationStep, EvalPanel) can run in parallel once T017/T019/T020 are done; T021/T024/T026 touch files with more surrounding state and are listed sequentially but have no hard technical conflict with the [P] group
- T028/T029/T030/T031 (US2's checks/tests) can run in parallel once T021-T027 are done

---

## Parallel Example: User Story 2's call-site swaps

```bash
# Once T017 (trackedProvider.ts), T019 (CostWarningBanner), and T020 (RagConcept.tsx wiring) are done,
# launch three of the five/six call-site swaps together:
Task: "Swap provider construction in src/concepts/rag/pipeline/steps/EmbeddingStep.tsx"
Task: "Swap provider construction in src/concepts/rag/pipeline/steps/GenerationStep.tsx"
Task: "Swap provider construction in src/concepts/rag/variants/EvalPanel.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (comparison view)
3. **STOP and VALIDATE**: quickstart.md scenarios 1-6
4. Deploy/demo if ready -- this is a genuine, independently useful increment even without US2, since US1 reuses the existing call-count-only disclosure pattern rather than depending on the cost ledger

Note: spec.md 004's own Definition of Done (roadmap.md) requires both stories -- SC-002's cost-ledger-sum check is a hard gate. Treat "MVP" here as the first deliverable increment if time-constrained mid-implementation, not as a reduced final scope.

### Incremental Delivery

1. Complete Setup -> ready for either story
2. Add User Story 1 -> test independently (quickstart.md 1-6)
3. Add User Story 2 -> test independently (quickstart.md 7-12) -- full milestone scope complete
4. Polish -> full `check:all` + regression pass

### Parallel Team Strategy

With multiple developers: Developer A takes US1 (T004-T013) while Developer B starts US2's ledger primitives and standalone components (T014-T020, T028) in parallel, since none of that depends on US1. Developer B's call-site swaps for the five pre-existing files (T021-T025) can proceed as soon as T017/T019/T020 are done, independent of US1's progress; only T026 (the `CompareSimulatedVsReal.tsx` swap) waits on Developer A's T007.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable, except US2's two tasks (T026, T027's `CompareSimulatedVsReal.tsx` portion) that integrate with US1's output by design
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
