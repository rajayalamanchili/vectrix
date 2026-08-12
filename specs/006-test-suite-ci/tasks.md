# Tasks: Automated Test Suite + CI

**Input**: Design documents from `/specs/006-test-suite-ci/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: This feature's spec.md ties every task to a Success Criterion
(spec.md FR-004/FR-005 require this directly), so the CI workflow, the
new check script, and the new/extended test specs below are mandatory
deliverables, not optional TDD scaffolding -- matching the pattern every
prior milestone (`001`-`005`) already used.

**Organization**: Tasks are grouped by user story (spec.md's User
Stories 1-3, priorities P1/P1/P3) so each can be implemented and
independently verified on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, or US3 -- omitted for Setup/Polish tasks
- File paths are exact, per plan.md's Project Structure section

## Path Conventions

Single Next.js project, unchanged from Milestones 1-5. This feature's
own new files live under `.github/workflows/`, `scripts/checks/`, and
`tests/`, following every prior milestone's own "cross-cutting
infrastructure lives here" precedent -- no `src/concepts/` file changes
at all, since this milestone adds no application behavior.

---

## Phase 1: Setup

**Purpose**: Create this feature's new directories before anything is written into them.

- [X] T001 Create the new directory structure: `.github/workflows/` and `tests/smoke/`

**Checkpoint**: Directories exist; no other file yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Not applicable to this feature.** Unlike Milestone 5's shared
tool-matching engine, User Stories 1 and 2 here have no common piece of
infrastructure both depend on before either can start -- US1 (the CI
workflow) only needs `package.json`'s existing `check:*` scripts, and
US2 (traceability + gap-closing tests) only needs the existing spec.md
files and test tree. The one real cross-story dependency (US2's T014
needs US1's T002/T003 to already exist) is called out directly in the
Dependencies section below rather than forced into an artificial shared
phase.

---

## Phase 3: User Story 1 - A regression is caught before it merges (Priority: P1) 🎯 MVP

**Goal**: Every pull request against `main` automatically runs the full
existing check suite (type checking, linting, build, and every
`check:*` script) and cannot be merged while any of it is failing.

**Independent Test**: Open a pull request that deliberately reintroduces
a previously-fixed defect, confirm it's blocked from merging with a
failing, individually-named check; revert the regression and confirm
the PR becomes mergeable again -- per quickstart.md scenarios 1-2.

### Implementation for User Story 1

- [X] T002 [US1] Create `.github/workflows/ci.yml`: a `discover-checks` job that reads `package.json`'s `check:*` script names into a JSON array, a `module-checks` matrix job (`fail-fast: false`, one run per discovered check: checkout, `actions/setup-node@v4` at Node 22 with npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npm run ${{ matrix.check }}`), and three fixed jobs `typecheck` (`npx tsc --noEmit`), `lint` (`npx eslint .`), and `build` (`npm run build`) -- per contracts/ci-workflow-contract.md's job graph and YAML shape
- [X] T003 [US1] Configure `main`'s branch protection to require `typecheck`, `lint`, `build`, and every currently-discovered `module-checks (check:*)` job as required status checks (via `gh api repos/rajayalamanchili/vectrix/branches/main/protection` or the GitHub Settings UI) -- **this is a shared, hard-to-reverse repository-settings change affecting everyone's ability to merge; confirm with the user before running it**, per contracts/ci-workflow-contract.md's "Branch protection" section -- depends on T002
- [X] T004 [US1] Validate Acceptance Scenarios 1-4 against a real pull request per quickstart.md scenarios 1-3: deliberately reintroduce a fixed defect and confirm merge is blocked with an individually-named failing check; revert it and confirm the PR re-runs automatically and becomes mergeable; open a documentation-only PR and confirm it passes cleanly with no false positive -- depends on T002, T003
- [X] T005 [US1] Verify FR-006 and FR-007 against a real CI run: (a) confirm the workflow run producing green has zero API-key/provider secrets configured anywhere in the repository or environment (FR-006); (b) temporarily add a dummy `check:*` script to `package.json`, push, and confirm it appears in the CI matrix with no edit to `.github/workflows/ci.yml`, then remove it (FR-007) -- depends on T002, T003

