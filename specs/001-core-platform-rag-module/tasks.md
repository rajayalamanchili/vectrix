---

description: "Task list for 001-core-platform-rag-module"
---

# Tasks: Core Extensible Platform + RAG Concept Module

**Input**: Design documents from `/specs/001-core-platform-rag-module/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not generic TDD scaffolding -- the four automated checks
(SC-002, SC-003, SC-005, SC-006) are themselves spec-mandated Milestone-1
deliverables (Definition of Done gaps per roadmap.md), so they're
included as first-class implementation tasks within the story that owns
the behavior they verify, not as an optional pre-implementation step.

**Organization**: This list covers the feature's full scope, not just
the remaining gap -- including tasks already completed during Milestone
1's prototype build. `[x]` = already implemented, verified this session
by reading the corresponding source file; `[ ]` = remaining work (the
Milestone-1 Definition-of-Done gap identified in plan.md: FR-013/FR-014
and the SC-002/003/005/006 automated checks). A `[x]` "manually validate"
task is marked done only where roadmap.md explicitly records it as
already verified (SC-001/SC-004, verified via Playwright screenshots
during the original build) -- everything roadmap.md flags as not yet
verified (SC-006, SC-007, SC-008, and any interaction-scenario check not
covered by that historical SC-001/SC-004 pass) stays open.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US4)

## Path Conventions

Single Next.js project. `src/` for app code, `scripts/checks/` and
`tests/a11y/` (new, this feature) for the automated checks.

---

## Phase 1: Setup

**Purpose**: Project scaffolding (done) and the dev tooling this
feature's remaining automated checks depend on (open).

- [x] T001 Initialize Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 project scaffold -- package.json, tsconfig.json, next.config.ts
- [x] T002 Configure ESLint (`eslint-config-next`) -- eslint.config.mjs
- [x] T003 Define design tokens (color/font CSS variables) consumed via Tailwind's `@theme inline` -- src/app/globals.css, src/app/layout.tsx
- [x] T004 Implement global `prefers-reduced-motion` handling (any animation/transition duration collapses to near-zero) -- src/app/globals.css:81-87 (FR-012)
- [ ] T005 Add `tsx`, `playwright`, and `@axe-core/playwright` as dev dependencies in package.json; run `npx playwright install --with-deps chromium`
- [ ] T006 Add npm scripts to package.json: `check:extensibility`, `check:disclosure`, `check:determinism` (each running its `scripts/checks/*.ts` file via `tsx`), `check:a11y` (running `playwright test tests/a11y/`), and `check:all` (runs all four, non-zero exit if any fails) -- per contracts/automated-checks-contract.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pieces genuinely shared by more than one story -- the
layout primitives both RAG views use, and the shared check-reporting
helper the remaining scripts depend on.

- [x] T007 Build `Panel` + `Marginalia` layout primitives (used by both Pipeline Walkthrough and Compare Variants) -- src/components/ui/Panel.tsx
- [x] T008 Build `Badge` primitive (used by both views) -- src/components/ui/Badge.tsx
- [x] T009 Build `RagConcept.tsx` top-level view switcher (Pipeline Walkthrough ↔ Compare Variants) -- src/concepts/rag/RagConcept.tsx
- [ ] T010 Create scripts/checks/lib/report.ts -- a shared pass/fail reporting helper (consistent "file:line" / selector / diverging-run-index output, `process.exit(0|1)`) used by no-cross-module-conditionals.ts, simulated-disclosure.ts, and determinism.ts

**Checkpoint**: Shared primitives exist (done); remaining check tooling wired once T005-T010 complete.

**Precise dependency note** (not a blanket rule -- see each phase's own
Dependencies entry below): only T032, T033, and T048 (the `tsx`-run
check scripts) depend on T010's shared helper. T034 and T043 (the
Playwright a11y specs) depend on T005's dev-dependency install only, not
on T010. T023-T031 (pure React/TS state and UI changes) depend on
neither T005 nor T010 -- they can proceed as soon as Phase 2's `[x]`
items are in place, without waiting on any of Phase 1/2's open tooling
tasks.

---

## Phase 3: User Story 1 - Work through the RAG pipeline hands-on (Priority: P1) 🎯 MVP

**Goal**: The five-step pipeline itself is already built and running.
What remains is the FR-013 (similarity-threshold) and FR-014
(chunking-strategy) build gap confirmed unimplemented during
`/speckit.clarify`, the document/strategy-switch reset resolved in the
same session, and this story's share of the SC-003/SC-005/SC-006
verification gap.

**Independent Test**: spec.md US1's Independent Test, plus Acceptance
Scenarios 5-7 (Top-K ordering, threshold-empties-results,
strategy-changes-boundaries) and the document-switch-reset edge case --
see quickstart.md steps 1-4.

### Implementation for User Story 1

- [x] T011 Define `SampleDoc` fixtures (2 documents, 3 sample queries each) -- src/concepts/rag/lib/sampleDocs.ts
- [x] T012 Implement `chunkText()` fixed-size overlapping-window chunking -- src/concepts/rag/lib/sampleDocs.ts
- [x] T013 Implement deterministic mock embedding (bag-of-words + fixed seeded 2D projection) and `cosineSimilarity()` -- src/concepts/rag/lib/mockEmbedding.ts
- [x] T014 Build `Slider` primitive (native `<input type="range">`, `aria-label`) -- src/components/ui/Slider.tsx
- [x] T015 Build `StepperNav` primitive (native buttons, jump-to-any-step) -- src/components/ui/StepperNav.tsx
- [x] T016 Build `StarChart` visualization (chunk/query points, course lines, highlighting) -- src/components/charts/StarChart.tsx
- [x] T017 Build `DocumentStep.tsx` (document picker + text view)
- [x] T018 Build `ChunkingStep.tsx` (chunk size/overlap sliders, live chunk list)
- [x] T019 Build `EmbeddingStep.tsx` (2D chart plot + simulated-projection disclosure)
- [x] T020 Build `RetrievalStep.tsx` (query input/quick-picks, Top-K slider, ranked list, chart highlighting)
- [x] T021 Build `GenerationStep.tsx` (assembled prompt + simulated answer + disclosure)
- [x] T022 Build `PipelineWalkthrough.tsx` (lifted state, stepper wiring, Back/Next controls)
- [ ] T023 [US1] Add `strategy: "fixed" | "sentence"` field to the `Chunk` interface in src/concepts/rag/lib/sampleDocs.ts and set it on chunks produced by the existing `chunkText()`
- [ ] T024 [US1] Implement `chunkTextBySentence(text, chunkSize, overlap): Chunk[]` in src/concepts/rag/lib/sampleDocs.ts: split on sentence-ending punctuation, greedily group consecutive sentences into a chunk until the next sentence would exceed `chunkSize` words, start a new chunk, snap `overlap` back to the nearest sentence boundary (per spec.md Clarifications 2026-08-03) -- depends on T023
- [ ] T025 [US1] Add a chunking-strategy toggle (fixed/sentence) to src/concepts/rag/pipeline/steps/ChunkingStep.tsx, calling `chunkTextBySentence` when "sentence" is selected (FR-014) -- depends on T024
- [ ] T026 [US1] Add `chunkingStrategy` state (default `"fixed"`) to src/concepts/rag/pipeline/PipelineWalkthrough.tsx and thread it to ChunkingStep, EmbeddingStep, and RetrievalStep -- depends on T025
- [ ] T027 [US1] Add `similarityThreshold` state (default `0`) to src/concepts/rag/pipeline/PipelineWalkthrough.tsx
- [ ] T028 [US1] Add a similarity-threshold Slider (0.00-1.00, step 0.01) to src/concepts/rag/pipeline/steps/RetrievalStep.tsx, filtering `ranked` by `score >= similarityThreshold` before slicing to `topK` (FR-013) -- depends on T027
- [ ] T029 [US1] Add a `useEffect` in src/concepts/rag/pipeline/PipelineWalkthrough.tsx keyed on `[docId, chunkingStrategy]` that resets `query`, `results`, and `stepIndex` to their defaults -- depends on T026
- [ ] T030 [P] [US1] Add a `data-simulated-disclosure="true"` attribute to the disclosure paragraph in src/concepts/rag/pipeline/steps/EmbeddingStep.tsx
- [ ] T031 [P] [US1] Add a `data-simulated-disclosure="true"` attribute to the disclosure paragraph in src/concepts/rag/pipeline/steps/GenerationStep.tsx
- [ ] T032 [US1] Implement scripts/checks/simulated-disclosure.ts using `react-dom/server`'s `renderToStaticMarkup` to assert EmbeddingStep and GenerationStep each render a non-empty `data-simulated-disclosure` element (SC-003) -- depends on T010, T030, T031
- [ ] T033 [US1] Implement scripts/checks/determinism.ts: run chunking (both strategies) → embed → cosineSimilarity → rank, ten times against one fixed `(docId, chunkSize, overlap, strategy, query)` fixture, asserting byte-identical ranked output every run (SC-006) -- depends on T010, T023, T024
- [ ] T034 [US1] Write tests/a11y/pipeline-walkthrough.spec.ts (Playwright + `@axe-core/playwright`) asserting every Pipeline Walkthrough control -- including the new strategy toggle and threshold slider -- is keyboard-reachable, keyboard-operable, and has an accessible name (SC-005, pipeline half) -- depends on T005, T025, T028
- [x] T035 Manually validate the original US1 acceptance scenarios 1-4 (pipeline steps render/update, Top-K ordering) -- verified via Playwright screenshots during the original build (roadmap.md: SC-001 done)
- [ ] T036 [US1] Manually validate the clarify-added US1 acceptance scenarios (threshold empties the retrieved list; strategy toggle changes chunk boundaries at the same size; switching documents resets query/results/step) per quickstart.md steps 2-4

**Checkpoint**: User Story 1's original pipeline is already independently functional; once T023-T034/T036 land, the FR-013/FR-014 build gap is closed and SC-003, SC-006, and the pipeline half of SC-005 are verified by automated check.

---

## Phase 4: User Story 2 - Discover and choose a module from the home page (Priority: P1)

**Goal**: Already fully built and manually verified -- no code or
verification gap identified here.

**Independent Test**: spec.md US2's Independent Test -- see
quickstart.md step 5.

### Implementation for User Story 2

- [x] T037 Build home page (module grid reading `conceptRegistry`, "more modules coming" affordance) -- src/app/page.tsx
- [x] T038 Build dynamic concept route (`generateStaticParams`, per-concept detail header + `Component` render) -- src/app/concepts/[conceptId]/page.tsx
- [x] T039 Manually validate US2 acceptance scenarios (every registry module listed exactly once; layout communicates more modules are coming) -- verified via Playwright screenshots during the original build (roadmap.md: SC-001 done)

**Checkpoint**: User Story 2 fully satisfied, no open work.

---

## Phase 5: User Story 3 - Compare RAG variants side by side (Priority: P2)

**Goal**: Already fully built. What remains is this story's share of
the SC-005 verification gap and confirming the interaction scenarios
specifically (not just layout) have been checked.

**Independent Test**: spec.md US3's Independent Test -- see
quickstart.md step 6.

### Implementation for User Story 3

- [x] T040 Define `RagVariant` data (naive baseline + 5 variants: HyDE, RAG-Fusion, GraphRAG, Self-RAG, Agentic RAG) -- src/concepts/rag/variants/variantData.ts
- [x] T041 Build `FlowDiagram` visualization (flags stages that differ from naive RAG) -- src/components/charts/FlowDiagram.tsx
- [x] T042 Build `VariantsComparison.tsx` (grid, two-selection side-by-side compare, FIFO replacement on a third selection, return-to-grid control)
- [ ] T043 [P] [US3] Write tests/a11y/compare-variants.spec.ts (Playwright + `@axe-core/playwright`) asserting all Compare Variants controls (variant card selection, comparison detail view, return-to-grid control) are keyboard-reachable/operable with accessible names (SC-005, compare-variants half) -- depends on T005
- [ ] T044 [US3] Manually validate US3's interaction scenarios (flow-diagram stage distinction, side-by-side detail visibility, FIFO replacement on a third selection) per quickstart.md step 6 -- roadmap.md's historical SC-001/SC-004 verification covered layout readability, not this interaction logic, so this stays open

**Checkpoint**: Build complete; SC-005 (compare-variants half) and the interaction-scenario check remain to close this story fully.

---

## Phase 6: User Story 4 - Add a second concept module without touching core code (Priority: P3)

**Goal**: The `ConceptModule` contract and registry pattern already
exist and type-check. What remains is the automated regression check
that proves it by scan, not by inspection (SC-002).

**Independent Test**: spec.md US4's Independent Test -- see
contracts/concept-module-contract.md.

### Implementation for User Story 4

- [x] T045 Define the `ConceptModule` contract -- src/lib/concept-types.ts
- [x] T046 Create the central concept registry (`conceptRegistry`, `getConcept()`) -- src/lib/concept-registry.ts
- [x] T047 Build `ragMeta`/`ragConcept` satisfying the `ConceptModule` contract and register it -- src/concepts/rag/meta.ts
- [ ] T048 [US4] Implement scripts/checks/no-cross-module-conditionals.ts scanning src/app/page.tsx, src/app/concepts/[conceptId]/page.tsx, and src/lib/concept-registry.ts for per-concept-id conditionals -- per FR-002's definition (2026-08-03), flag only a hardcoded-literal-id comparison (e.g. `=== "rag"`, `case "rag":`), never a runtime-id comparison; concept-registry.ts's own `getConcept(id)` (`conceptRegistry.find((c) => c.id === id)`) compares against a parameter, not a literal, and MUST NOT be flagged -- add it as a known-good fixture in the check's own test/self-check. Fail with the offending file:line on any real match (SC-002, FR-002) -- depends on T010
- [ ] T049 [US4] Run `npm run check:extensibility` and confirm it exits 0 against the current codebase, confirming User Story 4's contract holds today, not just by inspection -- depends on T048

**Checkpoint**: Contract already proven by type-check; SC-002's regression check remains to prove it by automated scan too.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final, whole-feature validation and Definition-of-Done bookkeeping.

- [x] T050 Manually validate SC-004 (Pipeline Walkthrough and Compare Variants both remain fully readable and operable at a 375px-wide viewport) -- verified via Playwright screenshots during the original build (roadmap.md: SC-004 done)
- [ ] T051 Run `npm run check:all` and quickstart.md's full manual scenario list end-to-end once all stories are complete -- depends on T032, T033, T034, T043, T048
- [ ] T052 Update roadmap.md's Milestone 1 Status and Definition of Done to mark the FR-013/FR-014 build gap and the SC-002/SC-003/SC-005/SC-006 checks as closed -- depends on T051 passing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001-T004 done; T005-T006 (new tooling) have no dependencies.
- **Foundational (Phase 2)**: T007-T009 done; T010 depends on Setup's T005-T006. Blocks T032, T033, T048 (all use `scripts/checks/lib/report.ts`) -- see the "Precise dependency note" above Phase 3 for what is *not* blocked.
- **User Story 1 (Phase 3)**: T011-T022 done. T023-T036's dependencies vary per the precise note above Phase 3 -- not a blanket dependency on all of Phase 1/2. No dependency on US2-US4.
- **User Story 2 (Phase 4)**: Fully done (T037-T039). No open work, no dependency on other stories.
- **User Story 3 (Phase 5)**: T040-T042 done. T043 depends on T005 only; T044 has no tooling dependency -- both independent of US1/US2/US4.
- **User Story 4 (Phase 6)**: T045-T047 done. T048-T049 depend on T010 only -- independent of US1/US2/US3.
- **Polish (Phase 7)**: T050 has no dependency (already-verified historical item). T051 depends on all four stories' automated-check tasks (T032, T033, T034, T043, T048) being complete. T052 depends on T051.

### Within User Story 1's remaining work

T023 → T024 → T025 → T026 → T029 (state/UI chain); T027 → T028
(threshold, independent of the strategy chain until both feed T034);
T030/T031 parallel with each other and with the state/UI chain; T032
depends on T030+T031; T033 depends on T023+T024; T034 depends on
T025+T028; T036 depends on the whole story's remaining work.

### Parallel Opportunities

- T005 and T006 (new Setup tasks) touch package.json sequentially (not parallel with each other).
- Once T005 (Playwright installed) and T010 (report.ts helper) are done, US1's remaining work, US3's T043, and US4's T048-T049 can all proceed in parallel -- none depends on another's changes. Note T023-T031 don't even need T005/T010 -- they can start as soon as Phase 2's `[x]` items are confirmed in place.
- Within US1: T030 and T031 (different files, EmbeddingStep.tsx vs GenerationStep.tsx).
- T043 (US3) can run in parallel with any US1 remaining task -- different view, no shared files.

---

## Parallel Example: User Story 1 remaining work

```bash
# After T023-T029 land, these two are independent (different files):
Task: "Add data-simulated-disclosure to EmbeddingStep.tsx"
Task: "Add data-simulated-disclosure to GenerationStep.tsx"
```

## Parallel Example: Across Stories' remaining work

```bash
# Once T005 (Playwright) and T010 (report.ts) are done, these can run in parallel:
Task: "User Story 1 remaining implementation (T023-T036)"
Task: "User Story 3 accessibility spec (T043-T044)"
Task: "User Story 4 extensibility check (T048-T049)"
```

---

## Implementation Strategy

### Where things stand

Setup, Foundational, and all four stories' core builds are done (30 of
52 tasks). The remaining 22 tasks are entirely the Milestone-1
Definition-of-Done gap identified in plan.md: FR-013/FR-014 plus the
SC-002/003/005/006 automated checks.

### MVP-completion path (finish User Story 1 first)

1. T005-T006 (Setup tooling)
2. T010 (Foundational check-reporting helper)
3. T023-T036 (User Story 1's remaining work) -- closes the FR-013/FR-014
   build gap and 3 of the 4 tracked verification gaps (SC-003, SC-005
   partially, SC-006)
4. **STOP and VALIDATE**: run quickstart.md steps 1-4
5. Continue to US3/US4's remaining work to close the rest of Milestone
   1's DoD (US2 needs nothing further)

### Incremental completion

1. Setup + Foundational remaining items → tooling ready
2. US1 remaining work → validate independently → FR-013/FR-014 gap closed
3. US3 remaining work → validate independently → SC-005 fully closed
4. US4 remaining work → validate independently → SC-002 closed
5. Polish → `check:all` green, roadmap.md DoD updated → Milestone 1 done

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task.
- Every check script's pass/fail contract is fixed by contracts/automated-checks-contract.md -- tasks here only decide file layout/order, not behavior.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
