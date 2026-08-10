---

description: "Task list for Parameter Exploration & Sharing"
---

# Tasks: Parameter Exploration & Sharing

**Input**: Design documents from `/specs/003-parameter-exploration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: This feature's automated checks (`scripts/checks/permalink-safety.ts`, `scripts/checks/failure-presets.ts`, `tests/a11y/parameter-exploration.spec.ts`, `tests/parameter-exploration/*.spec.ts`) are not optional TDD scaffolding -- they are the literal verification mechanism spec.md's Success Criteria (SC-001, SC-002, SC-003, SC-004, SC-005) require and that `contracts/sweep-contract.md`, `contracts/permalink-contract.md`, and `contracts/failure-preset-contract.md` document as deliverables. They are included as regular tasks within each story, matching Milestones 1-2's own precedent.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2). Unlike Milestone 2, research.md's "where state lives" decision found the three stories genuinely independent -- none shares a provider abstraction or lifted state the way Milestone 2's stories shared `RealModeProvider`. The Foundational phase below is correspondingly thin: one core-file edit (`page.tsx`'s `<Suspense>` wrapper), done once up front because it's story-agnostic, not because any story blocks on another.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1-US3)
- File paths are relative to the repo root

## Path Conventions

Single Next.js project (existing, per plan.md's Structure Decision -- no new top-level directories). New code lives in three new subfolders under `src/concepts/rag/` (`sweep/`, `permalink/`, `failurePresets/`), plus `scripts/checks/` and `tests/`.

---

## Phase 1: Setup

**Purpose**: Confirm the baseline before any change lands, and scaffold this feature's three new subfolders.

- [ ] T001 Run `npm run build` and `npm run dev` on branch `003-parameter-exploration` to confirm Milestones 1-2's build/dev server are unaffected before this feature's work begins
- [ ] T002 [P] Create the `src/concepts/rag/sweep/` directory (US1's home)
- [ ] T003 [P] Create the `src/concepts/rag/permalink/` directory (US2's home)
- [ ] T004 [P] Create the `src/concepts/rag/failurePresets/` directory (US3's home)

**Checkpoint**: Baseline confirmed clean; scaffolds ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one core-file change every later `useSearchParams()` call depends on. No user story work can begin until this is in place.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Wrap `<Component />` in `<Suspense>` (with a minimal fallback) in `src/app/concepts/[conceptId]/page.tsx` -- required by `useSearchParams()`'s static-rendering constraint on this statically-generated route (research.md's Next.js-docs finding: a production build fails without it). The wrapper carries no `concept.id`-keyed logic, so `check:extensibility` is unaffected. Re-run `npm run build` afterward to confirm it still succeeds.

**Checkpoint**: Foundational prerequisite in place -- user story implementation can now begin. Unlike Milestone 2, no shared provider/type abstraction is needed here (research.md); each story below is otherwise self-contained.

---

## Phase 3: User Story 1 - See a sensitivity curve, not just one point (Priority: P1) 🎯 MVP (part 1 of 2)

**Goal**: A 9-point chunk-size sweep curve on the Retrieval step, keyboard-navigable, each point jumping the pipeline to that exact configuration, gated by an explicit cost estimate in Real Mode.

**Independent Test**: On the Retrieval step with a document and question selected, activate a sweep on chunk size, and confirm a curve renders showing top-1 similarity score across the fixed range, with no manual re-running required per point.

### Implementation for User Story 1

- [ ] T006 [P] [US1] Implement `generateSweepChunkSizes()` and `runSimulatedSweep()` in `src/concepts/rag/sweep/runSweep.ts` per contracts/sweep-contract.md: the fixed 9-value range (`[20, 35, 45, 60, 70, 85, 95, 110, 120]`), per-point overlap clamping (`Math.min(overlap, chunkSize - 5)`), and the top-1 similarity score metric (`ranked[0]?.score ?? 0`, computed before threshold/Top-K filtering) using the existing `chunkText`/`chunkTextBySentence`/`embed`/`cosineSimilarity` functions
- [ ] T007 [P] [US1] Implement `sweepCallEstimate()` in `src/concepts/rag/sweep/sweepCallEstimate.ts`: `pointCount + 1` (9 corpus-embeds + 1 shared query-embed), matching `callEstimate.ts`'s existing pure-formula style
- [ ] T008 [US1] Implement `SweepCurve.tsx` in `src/concepts/rag/sweep/SweepCurve.tsx`: a decorative `aria-hidden` SVG line/axis background sized via `StarChart.tsx`'s screen-space math, with one native `<button>` per `SweepPoint` absolutely positioned on top -- individually focusable and Enter/Space-activatable, accessible name stating chunk size and score, `disabled` while `status !== "done"`, plus a "doesn't move the outcome much here" caption when the score range across `"done"` points is below 0.02 (FR-002, FR-004, Constitution VII) -- depends on T006's `SweepPoint` type
- [ ] T009 [US1] Add sweep state (`SweepState`, a `sweepToken` cancellation counter per research.md's cancel-and-replace decision) and Simulated-Mode instant-run wiring to `src/concepts/rag/pipeline/steps/RetrievalStep.tsx`, rendering `SweepCurve` below the existing `StarChart` (depends on T006, T008)
- [ ] T010 [US1] Add Real Mode sweep execution to `RetrievalStep.tsx`: an `awaiting-confirmation` status showing `sweepCallEstimate()`'s estimate next to a "Start sweep" button (FR-003's confirmation gate), then sequential per-point `embedBatch()` calls reusing one shared query embedding fetched once, with a failed point's error handled without aborting the remaining points (contracts/sweep-contract.md) (depends on T007, T009)
- [ ] T011 [US1] Add an `onSweepJump` prop to `PipelineWalkthrough.tsx` (`setChunkSize(chunkSize); setResults([]);` per contracts/sweep-contract.md's caller contract, mirroring the existing `handleChunkingStrategy` "lighter invalidation, no stepper reset" precedent) and thread it to `RetrievalStep`; wire `SweepCurve.onPointActivate` to call it (depends on T009)
- [ ] T012 [P] [US1] Create `tests/parameter-exploration/sweep-keyboard-and-confirmation.spec.ts`: asserts every sweep point is Tab-reachable and Enter/Space-activatable (FR-002, Constitution VII), and that a Real Mode sweep shows its call-count estimate and issues no API call until explicitly confirmed (SC-005), mocked provider
- [ ] T013 [P] [US1] Create `tests/a11y/parameter-exploration.spec.ts` covering the sweep curve's points (axe scan + keyboard coverage) -- the first file in this feature's a11y spec, extended by US2 and US3 below
- [ ] T014 [US1] Manual scenario validation: quickstart.md scenarios 1-3 (sweep renders and is navigable, Real Mode cost gate, flat-curve labeling)

**Checkpoint**: US1 independently functional -- sweep curve complete, keyboard-operable, cost-gated in Real Mode.

---

## Phase 4: User Story 2 - Share an exact configuration via a link (Priority: P1) 🎯 MVP (part 2 of 2)

**Goal**: A "Generate permalink" control that encodes every pipeline parameter except API keys and custom document text, and reproduces them exactly when opened fresh.

**Independent Test**: Configure a non-default set of parameters, copy the generated permalink, open it in a fresh browser session with no prior state, and confirm every encoded parameter matches exactly.

### Implementation for User Story 2

- [ ] T015 [P] [US2] Implement `buildPermalinkParams()`/`parsePermalinkParams()` in `src/concepts/rag/permalink/permalinkParams.ts` per contracts/permalink-contract.md: `PermalinkSourceState`'s field list structurally excludes `apiKey`/custom document text (FR-006, FR-007), and `parsePermalinkParams` validates `doc` against the real `sampleDocs` ids, setting `docNotFound` instead of silently defaulting
- [ ] T016 [US2] Implement `PermalinkButton.tsx` in `src/concepts/rag/permalink/PermalinkButton.tsx`: "Generate permalink" action, `navigator.clipboard.writeText` copy, `aria-live="polite"` "Copied" confirmation, and a custom-document-exclusion notice shown whenever `customMode === "custom"` (FR-007) (depends on T015)
- [ ] T017 [US2] Add an on-mount-only permalink-apply effect to `PipelineWalkthrough.tsx`: calls `useSearchParams()` once, applies every parsed field to its `useState` setter, sets `realMode.active`/`generationParams` via the existing `onRealModeChange`/`onGenerationParamsChange` props, and renders a dismissible "this document no longer exists" message when `docNotFound` is set (FR-008, Edge Cases) (depends on T015, T005)
- [ ] T018 [US2] Render `PermalinkButton` in `PipelineWalkthrough.tsx`'s chrome, above `StepperNav` (depends on T016, T017)
- [ ] T019 [P] [US2] Create `scripts/checks/permalink-safety.ts` (SC-002): calls the real `buildPermalinkParams()` with a fixture containing a fake API key and custom document text present elsewhere in a full `RealModeSession`, fails if either appears in the output; add a `check:parameter-exploration` npm script running it (depends on T015)
- [ ] T020 [P] [US2] Create `tests/parameter-exploration/permalink-roundtrip.spec.ts` (SC-003): generates a permalink with non-default values across every FR-005 parameter, opens it in a fresh browser context, and asserts every value reproduces exactly; also covers the Edge Case of generating a permalink while a sweep is active/awaiting-confirmation, asserting only pre-sweep parameters are encoded (quickstart.md scenario 8)
- [ ] T021 [P] [US2] Extend `tests/a11y/parameter-exploration.spec.ts` with the permalink button and its `aria-live` confirmation region
- [ ] T022 [US2] Manual scenario validation: quickstart.md scenarios 4-8 (permalink round-trip, Real Mode params visible without a key, custom-document exclusion, removed-document failure message, permalink during an active sweep)

**Checkpoint**: US1 + US2 together are the MVP -- the sweep and the permalink are both independently demonstrable.

---

## Phase 5: User Story 3 - Learn from a deliberately broken example (Priority: P2)

**Goal**: Three curated, automated-check-verified failure presets, each naming the causing parameter, plus a reset-to-defaults control reachable from any pipeline step.

**Independent Test**: Select a named failure preset (e.g. "Threshold too strict") from any pipeline step, and confirm the app loads a specific parameter configuration and sample document/question that reproduces the described failure, with an explanation naming the causing parameter.

### Implementation for User Story 3

- [ ] T023 [P] [US3] Define `FAILURE_PRESETS` (3 shipped values + their `expectedFailure` predicates) in `src/concepts/rag/failurePresets/failurePresets.ts` per contracts/failure-preset-contract.md and data-model.md -- `threshold-too-strict` (`{ type: "empty-results" }`), `chunk-too-large` and `chunk-too-small` (both `{ type: "fact-split", factSubstring }`, using the "coffee" doc's espresso-extraction sentence) -- each with a learner-facing `explanation` naming the causing parameter and its value
- [ ] T024 [US3] Implement `FailurePresetPicker.tsx` in `src/concepts/rag/failurePresets/FailurePresetPicker.tsx`: preset selector plus an always-visible "Reset to defaults" control (depends on T023)
- [ ] T025 [US3] Add apply-preset and reset-to-defaults handlers to `PipelineWalkthrough.tsx` (apply every `FailurePreset` field in one update + `goTo(3)`, mirroring `handleDocSelect`'s existing all-at-once reset pattern; reset restores the existing initial `useState` values) and render `FailurePresetPicker` above `StepperNav` so it's reachable regardless of `stepIndex` (depends on T024)
- [ ] T026 [P] [US3] Create `scripts/checks/failure-presets.ts` (SC-004): runs each `FAILURE_PRESETS` entry's exact configuration through the live `chunkText`/`chunkTextBySentence`/`embed`/`cosineSimilarity` functions and asserts its `expectedFailure` predicate holds; extend `check:parameter-exploration` to include it (depends on T023)
- [ ] T027 [P] [US3] Extend `tests/a11y/parameter-exploration.spec.ts` with the preset picker and reset-to-defaults control
- [ ] T028 [US3] Manual scenario validation: quickstart.md scenarios 9-10 (failure presets each naming their causing parameter, reset to defaults from both a preset-loaded and a mid-sweep state)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Wire this feature's checks into the project-wide aggregate and confirm no regression.

- [ ] T029 Wire `tests/parameter-exploration/*.spec.ts` into `check:parameter-exploration`'s Playwright half (`playwright test tests/parameter-exploration/`) and add `check:parameter-exploration` to `check:all` in `package.json` (depends on T012, T019, T020, T026)
- [ ] T030 Run the Milestone 1 + Milestone 2 regression pass: re-run `specs/001-core-platform-rag-module/quickstart.md` and `specs/002-real-mode/quickstart.md`'s scenario 0 with this feature's controls untouched, confirming no behavioral change
- [ ] T031 Run `npm run check:all` (extensibility, disclosure, determinism, a11y, key-isolation, real-mode, parameter-exploration) plus `npm run build` and `npx eslint .`, and fix any failure

**Checkpoint**: spec.md 003's Definition of Done is met.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion -- BLOCKS all user stories (only because `useSearchParams()` needs the `Suspense` boundary to exist; US1/US3 don't technically read search params, but the edit is trivial and story-agnostic so it's done once, early)
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion. US1 and US2 have no dependency on each other; US3 has no dependency on US1 or US2. All three touch `PipelineWalkthrough.tsx`'s chrome, so sequential order (as numbered) avoids merge friction, but none is a hard technical blocker on another.
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- Pure functions/types before the components that consume them (e.g. T006 before T008; T015 before T016/T017)
- Components before `PipelineWalkthrough.tsx` wiring (e.g. T008-T010 before T011)
- Automated checks/tests can proceed in parallel with each other once their target files exist
- Manual scenario validation last, once everything else in the story is done

### Parallel Opportunities

- T002-T004 (Setup directory scaffolds) can all run in parallel
- T006/T007 (US1's two pure-function files) can run in parallel
- T012/T013 (US1's two test files) can run in parallel once T006-T011 are done
- T015 can start as soon as Foundational (T005) is done, in parallel with any remaining US1 work
- T019/T020/T021 (US2's checks/tests) can run in parallel once T015-T018 are done
- T023 can start as soon as Foundational (T005) is done, in parallel with US1/US2 work
- T026/T027 (US3's check/test) can run in parallel once T023-T025 are done

---

## Parallel Example: User Story 1

```bash
# Launch US1's two pure-function files together:
Task: "Implement generateSweepChunkSizes()/runSimulatedSweep() in src/concepts/rag/sweep/runSweep.ts"
Task: "Implement sweepCallEstimate() in src/concepts/rag/sweep/sweepCallEstimate.ts"

# Once implementation (T006-T011) is done, launch US1's two test files together:
Task: "Create tests/parameter-exploration/sweep-keyboard-and-confirmation.spec.ts"
Task: "Create tests/a11y/parameter-exploration.spec.ts covering the sweep curve"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 -- both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (the one `Suspense` wrapper)
3. Complete Phase 3: User Story 1 (sweep)
4. Complete Phase 4: User Story 2 (permalink)
5. **STOP and VALIDATE**: quickstart.md scenarios 1-8
6. Deploy/demo if ready -- this is the MVP spec.md's own priority ordering (P1, P1) implies

### Incremental Delivery

1. Complete Setup + Foundational -> ready for any story
2. Add User Story 1 -> test independently (quickstart.md 1-3)
3. Add User Story 2 -> test independently (quickstart.md 4-7) -- MVP complete
4. Add User Story 3 -> test independently (quickstart.md 8-9)
5. Polish -> full `check:all` + regression pass

### Parallel Team Strategy

With multiple developers, once Foundational (T005) is done: Developer A takes US1 (T006-T014), Developer B takes US2 (T015-T022), Developer C takes US3 (T023-T028) -- all three are independently completable per research.md's "where state lives" finding, with the only coordination point being sequential edits to `PipelineWalkthrough.tsx`'s chrome (T011, T017/T018, T025).

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