**Checkpoint**: Any PR against `main` is now gated by the existing
`check:*` suite, build, lint, and typecheck, and the gate's own
extensibility (FR-007) and secret-free operation (FR-006) are confirmed
against a real run -- not just asserted by design. The CI mechanism
itself works end-to-end -- it just isn't yet proven to cover 100% of
every spec's Success Criteria (that's US2).

---

## Phase 4: User Story 2 - Every Success Criterion has a real, repeatable test (Priority: P1)

**Goal**: Every `SC-###` across the five existing `spec.md` files has at
least one committed, automated test, verified by a new hard-gate check
-- closing the specific gaps research.md's audit identified (Milestone
1's SC-001/SC-004/SC-008, Milestone 5's SC-001/SC-007 scenarios).

**Independent Test**: Run `npm run check:sc-coverage` and confirm it
passes against a complete manifest; delete one manifest entry and
confirm it fails, naming the specific missing `(specPath, scId)` --
per quickstart.md scenario 4.

### Gap-closing tests (each closes one identified coverage gap)

- [X] T006 [P] [US2] Create `tests/a11y/viewport-readability.spec.ts`: closes Milestone 1 SC-004 via structural/DOM assertions (no horizontal page-body scroll, no clipped/truncated text, every interactive control's bounding box >= 44x44 CSS px) against the Pipeline Walkthrough and Compare Variants views at a 375x667 viewport -- per research.md item 5 (structural assertions, no pixel-diff baseline, per `/speckit-clarify`)
- [X] T007 [P] [US2] Add a chunking-strategy-boundary assertion to `tests/a11y/pipeline-walkthrough.spec.ts`: closes Milestone 1 SC-008 -- against the pinned "coffee" fixture at chunk size 60, assert fixed-size and sentence-boundary strategies produce differing ordered `(start, end)` word-index chunk-boundary lists (the same 6-vs-10-chunk result research.md's audit cites as previously only ad hoc-verified)
- [X] T008 [P] [US2] Create `tests/smoke/first-time-visitor-journey.spec.ts`: closes Milestone 1 SC-001 -- from the home page, through the RAG concept card, to a completed Pipeline Walkthrough showing ranked/scored retrieved chunks, an assembled prompt, and a disclosed simulated answer, replacing the prior historical/ad hoc verification (roadmap.md T051)
- [X] T009 [P] [US2] Extend `tests/agents-tool-use/walkthrough.spec.ts`: closes the Milestone 5 question-switch state-reset gap -- switching the sample question mid-run resets stepper/prior-run state, replacing the prior ad hoc-verified quickstart.md scenario
- [X] T010 [P] [US2] Extend `tests/agents-tool-use/strategy-comparison.spec.ts`: closes Milestone 5's "same final answer, more steps" gap (quickstart.md scenario 9, US3 Acceptance Scenario 2) -- assert Single Tool Call and Multi-Step Loop show identical final-answer text for the division question while their step counts differ, replacing the prior ad hoc-verified quickstart.md scenario. **Deviation from this task's original wording**: the task as written also named Direct Answer as sharing that final-answer text; verified against the real running app that this is not the case (`runDirectAnswer` never calls a tool, so its answer is structurally different by design) -- the test instead follows the actual cited acceptance scenario (quickstart.md scenario 9), which only claims this for Single Tool Call vs. Multi-Step Loop.
- [X] T010a [P] [US2] (Added during T011's audit, beyond the 5 gaps research.md identified) Create `scripts/checks/sweep-shape.ts`: closes 003-parameter-exploration SC-001's own numeric claim (flat sub-range chunk sizes 70-85 delta ~0.003, meaningful-change sub-range 45-60 delta ~0.09) -- previously asserted in spec.md prose but never checked by any committed test (`sweep-keyboard-and-confirmation.spec.ts` only covers the same SC's keyboard-operability facet). Verified against the live `runSimulatedSweep()`/coffee fixture: actual deltas are 0.0028 and 0.0929, confirming spec.md's own cited numbers. Wired into `check:parameter-exploration`'s chain.
- [X] T010b [P] [US2] (Added during T011's audit, beyond the 5 gaps research.md identified) Create `tests/real-mode/embedding-chart-renders.spec.ts`: closes the mockable half of 002-real-mode SC-003 (key submission renders a real, disclosed-as-real embedding chart) -- previously only a manual, timed walkthrough against the live OpenAI API (roadmap.md T023/T058), never a committed test. The literal "under 60 seconds against a live provider" wall-clock claim genuinely requires a live provider call and stays a manual, documented verification per FR-006/Edge Cases (006-test-suite-ci/spec.md) -- this test instead asserts the half that is this app's own responsibility: the chart and its real-disclosure marker render promptly once the (mocked) provider response resolves, with no artificial UI-added delay.

### Traceability manifest and its enforcing check

- [X] T011 [US2] Audit every existing `scripts/checks/*.ts` and `tests/**/*.spec.ts` file's `SC-###` header comment against all 33 `SC-###` entries across specs 001-005, and author the complete `scripts/checks/lib/sc-traceability-manifest.ts` (schema per contracts/sc-traceability-contract.md): 28 entries pointing at already-existing coverage found by the audit, plus the 5 entries closed by T006-T010 pointing at those new files. If the audit surfaces any additional uncovered `SC-###` beyond the 5 already identified in research.md, add a new gap-closing task before continuing rather than leaving it out of the manifest -- depends on T006, T007, T008, T009, T010. **Audit surfaced 2 more gaps beyond research.md's 5** (002-real-mode SC-003, 003-parameter-exploration SC-001's numeric claim) -- closed by T010a/T010b before this manifest was authored. All 33 entries complete.
- [X] T012 [US2] Create `scripts/checks/sc-coverage.ts` (contracts/sc-traceability-contract.md): extracts every `SC-###` heading from the five spec.md files via a regex scan (no markdown-parsing dependency, matching `no-cross-module-conditionals.ts`'s existing textual-scan style), asserts every one has a manifest entry, asserts every `coveredBy` path exists on disk, asserts no manifest entry references a since-removed `SC-###` -- reports via the existing shared `scripts/checks/lib/report.ts`'s `report()` helper, same as every other check script -- depends on T011
- [X] T013 [US2] Add `"check:sc-coverage": "tsx scripts/checks/sc-coverage.ts"` to `package.json`'s `scripts`, appended to the end of `check:all`'s chain -- depends on T012. Also excluded `check:sc-coverage` from `ci.yml`'s `discover-checks` filter (alongside the existing `check:all` exclusion) since the contract makes it its own fixed job, not a matrix entry -- see T014.
- [X] T014 [US2] Add the `sc-coverage` fixed job to `.github/workflows/ci.yml` alongside `typecheck`/`lint`/`build`, and update `main`'s branch protection (same mechanism as T003) to add `sc-coverage` to the required-status-checks list so it is merge-blocking from the moment it exists, per FR-002's no-advisory-period requirement -- depends on T013 and on T002/T003. Also added `module-checks (check:smoke)` (T008's new script, discovered automatically) to the required list in the same update.
- [X] T015 [US2] Validate Acceptance Scenarios per quickstart.md scenarios 4-5: run `check:sc-coverage` and confirm it passes with zero gaps; delete one manifest entry and confirm it fails naming that exact `(specPath, scId)`; temporarily reintroduce the original defect behind one of T006-T010's new tests and confirm that test alone fails -- depends on T014. Used T006's touch-target fix: stashed the `min-h-11` changes, confirmed `viewport-readability.spec.ts` fails naming the exact undersized controls, then restored the fix and confirmed it passes again.

**Checkpoint**: Every `SC-###` across specs 001-005 now has real,
committed, CI-enforced coverage; `npm run check:sc-coverage` is the
living, automatically-verified proof, not a claim in a status note --
and, per T014, it is merge-blocking the moment it exists, with no gap
between "the check runs" and "the check is required."

---

## Phase 5: User Story 3 - A failing check tells you what broke (Priority: P3)

**Goal**: A contributor can identify which specific check failed, and
roughly why, directly from the pull request -- without opening every
job's log to find it.

**Independent Test**: Intentionally fail exactly one check on a PR and
confirm its name is visible on the PR without expanding passing checks,
and its own log identifies the specific failing spec/assertion -- per
quickstart.md scenario 6.

### Implementation for User Story 3

- [X] T016 [US3] Validate quickstart.md scenario 6 against a real PR: intentionally fail exactly one check (e.g. temporarily break one a11y assertion), confirm GitHub's PR checks list names that job individually with no other job affected, and confirm its own log identifies the specific failing spec file/assertion without ambiguity. If any check's failure output doesn't clearly identify which spec/milestone it belongs to, improve that check's own console/error output to do so (not a new cross-cutting reporting layer -- T002's per-check job structure is what already does the heavy lifting here) -- depends on T004 (the workflow must exist and be required). **Validated using existing evidence rather than a new PR**: PR #6's original run (T004's deliberate-regression validation, run 31596299047) already intentionally failed exactly one check. Re-inspected that run: `gh pr view 6 --json statusCheckRollup` and `gh run view 31596299047` show every job as its own individually-named status (`module-checks (check:a11y)` failed, all 13 others stayed green) -- a reviewer sees which check failed without opening any other job's log. That job's own log (`gh run view --log-failed`) names the exact failing spec (`tests/a11y/parameter-exploration.spec.ts:95:7`, test name, and the axe `color-contrast` rule with `impact: "serious"`) -- unambiguous, no cross-cutting reporting layer needed.

**Checkpoint**: All three user stories independently verified against
real GitHub Actions runs, not just local `npm run check:all`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final regression confirmation, explicit verification of
this feature's own hard-numeric Success Criteria, and closing out the
milestone's own record-keeping.

- [X] T017 [P] Run the full Milestone 1-5 regression pass: `npm run check:all` plus each of `specs/001-core-platform-rag-module/quickstart.md` through `specs/005-agents-tool-use/quickstart.md`'s scenario lists, and confirm zero behavioral difference in any concept module. **Done**: `npm run check:all` (all 11 chained checks, 100+ Playwright tests including 69/69 a11y) plus `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean against the final 006 codebase -- since this milestone's own tests now encode the prior manual quickstart scenarios, a clean `check:all` run against unchanged `src/concepts/` *is* the regression evidence (this feature adds no application behavior, confirmed by the earlier diff-stat).
- [X] T018 [P] Run this feature's own `specs/006-test-suite-ci/quickstart.md` scenarios 1-6 narrative walkthrough (the US1-3 acceptance-scenario scenarios) end-to-end. **Done**: scenario 0 (regression) = T017 above; scenarios 1-3 (regression blocks merge, revert restores mergeability, docs-only PR passes clean) = PR #6/#7, already validated under T004/T005; scenario 4 (sc-coverage hard gate) = re-verified fresh this session by deleting a manifest entry, confirming `check:sc-coverage` fails naming the exact `(specPath, scId)`, then restoring it and confirming PASS; scenario 5 (a converted test would have caught its original defect) = documented under T015 (viewport-readability.spec.ts re-verified against the stashed `min-h-11` fix); scenario 6 = T016 above.
- [X] T019 [P] Measure SC-005: time a real PR's full workflow run from open to all-jobs-complete; confirm it finishes within 15 minutes (quickstart.md checklist item). **Done**: opened throwaway PR #8 (current 006 commit, no code changes), run 31649201895 completed in 2m8s (22:59:54 -> 23:02:02) with every job green -- well under the 15-minute threshold.
- [X] T020 [P] Verify SC-006: re-run the workflow three times against the same unmodified commit (e.g. three empty pushes or `gh workflow run`); confirm identical pass/fail results each time (quickstart.md checklist item). **Done**: used `gh run rerun 31649201895` twice against PR #8's single run (same commit SHA `34be33d...` all three times, per GitHub's rerun semantics). All 3 runs concluded `success`: run 1 (2m8s), rerun 2 (1m50s), rerun 3 (1m58s) -- identical pass/fail results every time. PR #8 closed without merging (throwaway, same precedent as #6/#7).
- [X] T021 Update `roadmap.md`'s Milestone 6 entry (Status, Definition of Done, and the top-of-file Version footer) to record completion -- do this once, at the end, after T001-T020 are all done, not incrementally per task

**Note on T019/T020**: both trigger real CI runs against a live PR; run
them against separate PRs (or sequentially against the same one) rather
than simultaneously, so overlapping runs don't muddy the timing read
(T019) or the identical-result comparison (T020).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately.
- **Foundational (Phase 2)**: N/A for this feature (see note above).
- **User Story 1 (Phase 3)**: Depends on Setup (T001) only. No dependency on US2 or US3.
- **User Story 2 (Phase 4)**: Depends on Setup (T001). T014 specifically also depends on US1's T002/T003 (the workflow file and its branch protection must already exist before a new required job can be added to either) -- every other US2 task is independent of US1.
- **User Story 3 (Phase 5)**: Depends on US1's T004 (a required, working CI gate must exist before "which check failed" is observable on a real PR).
- **Polish (Phase 6)**: Depends on all of Phases 3-5 being complete.

### Parallel Opportunities

- T006-T010 (all five gap-closing tests) touch five different files with no dependency on each other -- run all five in parallel.
- US1 (Phase 3, through T005) and US2's gap-closing tests (T006-T010) can proceed in parallel by different contributors, since neither blocks the other until T014.
- T017, T018, T019, and T020 (Phase 6) are all independent verification passes and can run in parallel; T021 must wait for all four.

---

## Parallel Example: User Story 2's gap-closing tests

```bash
# Launch all five gap-closing tests together -- different files, no shared dependency:
Task: "Create tests/a11y/viewport-readability.spec.ts (Milestone 1 SC-004)"
Task: "Add chunking-strategy-boundary assertion to tests/a11y/pipeline-walkthrough.spec.ts (Milestone 1 SC-008)"
Task: "Create tests/smoke/first-time-visitor-journey.spec.ts (Milestone 1 SC-001)"
Task: "Extend tests/agents-tool-use/walkthrough.spec.ts (Milestone 5 question-switch gap)"
Task: "Extend tests/agents-tool-use/strategy-comparison.spec.ts (Milestone 5 SC-007 gap)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 3: User Story 1 (T002-T005).
3. **STOP and VALIDATE**: a real PR is now gated by the pre-existing check suite, and the gate's own extensibility and secret-free operation are confirmed -- this alone is a genuine, shippable improvement over today's "nothing blocks merge" state, even before US2's traceability work lands.

### Incremental Delivery

1. Setup -> User Story 1 (CI gate exists, MVP) -> validate independently.
2. Add User Story 2 (traceability manifest + 5 gap-closing tests + `sc-coverage` job, merge-blocking from the moment it lands per T014) -> validate independently -> now 100% of Success Criteria are covered and enforced.
3. Add User Story 3 (failing-check identifiability verification, fixing any check whose output is ambiguous) -> validate independently.
4. Phase 6 closes out the milestone, including explicit SC-005/SC-006 verification rather than leaving them implicit in a general "run everything" pass.

### Parallel Team Strategy

With multiple contributors: one takes US1 (T002-T005) while another
starts US2's five independent gap-closing tests (T006-T010) in
parallel; both converge at T014 (which needs US1's `ci.yml` and branch
protection to already exist) before US2 can finish.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Original intent: no task here touches `src/concepts/`, this milestone
  adds CI/test infrastructure only (plan.md's Constitution Check, no new
  learner-facing UI, Principles III/IV/VII N/A). **Deviation**: T006's
  own viewport-readability test surfaced a genuine, previously-
  undetected defect -- several FR-011 canonical controls (Back/Next,
  stepper step buttons, document/query chips, the chunking-strategy
  toggle, view tabs, Compare Variants' return-to-grid) measured 24-42px
  tall against SC-004's literal 44x44px bar, a few px short.
  User-confirmed decision: fixed the sizing (`min-h-11` added across
  `StepperNav.tsx`, `RagConcept.tsx`, `ChunkingStep.tsx`,
  `DocumentStep.tsx`, `RetrievalStep.tsx`, `PipelineWalkthrough.tsx`,
  `VariantsComparison.tsx`) rather than write a test that codifies an
  undersized touch target, consistent with this project's established
  precedent (Milestones 1/3/5 fixing genuine defects the moment a real
  check first catches them). No behavioral/layout regression --
  `tsc`/`eslint`/`next build` and all 69 `check:a11y` tests pass.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- T003 and T014 are the two tasks in this feature that change shared
  repository settings rather than only committing a file -- treat both
  with the same care as any other hard-to-reverse, team-visible change.
