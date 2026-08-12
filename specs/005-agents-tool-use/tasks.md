# Tasks: Agents & Tool Use Concept Module

**Input**: Design documents from `/specs/005-agents-tool-use/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: This feature's spec.md ties every Success Criterion to an
automated check (SC-001 through SC-007), so the check scripts and
Playwright specs below are mandatory deliverables, not optional
TDD scaffolding -- they're included as regular implementation tasks
within each story, matching the pattern every prior milestone
(`002`-`004`) already used.

**Organization**: Tasks are grouped by user story (spec.md's User
Stories 1-3, priorities P1/P2/P3) so each can be implemented and
independently tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, or US3 -- omitted for Setup/Foundational/Polish tasks
- File paths are exact, per plan.md's Project Structure section

## Path Conventions

Single Next.js project, unchanged from Milestones 1-4. This module's
own files live under `src/concepts/agents-tool-use/`; the only edit
outside that folder for the module itself is one line in
`src/lib/concept-registry.ts` (FR-011). Cross-cutting check/test
infrastructure lives under `scripts/checks/` and `tests/`, per every
prior milestone's own precedent.

---

## Phase 1: Setup

**Purpose**: Create this module's own folder, following the shape
`concept-types.ts`'s doc comment prescribes (research.md's "Module
folder structure" decision).

- [X] T001 Create the module's directory structure: `src/concepts/agents-tool-use/`, `src/concepts/agents-tool-use/lib/`, `src/concepts/agents-tool-use/walkthrough/`, `src/concepts/agents-tool-use/compare/`

**Checkpoint**: Folder exists; no other file yet. `tech-stack.md`'s
Milestone 5 amendment is already applied (see plan.md), so no separate
task is needed for it here.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The tool-matching/agent-strategy engine (`contracts/tool-engine-contract.md`,
data-model.md) that every one of the three user stories calls into.
**No user-story work can begin until this phase is complete.**

- [X] T002 [P] Define core types in `src/concepts/agents-tool-use/lib/types.ts`: `Tool`, `ToolMatch`, `AgentStepKind`, `AgentStep`, `AgentRunOutcome`, `AgentRun`, `AgentStrategyId`, `AgentStrategy` (data-model.md)
- [X] T003 [P] Define the sample-question fixture in `src/concepts/agents-tool-use/lib/sampleQuestions.ts`: `SampleQuestion` interface + `SAMPLE_QUESTIONS` array (division/distance/capital/no-fit, data-model.md)
- [X] T004 Implement the toolbox in `src/concepts/agents-tool-use/lib/tools.ts`: `CALCULATOR` (regex + hand-rolled operand/operator arithmetic, no `eval`), `UNIT_CONVERTER` (regex + fixed km/mi, kg/lb, °C/°F conversion table + `convert()` helper), `KNOWLEDGE_LOOKUP` + `FACTS` (small fixed fact set), `DEFAULT_TOOLBOX` in fixed declaration/tie-break order (contracts/tool-engine-contract.md) -- depends on T002
- [X] T005 Implement tool selection and the three agent strategies in `src/concepts/agents-tool-use/lib/strategies.ts`: `selectTool()`, `MAX_ITERATIONS = 3`, `runDirectAnswer()`, `runSingleToolCall()`, `runMultiStepLoop()`, `bestEffortDirectAnswer()` helper, `STRATEGIES` array (contracts/tool-engine-contract.md, research.md's three strategy decisions) -- depends on T002, T004

**Checkpoint**: The engine is pure, deterministic, and fully unit-testable. All three user stories can now build on it.

---

## Phase 3: User Story 1 - Watch an agent decide whether and which tool to call (Priority: P1) 🎯 MVP

**Goal**: A learner picks a sample question (or types a custom one) and
sees the agent's reasoning, tool-selection decision, tool result, and
final answer as distinct, disclosed, deterministic steps.

**Independent Test**: Pick a shipped sample question, step through the
agent's reasoning, tool call, observation, and final answer, and
confirm each step is legible on its own and the tool-selection step is
disclosed as a simplified simulation, not a real model's output.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `StepSequence.tsx` in `src/concepts/agents-tool-use/walkthrough/StepSequence.tsx`: renders an `AgentStep[]` list with per-kind labeling/styling (reasoning, tool-call, observation, final-answer, gave-up); shared by both views (plan.md)
- [X] T007 [US1] Create `AgentWalkthrough.tsx` in `src/concepts/agents-tool-use/walkthrough/AgentWalkthrough.tsx`: sample-question chips (from `SAMPLE_QUESTIONS`) + custom-question text input, runs `runSingleToolCall(question, DEFAULT_TOOLBOX)`, resets step state when the active question changes (Edge Cases), renders a `data-simulated-disclosure="true"` marker plus `StepSequence` -- depends on T003, T005, T006
- [X] T008 [US1] Create the top-level `AgentsToolUseConcept.tsx` in `src/concepts/agents-tool-use/AgentsToolUseConcept.tsx`: tab chrome mirroring `RagConcept.tsx`'s `TABS` pattern, initially rendering only the Walkthrough tab -- depends on T007
- [X] T009 [US1] Create `meta.ts` in `src/concepts/agents-tool-use/meta.ts`: `agentsToolUseMeta` + `agentsToolUseConcept` `ConceptModule` value (id `"agents-tool-use"`, title, tagline, description, category `"Agents"`, estimatedTime) per contracts/concept-module-contract.md -- depends on T008
- [X] T010 [US1] Register the module in `src/lib/concept-registry.ts`: add the `agentsToolUseConcept` import and one array entry -- the only edit outside the module's own folder (FR-011) -- depends on T009
- [X] T011 [P] [US1] Extend `scripts/checks/simulated-disclosure.ts` with a `checkSurface(...)` call for `AgentWalkthrough` (fixture question, default toolbox) -- depends on T007
- [X] T012 [P] [US1] Create `scripts/checks/agent-determinism.ts` (SC-003 -- widened 2026-08-11 Clarifications to cover the "gave up" outcome, not just final-answer runs): run two independent 10-run sets -- `runSingleToolCall` on the `"division"` sample question, and `runMultiStepLoop` on the `"no-fit"` sample question (the shipped fixture that reaches `"gave-up"`, per research.md) -- deep-compare every `AgentRun` (including step `content` and `outcome`) within each set against that set's own run 1; fail if either set diverges -- depends on T003, T005 (both strategies already exist there; no dependency on any US3 UI task)
- [X] T013 [P] [US1] Create `tests/agents-tool-use/walkthrough.spec.ts` (SC-001): fresh page load, select a shipped sample question, confirm a complete step sequence renders with no setup required -- depends on T010

**Checkpoint**: User Story 1 is fully functional and independently
testable -- the module is reachable from the home page, the
walkthrough runs, is deterministic, and discloses its simulation.

---

## Phase 4: User Story 2 - Remove a tool and see the agent's path change (Priority: P2)

**Goal**: A learner disables the tool the agent would otherwise use and
sees the step sequence visibly change on re-run.

**Independent Test**: Run a sample question that uses a specific tool,
disable that tool, re-run the identical question, and confirm the step
sequence visibly differs rather than silently reusing the previous
run's path.

### Implementation for User Story 2

- [X] T014 [US2] Add per-tool enable/disable toggles to `AgentWalkthrough.tsx` in `src/concepts/agents-tool-use/walkthrough/AgentWalkthrough.tsx`: one toggle per `DEFAULT_TOOLBOX` entry, each with an accessible name naming that specific tool, filters the tool array passed into `runSingleToolCall` (FR-004) -- depends on T007
- [X] T015 [P] [US2] Create `scripts/checks/agent-tool-toggle-effect.ts` (SC-002): run the `"division"` question with the default toolbox, then again with `"calculator"` filtered out, assert the two step sequences differ and the second run never contains a `tool-call` step with `toolId === "calculator"` -- depends on T003, T005

**Checkpoint**: User Stories 1 AND 2 both work independently --
disabling/re-enabling a tool changes/restores the agent's path;
disabling every tool always falls back to a direct answer, never an
error.

---

## Phase 5: User Story 3 - Compare agent strategies side by side (Priority: P3)

**Goal**: A learner views Direct Answer, Single Tool Call, and
Multi-Step Reasoning Loop run against the same question at once, and
can spot a concrete difference between any two.

**Independent Test**: Pick one question, view all shipped strategies at
once, and confirm at least one concrete difference between any two of
them is visible without needing to run anything else.

### Implementation for User Story 3

- [X] T016 [P] [US3] Create `StrategyComparison.tsx` in `src/concepts/agents-tool-use/compare/StrategyComparison.tsx`: question picker (reuses `SAMPLE_QUESTIONS`), runs each `STRATEGIES[i].run(question, DEFAULT_TOOLBOX)` (always the full default toolbox, independent of US2's toggle state -- spec.md Assumptions), renders one panel per strategy (`StepSequence` + name/problem/tradeoff text + `data-strategy-panel="<strategyId>"` + its own `data-simulated-disclosure="true"` marker) -- depends on T003, T005, T006
- [X] T017 [US3] Add the "Compare Strategies" tab to `AgentsToolUseConcept.tsx` in `src/concepts/agents-tool-use/AgentsToolUseConcept.tsx`, rendering `StrategyComparison` -- depends on T008, T016
- [X] T018 [US3] Extend `scripts/checks/simulated-disclosure.ts` with `checkSurface(...)` calls for `StrategyComparison`'s three strategy panels -- depends on T016 (edits the same file as T011)
- [X] T019 [P] [US3] Create `tests/agents-tool-use/strategy-comparison.spec.ts` (SC-007): open Compare Strategies with the `"no-fit"` sample question, assert `multi-step-loop`'s panel alone shows a `"gave-up"` outcome while `direct-answer` and `single-tool-call` both still show a completed final answer -- depends on T017

**Checkpoint**: All three user stories are independently functional --
the module fully satisfies spec.md's User Stories 1-3.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting verification that spans all three stories'
controls, plus wiring this feature's checks into the project-wide
check command.

- [ ] T020 [P] Create `tests/a11y/agents-tool-use.spec.ts` (SC-005): keyboard-reachability + activation + distinct-accessible-name + axe assertions across the sample-question chips, custom-question input, every tool toggle, and the view-tab switcher on both views (FR-010) -- depends on T014, T017
- [ ] T021 Add the `check:agents-tool-use` script to `package.json`: `tsx scripts/checks/agent-determinism.ts && tsx scripts/checks/agent-tool-toggle-effect.ts && playwright test tests/agents-tool-use/` -- depends on T012, T013, T015, T019
- [ ] T022 Add `check:agents-tool-use` to the `check:all` script in `package.json` -- depends on T021
- [ ] T023 Run the full `quickstart.md` validation: the regression pass (re-run `specs/001-004`'s quickstart scenarios plus the pre-existing `npm run check:all`, confirm the RAG module and the home page's now-two-card grid are byte-for-byte unchanged) and this feature's 13 manual scenarios, then `npm run check:all` including `check:agents-tool-use` -- depends on all prior tasks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational only. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational + T007 (extends `AgentWalkthrough.tsx`, which US1 creates). Independently testable once done.
- **User Story 3 (Phase 5)**: Depends on Foundational + T006 (`StepSequence.tsx`) + T008 (`AgentsToolUseConcept.tsx`), both from US1. Does not depend on US2.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories -- this is the MVP.
- **User Story 2 (P2)**: Extends US1's `AgentWalkthrough.tsx` in place (same file, sequential edit) -- cannot start until T007 exists.
- **User Story 3 (P3)**: Reuses US1's `StepSequence.tsx` and `AgentsToolUseConcept.tsx` -- cannot start until T006/T008 exist, but has no dependency on US2's toggle work (research.md/spec.md Assumptions: Compare Strategies always uses the full default toolbox).

### Parallel Opportunities

- T002 and T003 (Foundational) -- different files, no shared dependency.
- T011, T012, T013 (US1) -- once T007/T010 land, these touch different files from each other and from one another's dependencies.
- T015 (US2) can be built in parallel with T014 once Foundational is done, since it only depends on T003/T005 (the engine), not on T014's UI change.
- T016, T019 (US3) can proceed in parallel with all of Phase 4 (US2), since US3 has no dependency on US2.
- T020 (a11y) can run in parallel with T021/T022 (package.json wiring) once their respective dependencies land.

---

## Parallel Example: User Story 1

```bash
# After T005 (Foundational) is done, these can start together:
Task: "Create StepSequence.tsx in src/concepts/agents-tool-use/walkthrough/StepSequence.tsx"

