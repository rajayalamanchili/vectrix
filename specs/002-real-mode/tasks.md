---

description: "Task list for Real Mode for the RAG Concept Module"
---

# Tasks: Real Mode for the RAG Concept Module

**Input**: Design documents from `/specs/002-real-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: This feature's automated checks (`scripts/checks/*.ts`, `tests/a11y/real-mode.spec.ts`, `tests/real-mode/*.spec.ts`) are not optional TDD scaffolding -- they are the literal verification mechanism spec.md's Success Criteria (SC-004, SC-005, SC-006, SC-007, SC-008, SC-009) require and that `contracts/real-mode-automated-checks-contract.md` documents as deliverables. They are included as regular tasks within each story, matching Milestone 1's own precedent (built alongside implementation, not a separate upfront TDD pass).

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2/P2/P2/P3). Unlike a fully independent story set, spec.md's own "Why this priority" text names explicit cross-story dependencies (US2 needs US1's toggle/key; US3 needs US2's real embeddings; US5 needs US2-US4 all existing; US6 needs US5's executable variants) -- these are preserved below rather than assumed away.

**Revision note (2026-08-06)**: Two `/speckit.analyze` command invocations against this file (plus this note's own fix round) found and closed fifteen gaps total, in four rounds. Round 1, from analyze pass 1 (four HIGH/CRITICAL): **C1** (CRITICAL, Constitution Principle VII) -- US6's evaluation controls had no accessibility-check task; fixed via task T054. **F1** (HIGH, inconsistency) -- FR-004 requires both the Embedding *and* Retrieval steps to visibly disclose real-mode status, but only `EmbeddingStep` had a task; fixed by expanding T018/T020. **E1** (HIGH, coverage gap) -- SC-004's "100%" wasn't verifiably closed because the failure-path tests only named 3 broad buckets instead of FR-016's 7 canonical call types; fixed by expanding T021/T044. **E2** (HIGH, coverage gap) -- SC-005 had no automated check at all; fixed via task T047. Round 2, from analyze pass 2 (three MEDIUM/LOW): **C2** -- the temperature control task didn't mention spec.md's required near-zero-temperature disclaimer copy; fixed by expanding T029. **C3** -- spec.md had no partial-failure behavior defined for a multi-pair evaluation run; fixed via a new spec.md Edge Case/FR-011 addition and task T052. **L1** -- FR-016's `eval-retrieve` call type was never referenced by name; fixed by expanding T050. Round 3, surfaced within analyze pass 2's own report as self-consistency issues Round 2's fixes introduced (five): **N1** -- data-model.md's `RealModeError.kind` description still called `"partial-failure"` RAG-Fusion/HyDE-specific, contradicting C3's own fix; fixed in data-model.md. **N2** -- this file's manual-validation task claimed quickstart.md scenario 12 covered partial-failure resume behavior when it didn't yet; fixed by extending quickstart.md scenario 12 and now T055 below. **N3** -- plan.md/research.md weren't updated for round 2 the way they were for round 1; fixed with matching updates there. **N4** -- spec.md's Status line was stale; fixed. **N5** -- T052's partial-failure handling had no automated regression test, unlike its HyDE/RAG-Fusion sibling; fixed via new task T053. Round 4, from analyze pass 3 -- a confirming pass that found only documentation-bookkeeping drift from Round 3's own fixes, no functional gaps (three, all MEDIUM/LOW): **P1** -- spec.md's Status line's task/finding counts went stale again the moment N5 added a task; fixed. **P2** -- this file's Project Structure counterpart in plan.md didn't mention N5's new eval-pair-failure test case; fixed in plan.md. **P3** -- this note's own "pass" labeling didn't match actual `/speckit.analyze` invocation count; fixed by this rewrite. Task count: 55 (original) -> 57 (round 1) -> 58 (round 2) -> 59 (round 3, N5's new task; unchanged by round 4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- File paths are relative to the repo root

## Path Conventions

Single Next.js project (existing, per plan.md's Structure Decision -- no new top-level directories). All new files live inside `src/concepts/rag/realMode/` (new subfolder), `scripts/checks/`, or `tests/`.

---

## Phase 1: Setup

**Purpose**: Confirm the baseline before any Real Mode change lands.

- [ ] T001 Run `npm run build` and `npm run dev` on branch `002-real-mode` to confirm Milestone 1's build/dev server are unaffected before Real Mode work begins
- [ ] T002 [P] Create the `src/concepts/rag/realMode/` directory as the home for all new Real Mode-only modules

**Checkpoint**: Baseline confirmed clean; scaffold ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The provider abstraction, shared types, lifted state, and shared error UI every user story calls into. No user story can be implemented until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Define all Real Mode types in `src/concepts/rag/realMode/types.ts` (`RealModeSession`, `ProviderConfig`, `RealModeError`, `RealEmbeddingResult`, `VariantExecutionTrace`, `EvalPair`, `RecallResult`, `GenerationParams`) per data-model.md
- [ ] T004 [P] Create the one shipped `ProviderConfig` value (OpenAI: `text-embedding-3-small` / `gpt-4o-mini`, `keyFormatPattern: /^sk-/`) in `src/concepts/rag/realMode/providerConfigs.ts` per contracts/real-mode-provider-contract.md
- [ ] T005 [P] Implement `RealModeProvider` (`embedBatch()`, `generate()`) in `src/concepts/rag/realMode/openaiCompatibleProvider.ts` per contracts/real-mode-provider-contract.md, including the `RealModeError.kind` mapping (401→`invalid-key`, 429→`rate-limit`, `fetch` throw→`network`, other non-2xx→`other`) and a 30-second per-call timeout (spec.md Edge Cases)
- [ ] T006 [P] Implement the hand-rolled 2-component PCA projection (fixed start vector, fixed iteration count) in `src/concepts/rag/realMode/pca.ts` per research.md
- [ ] T007 [P] Implement call-count formulas in `src/concepts/rag/realMode/callEstimate.ts`: naive=3, HyDE=`M + 3`, RAG-Fusion=`N + 3`, and the evaluation-run total `evalPairs.length * configurationsTested.length * callsPerConfiguration(configurationId)` per FR-010/FR-011/FR-013/FR-016
- [ ] T008 Lift `RealModeSession` and `GenerationParams` state into `src/concepts/rag/RagConcept.tsx`, defaulting to inactive/default values so every downstream prop threading defaults to Simulated Mode (FR-001, SC-002)
- [ ] T009 [P] Implement shared `ErrorBanner.tsx` in `src/concepts/rag/realMode/ErrorBanner.tsx`: FR-007's error message + fallback-to-Simulated-Mode action, `role="alert"`/`aria-live` announcement (FR-015), and a Retry action that re-issues only the call named by `RealModeError.stage` (resume, not restart)
- [ ] T010 [P] Implement the static half of SC-006 in `scripts/checks/key-isolation.ts` (fails if any Next.js server-route file exists) and wire a `check:key-isolation` npm script in `package.json`

**Checkpoint**: Foundational infrastructure ready -- user story implementation can now begin.

---

## Phase 3: User Story 1 - Toggle into Real Mode without losing the free experience (Priority: P1) 🎯 MVP (part 1 of 2)

**Goal**: A single, clearly labeled Real Mode toggle; a key-entry prompt with disclaimer and format pre-validation; the key retained across a toggle-off/toggle-on within one session.

**Independent Test**: Open the RAG module with no API key configured, confirm Simulated Mode is unaffected, then activate Real Mode and confirm the app asks for a key only at that point.

### Implementation for User Story 1

- [ ] T011 [US1] Implement `RealModeToggle.tsx` in `src/concepts/rag/realMode/RealModeToggle.tsx`: the toggle control (FR-002) and the key-entry prompt rendering both disclaimer halves (where-it's-sent + at-your-own-risk, data-model.md's copy) inside an element carrying `data-key-disclaimer="true"` (FR-003), reappearing on every toggle-on
- [ ] T012 [US1] Add key-format pre-validation (against `ProviderConfig.keyFormatPattern`) and correction-in-place error handling to `RealModeToggle.tsx`: the input retains its value, shows distinct wording for malformed-shape vs. live-rejected, and the error is `aria-describedby`-associated with the input (FR-003, FR-015)
- [ ] T013 [US1] Wire `RealModeToggle` into `src/concepts/rag/RagConcept.tsx`'s render, threading `RealModeSession` to `PipelineWalkthrough` and `VariantsComparison` (both default inactive)
- [ ] T014 [US1] [P] Extend `scripts/checks/simulated-disclosure.ts` with the `data-key-disclaimer` rule (non-empty content, both disclaimer halves present) per FR-003
- [ ] T015 [US1] [P] Create `tests/a11y/real-mode.spec.ts` covering the Real Mode toggle and API key input (Tab reachability, visible focus indicator, Enter/Space activation, non-generic accessible name) plus the key-format error's `aria-describedby` association (SC-009, FR-015)
- [ ] T016 [US1] Manual scenario validation: quickstart.md scenarios 1-2 (zero-setup preserved; key prompt + disclaimer + malformed-key correction-in-place)

**Checkpoint**: US1 independently functional -- toggle, key entry/validation/disclaimer complete, Simulated Mode fully unaffected.

---

## Phase 4: User Story 2 - See real embedding geometry instead of the simulation (Priority: P1) 🎯 MVP (part 2 of 2)

**Goal**: The Embedding and Retrieval steps use a real embeddings API response, projected via PCA, visibly disclosed as real -- on both steps independently.

**Independent Test**: With a real key configured and Real Mode active, run the pipeline and confirm the chart is computed from a real API response, not `mockEmbedding.ts`, and disclosed as real.

### Implementation for User Story 2

- [ ] T017 [US2] [P] Add the real `embedBatch()` + PCA projection path to `src/concepts/rag/pipeline/steps/EmbeddingStep.tsx`, replacing the mock/fixed `PROJECTION` matrix when `realMode.active`, naming provider + "PCA", rendering `data-real-disclosure="true"` (FR-004)
- [ ] T018 [US2] [P] Add the real query-embedding path to `src/concepts/rag/pipeline/steps/RetrievalStep.tsx` (existing cosine-similarity scoring is reused unchanged, already provider-agnostic over `number[]`), **and** render its own `data-real-disclosure="true"` marker naming provider + projection method (FR-004 names both the Embedding and Retrieval steps explicitly -- `/speckit.analyze` finding F1, 2026-08-06: this marker must not be assumed to carry over from `EmbeddingStep`)
- [ ] T019 [US2] Wire `ErrorBanner` into `EmbeddingStep.tsx` for embeddings-call failures (clear error + fallback to Simulated Mode, Acceptance Scenario 2)
- [ ] T020 [US2] [P] Extend `scripts/checks/simulated-disclosure.ts` with the `data-real-disclosure` rule for **both** `EmbeddingStep` and `RetrievalStep` (provider + projection method named on each, independently) per FR-004 (`/speckit.analyze` finding F1, 2026-08-06)
- [ ] T021 [US2] [P] Create `tests/real-mode/failure-fallback.spec.ts` covering the `corpus-embed` and `query-embed` failure paths as two distinct mocked cases (401/429/network mocked via route interception, per FR-016's canonical call-type list -- `/speckit.analyze` finding E1, 2026-08-06) -> specific error + working fallback (SC-004)
- [ ] T022 [US2] [P] Create `tests/real-mode/key-isolation.spec.ts` (dynamic half of SC-006): mocked provider, a full Real Mode flow through the Embedding step, asserting via `page.on('request')` that no captured request containing the key targets a non-provider origin
- [ ] T023 [US2] Manual scenario validation: quickstart.md scenarios 3-4 (real embedding chart timed from key submission per SC-003; embedding failure fallback with live-region announcement)

**Checkpoint**: US1 + US2 together are the meaningful MVP -- Real Mode's core, differentiating fidelity gap is closed and independently demonstrable.

---

## Phase 5: User Story 3 - Use your own document and question (Priority: P2)

**Goal**: Learner-pasted document/question replace the sample ones across every downstream step, with a 10,000-character limit and a clean revert path back to a sample document.

**Independent Test**: Paste a custom document/question in Real Mode and confirm every downstream step uses it, with no code path still silently using the sample documents.

### Implementation for User Story 3

- [ ] T024 [US3] Implement `CustomDocumentInput.tsx` in `src/concepts/rag/realMode/CustomDocumentInput.tsx`: paste textarea with the 10,000-character limit enforced client-side before any API call (FR-005), and a "revert to sample" control that clears `customText`/`customQuestion` and restores the sample question set (User Story 3 Scenario 3)
- [ ] T025 [US3] Add independent `CustomDocumentInput` state (`mode`/`customText`/`customQuestion`) to `src/concepts/rag/pipeline/PipelineWalkthrough.tsx` and thread it to `src/concepts/rag/pipeline/steps/DocumentStep.tsx`, replacing the sample document/questions downstream when `mode === "custom"`
- [ ] T026 [US3] [P] Extend `tests/a11y/real-mode.spec.ts` with the custom-document textarea and custom-question input (SC-009, FR-015)
- [ ] T027 [US3] Manual scenario validation: quickstart.md scenarios 5-6 (custom document replaces sample downstream + oversized-document rejection; revert-to-sample clears custom state)

**Checkpoint**: US1-US3 all independently functional.

---

## Phase 6: User Story 4 - Get a real generated answer (Priority: P2)

**Goal**: The Generation step sends the exact displayed prompt to a real model, with a learner-adjustable temperature control whose effect is directly observable.

**Independent Test**: With Real Mode active end-to-end, confirm the prompt shown is sent to a real model and the displayed answer is that model's actual response, labeled as real.

### Implementation for User Story 4

- [ ] T028 [US4] Add the real `generate()` call path to `src/concepts/rag/pipeline/steps/GenerationStep.tsx`, sending the exact displayed assembled prompt, rendering `data-real-disclosure="true"` with "Real answer via [provider]" (FR-006)
- [ ] T029 [US4] Add the learner-adjustable temperature control (0.0-1.0, step 0.1, default 0.3, FR-012) to `GenerationStep.tsx`, wired to `GenerationParams` in `RagConcept.tsx`, passed through unchanged to `RealModeProvider.generate()`, **and** render the required disclaimer that near-zero temperature means "very consistent," not "guaranteed identical" (spec.md Edge Cases -- `/speckit.analyze` finding C2, 2026-08-06: previously unmentioned in this task, easy to build the slider without it)
- [ ] T030 [US4] Wire `ErrorBanner` into `GenerationStep.tsx` for generation-call failures (retry or fallback, explicitly labeled if fallback is used -- Acceptance Scenario 2)
- [ ] T031 [US4] [P] Extend `scripts/checks/simulated-disclosure.ts` with the `data-real-disclosure` rule for `GenerationStep` per FR-006
- [ ] T032 [US4] [P] Extend `tests/real-mode/failure-fallback.spec.ts` with the `final-generate` failure path (SC-004, FR-016)
- [ ] T033 [US4] [P] Create `tests/real-mode/temperature-effect.spec.ts`: mocked high-temperature responses that differ across two runs of the same prompt, and mocked low-temperature responses that are byte-identical across two runs (SC-007)
- [ ] T034 [US4] [P] Extend `tests/a11y/real-mode.spec.ts` with the temperature control (SC-009, FR-015)
- [ ] T035 [US4] Manual scenario validation: quickstart.md scenario 7 (real generation + observable temperature effect)

**Checkpoint**: US1-US4 all independently functional -- the full pipeline is real end-to-end.

---

## Phase 7: User Story 5 - Run a RAG variant for real, not just read about it (Priority: P2)

**Goal**: HyDE and RAG-Fusion genuinely execute in Real Mode with intermediate steps surfaced, learner-adjustable M/N, a pre-execution call-count estimate, fail-closed + resume-not-restart retry on a mid-sequence failure, and an honest disabled affordance for the three non-executable variants.

**Independent Test**: Select HyDE, provide a document/question, and confirm the app actually generates a hypothetical answer, embeds it, retrieves against it, and shows a real, executed result distinct from naive RAG's.

**Depends on**: US2 (real embeddings), US4 (real generation) -- per spec.md's own "Why this priority" text, executing a variant means chaining real embedding, retrieval, and generation calls that must already exist.

### Implementation for User Story 5

- [ ] T036 [US5] Add independent document/query state to `src/concepts/rag/variants/VariantsComparison.tsx` (its own `CustomDocumentInput` instance, per research.md's independent-state decision -- not shared with Pipeline Walkthrough)
- [ ] T037 [US5] Implement naive-RAG real execution in `VariantsComparison.tsx`: embed corpus, embed query, retrieve, generate -- populate `VariantExecutionTrace` (`variantId: "naive"`, `callCount: 3`)
- [ ] T038 [US5] Implement HyDE real execution in `VariantsComparison.tsx`: generate M hypotheses serially (each individually visible, FR-014), batch-embed all M, average into one vector, retrieve once against the average, generate the final answer -- populate `VariantExecutionTrace` (`variantId: "hyde"`, `callCount: M + 3`), with `hypotheses[]` appended one element per completed call (FR-008)
- [ ] T039 [US5] Implement RAG-Fusion real execution in `VariantsComparison.tsx`: generate N reworded queries in one call, embed and retrieve for each variant independently and serially, fuse via Reciprocal Rank Fusion -- populate `VariantExecutionTrace` (`variantId: "fusion"`, `callCount: N + 3`), with `queryVariants[]` appended one element per completed call (FR-008)
- [ ] T040 [US5] Add the RAG-Fusion N control (2-5, step 1, default 3, FR-013) and HyDE hypothesis-count control (1-3, step 1, default 1, FR-014) to `VariantsComparison.tsx`, wired to `GenerationParams`, with the pre-execution call-count estimate (`callEstimate.ts`) updating live and shown before Run (FR-010)
- [ ] T041 [US5] Implement mid-sequence fail-closed handling in `VariantsComparison.tsx`: on a HyDE/RAG-Fusion call failure, stop issuing further calls and surface `RealModeError` with `kind: "partial-failure"` and `stage` naming the failed call (spec.md Edge Cases)
- [ ] T042 [US5] Wire `ErrorBanner`'s retry-resume action (T009) into `VariantsComparison.tsx`'s HyDE/RAG-Fusion flow: Retry re-issues only the call named by `error.stage` and appends its result to the existing `VariantExecutionTrace`, never clearing/restarting the sequence (FR-007)
- [ ] T043 [US5] Add the `EXECUTABLE_VARIANT_IDS = ["naive", "hyde", "fusion"]` constant and disabled-Run-with-inline-explanation rendering ("Explanatory only this milestone") for GraphRAG/Self-RAG/Agentic RAG in `VariantsComparison.tsx` when Real Mode is active (FR-009)
- [ ] T044 [US5] [P] Extend `tests/real-mode/failure-fallback.spec.ts` with each of `hypothesis-embed`, `variant-embed`, `hypothesis-generate`, and `variant-query-generate` as four distinct mocked failure cases (FR-016 -- `/speckit.analyze` finding E1, 2026-08-06: previously only one generic "HyDE/RAG-Fusion intermediate call" case existed), asserting per case that Retry issues exactly one new request and the already-succeeded earlier results stay visible unchanged (SC-004, FR-007)
- [ ] T045 [US5] [P] Create `tests/real-mode/fusion-n-effect.spec.ts`: mocked RAG-Fusion runs at two different N values producing different fused rankings, asserting the top-1 chunk changes and the captured request count matches `N + 3` for each N (SC-008); wire the `check:real-mode` npm script (`playwright test tests/real-mode/`) and add both `check:key-isolation` and `check:real-mode` to the `check:all` aggregate
- [ ] T046 [US5] [P] Extend `tests/a11y/real-mode.spec.ts` with the RAG-Fusion N slider, HyDE hypothesis-count slider, and the disabled Run controls for GraphRAG/Self-RAG/Agentic RAG (SC-009, FR-015, and 001's disabled-control Tab-removal rule)
- [ ] T047 [US5] [P] Create `tests/real-mode/intermediate-steps-visible.spec.ts` (`/speckit.analyze` finding E2, 2026-08-06 -- SC-005 previously had no automated check at all): for a mocked HyDE run (M >= 2) and a mocked RAG-Fusion run (N >= 2), assert every intermediate element (each hypothesis; each query variant + its own per-variant ranking) is present in the DOM before the final averaged/fused result renders (SC-005)
- [ ] T048 [US5] Manual scenario validation: quickstart.md scenarios 8-11 (HyDE for real; RAG-Fusion for real; retry resumes not restarts; non-executable variants labeled honestly)

**Checkpoint**: US1-US5 all independently functional -- spec.md's single biggest lever ("make an expert take the tool seriously") is complete.

---

## Phase 8: User Story 6 - See a lightweight real evaluation, not just a vibe (Priority: P3)

**Goal**: A learner defines (question, expected chunk) pairs and gets a recall@K score per configuration, side by side, with a pre-execution call-count estimate.

**Independent Test**: Define a small set of pairs, run naive RAG and one variant against all of them, and see a recall@K number for each, side by side.

**Depends on**: US5 (needs at least one executable variant to compare naive RAG against).

### Implementation for User Story 6

- [ ] T049 [US6] Implement `EvalPanel.tsx` in `src/concepts/rag/variants/EvalPanel.tsx`: `EvalPair` authoring (question text + expected-chunk picker constrained to the active document's real chunk list, capped at 10 pairs, FR-011), reusing `VariantsComparison.tsx`'s document/query state
- [ ] T050 [US6] Implement recall@K scoring in `EvalPanel.tsx`: run each configuration's real retrieval per `EvalPair` (FR-016's `eval-retrieve` call type -- triggers no new call beyond whichever of the other canonical types the tested configuration already requires), score against the pipeline's current Top-K, compute `RecallResult` per configuration, shown side by side with the scoring method named in the UI
- [ ] T051 [US6] Add the pre-execution eval call-count estimate (`callEstimate.ts`'s eval formula) to `EvalPanel.tsx`, shown before Run, and disable Run with an explanatory message when zero pairs are defined (FR-011)
- [ ] T052 [US6] Implement partial-failure fail-closed handling in `EvalPanel.tsx` (`/speckit.analyze` finding C3, 2026-08-06 -- previously unaddressed in both spec.md and tasks.md): if one `EvalPair`'s retrieval call fails partway through a run, stop issuing further eval calls, keep every already-completed `RecallResult` visible, surface a `RealModeError` (`kind: "partial-failure"`, `stage: "eval:{evalPairId}:{configurationId}"`), and wire `ErrorBanner`'s retry-resume action (T009) to re-run only that one combination (FR-011, mirroring T042's HyDE/RAG-Fusion resume-not-restart pattern)
- [ ] T053 [US6] [P] Extend `tests/real-mode/failure-fallback.spec.ts` with one eval-pair-failure case (`/speckit.analyze` finding N5, 2026-08-06 -- T052's partial-failure handling previously had no automated regression coverage, unlike its HyDE/RAG-Fusion sibling in T044): with at least 3 `EvalPair`s and a mocked failure on the second pair's retrieval, assert the run stops there, the first pair's `RecallResult` stays visible, and Retry issues exactly one new request (the failed pair only)
- [ ] T054 [US6] [P] Extend `tests/a11y/real-mode.spec.ts` with `EvalPanel.tsx`'s controls -- the `EvalPair` question input, expected-chunk picker, pair-removal control, and evaluation Run control (SC-009, FR-015 -- `/speckit.analyze` finding C1, 2026-08-06: previously the only story with zero accessibility-check coverage, and a Constitution Principle VII gap)
- [ ] T055 [US6] Manual scenario validation: quickstart.md scenario 12 (recall@K evaluation, pre-run call-count disclosure, Top-K/recall relationship, and partial-failure resume behavior -- quickstart.md's scenario 12 extended to cover this, `/speckit.analyze` finding N2, 2026-08-06)

**Checkpoint**: All six user stories independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Regression proof and final sign-off across all six stories.

- [ ] T056 Run the Milestone 1 regression pass: re-run every manual scenario and `npm run check:*` command from `specs/001-core-platform-rag-module/quickstart.md` with Real Mode present but never toggled on (SC-001, SC-002; quickstart.md step 0)
- [ ] T057 Run `npm run check:all` (extensibility, disclosure, a11y, determinism, key-isolation, real-mode) and fix any failure
- [ ] T058 One real end-to-end manual run against the live OpenAI API with a real, never-committed key: confirm Real Mode activation, a real embedding chart, a real generated answer, and HyDE/RAG-Fusion executing with visible intermediate steps (contracts/real-mode-automated-checks-contract.md's "Manual verification" section)
- [ ] T059 Full quickstart.md 12-scenario re-run as the closing verification, mirroring Milestone 1's T051 precedent

**Checkpoint**: spec.md 002's Definition of Done is met.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- start immediately.
- **Foundational (Phase 2)**: Depends on Setup -- BLOCKS all user stories.
- **US1 (Phase 3)**: Depends only on Foundational.
- **US2 (Phase 4)**: Depends on Foundational; needs US1's toggle/key-entry to have somewhere to activate Real Mode from, so build after US1 even though its own files don't overlap.
- **US3 (Phase 5)**: Depends on Foundational; spec.md's "Why this priority" names US2's real embeddings as a prerequisite ("real embeddings of a fixed sample document are a smaller, safer slice to ship before opening up arbitrary user input").
- **US4 (Phase 6)**: Depends on Foundational; spec.md scopes it below US2 in priority but not as a hard code dependency.
- **US5 (Phase 7)**: Depends on US2 AND US4 -- spec.md is explicit: "executing a variant means running real embedding, retrieval, and generation calls in a specific sequence."
- **US6 (Phase 8)**: Depends on US5 -- needs at least one executable variant to compare naive RAG against.
- **Polish (Phase 9)**: Depends on all six stories being complete.

### Within Each User Story

- Foundational types/provider/state before any story-specific UI.
- Core execution/rendering logic before its failure-handling wrapper (`ErrorBanner` wiring).
- Implementation before the automated checks/specs that verify it.
- Automated checks before the manual quickstart.md scenario validation that closes out the story.

### Parallel Opportunities

- Foundational: T004-T007 and T009-T010 (five independent new files) can run in parallel once T003's types exist.
- US1: T014 (script) and T015 (new spec file) can run in parallel once T011-T013 are done.
- US2: T017 and T018 (different step files) can run in parallel; T020-T022 (three independent check/spec files) can run in parallel once T017-T019 are done.
- US4: T031-T034 (four independent check/spec files) can run in parallel once T028-T030 are done.
- US5: T044-T047 (four independent check/spec files, including the new intermediate-steps-visible.spec.ts) can run in parallel once T036-T043 are done.
- US6: T053 (eval-pair-failure test) and T054 (a11y spec extension) can run in parallel with each other once T052 (partial-failure handling) is done, and both must precede T055 (manual validation).
- Different user story phases cannot run in parallel with each other where a dependency is named above (US2→US3, US2+US4→US5, US5→US6); US1 and Foundational's own [P] tasks are the main concurrency opportunities before that chain kicks in.

---

## Parallel Example: Foundational Phase

```bash
# After T003 (types.ts) completes, launch together:
Task: "Create the shipped OpenAI ProviderConfig in src/concepts/rag/realMode/providerConfigs.ts"
Task: "Implement RealModeProvider in src/concepts/rag/realMode/openaiCompatibleProvider.ts"
Task: "Implement PCA projection in src/concepts/rag/realMode/pca.ts"
Task: "Implement call-count formulas in src/concepts/rag/realMode/callEstimate.ts"
Task: "Implement ErrorBanner.tsx in src/concepts/rag/realMode/ErrorBanner.tsx"
Task: "Implement the static half of SC-006 in scripts/checks/key-isolation.ts"
```

## Parallel Example: User Story 2

```bash
# Launch together (different step files):
Task: "Add real embedBatch()+PCA path + data-real-disclosure marker to src/concepts/rag/pipeline/steps/EmbeddingStep.tsx"
Task: "Add real query-embedding path + data-real-disclosure marker to src/concepts/rag/pipeline/steps/RetrievalStep.tsx"

# After implementation, launch together (independent check/spec files):
Task: "Extend scripts/checks/simulated-disclosure.ts with the data-real-disclosure rule for both EmbeddingStep and RetrievalStep"
Task: "Create tests/real-mode/failure-fallback.spec.ts for the corpus-embed and query-embed failure paths"
Task: "Create tests/real-mode/key-isolation.spec.ts (dynamic half of SC-006)"
```

## Parallel Example: User Story 5 (post-implementation checks)

```bash
# After T036-T043 (implementation) complete, launch together:
Task: "Extend tests/real-mode/failure-fallback.spec.ts with hypothesis-embed/variant-embed/hypothesis-generate/variant-query-generate failure cases"
Task: "Create tests/real-mode/fusion-n-effect.spec.ts"
Task: "Extend tests/a11y/real-mode.spec.ts with N slider, hypothesis-count slider, disabled Run controls"
Task: "Create tests/real-mode/intermediate-steps-visible.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

US1 alone only proves the toggle/key-entry flow -- it has no observable "real" output. Per spec.md's own priority rationale, US2 ("the single highest-value fidelity gap") is what makes Real Mode real. Treat US1+US2 together as the MVP:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL -- blocks all stories)
3. Complete Phase 3: US1
4. Complete Phase 4: US2
5. **STOP and VALIDATE**: quickstart.md scenarios 1-4 end-to-end against a real key
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 + US2 → real embedding chart demonstrable (MVP).
3. US3 → custom documents.
4. US4 → real generation + temperature.
5. US5 → HyDE/RAG-Fusion executable for real (the biggest remaining lever).
6. US6 → recall@K evaluation.
7. Polish → full regression + real end-to-end run + final quickstart.md pass.

Each story after the MVP adds value without breaking the ones before it, but per the Dependencies section above, US3, US5, and US6 have real (not just priority-ordering) prerequisites on earlier stories -- they are not safely parallelizable across a team the way a fully independent story set would be.

---

## Notes

- [P] tasks = different files, no dependency on an incomplete task.
- [Story] label maps task to specific user story for traceability.
- Automated checks/specs are mandated deliverables (spec.md SC-004/005/006/007/008/009), not optional TDD scaffolding -- see the Tests note at the top of this document.
- Manual quickstart.md scenario tasks close out each story, mirroring Milestone 1's T036/T044/T051 pattern (roadmap.md).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