# After T007/T010 land, these three can run together (different files):
Task: "Extend scripts/checks/simulated-disclosure.ts with a checkSurface call for AgentWalkthrough"
Task: "Create scripts/checks/agent-determinism.ts (SC-003)"
Task: "Create tests/agents-tool-use/walkthrough.spec.ts (SC-001)"
```

## Parallel Example: User Story 2 vs. User Story 3

```bash
# Once Foundational + T006/T007/T008 (US1) are done, these can proceed
# on separate tracks since US2 and US3 don't depend on each other:
Task: "Add per-tool enable/disable toggles to AgentWalkthrough.tsx"          # US2
Task: "Create StrategyComparison.tsx in src/concepts/agents-tool-use/compare/"  # US3
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002-T005) -- **critical, blocks everything else**.
3. Complete Phase 3: User Story 1 (T006-T013).
4. **STOP and VALIDATE**: run `npm run check:disclosure`, `tsx scripts/checks/agent-determinism.ts`, and manually walk through quickstart.md scenarios 1-4 and 12-13 (Walkthrough-only ones).
5. This is the module's first genuinely demoable state -- a learner can already run a full agent loop end to end.

### Incremental Delivery

1. Setup + Foundational -> engine ready, nothing user-visible yet.
2. Add User Story 1 -> test independently -> demo (MVP: the core teaching moment).
3. Add User Story 2 -> test independently -> demo (tool toggles change the agent's path).
4. Add User Story 3 -> test independently -> demo (strategy trade-offs, side by side).
5. Polish -> full `check:agents-tool-use` wired into `check:all`, full quickstart.md regression + manual-scenario pass.

### Parallel Team Strategy

With multiple developers, after Foundational (T002-T005) completes:

- Developer A: User Story 1 (T006-T013) -- must land first since US2/US3 both extend its files.
- Once T006/T007/T008/T010 land: Developer B picks up User Story 2 (T014-T015), Developer C picks up User Story 3 (T016-T019), in parallel.
- Reconvene for Phase 6 Polish once all three stories are checkpointed.

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task.
- Every check script (`agent-determinism.ts`, `agent-tool-toggle-effect.ts`) and Playwright spec is a hard deliverable tied to a named Success Criterion (SC-001 through SC-007), not an optional extra -- see contracts/automated-checks-contract.md.
- `single-tool-call` (T005) is the literal function both `AgentWalkthrough.tsx` (US1/US2) and `StrategyComparison.tsx`'s middle panel (US3) call -- there is no second implementation to keep in sync (research.md).
- FR-011/SC-006 (extensibility) is verified by the *existing*, unmodified `check:extensibility` script running against a newly two-entry registry after T010 -- no new check script is created for it.
- `tech-stack.md`'s Milestone 5 amendment is already applied (per plan.md) -- no task above modifies it further.
