---

description: "Task list for Deployment to Staging and Production"
---

# Tasks: Deployment to Staging and Production

**Input**: Design documents from `/specs/007-vercel-deployment/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/deployment-environments-contract.md, quickstart.md

**Tests**: Not applicable -- research.md item 4 decided manual, documented
verification against the real live deployments is this feature's
verification strategy (no local dev server or mocked response exists to
point an automated test at); no Playwright spec or `check:*` script is
added by this feature.

**Organization**: Tasks are grouped by user story per spec.md's
priorities. Most tasks in this feature are one-time, manual
dashboard/account actions (importing the repo into Vercel, checking a
setting) rather than code changes, since this feature is infrastructure
configuration, not application code -- see plan.md's Technical Context.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (independent of other incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

No new source paths -- this feature's only repository artifacts are
its own `specs/007-vercel-deployment/` documents and the `tech-stack.md`
amendment already committed during planning. Tasks below reference the
Vercel dashboard and git branches, not `src/` files.

---

## Phase 1: Setup

**Purpose**: Prepare the one piece of repository state this feature
needs before any deployment can be exercised.

- [X] T001 Create and push a long-lived `staging` branch from the tip of
      `main`: `git checkout main && git pull && git checkout -b staging
      && git push -u origin staging`.
- [X] T002 [P] Run `npm run build` locally once to confirm the app still
      produces a clean default Next.js build with no `output: 'export'`
      or other config change needed (research.md item 1) -- this is the
      same build Vercel will run.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Connect the repository to Vercel. Both User Story 1
(production) and User Story 2 (staging) depend on this project
existing -- neither environment can be exercised before it does.

**⚠️ CRITICAL**: No user story task can be verified until this phase is
complete.

- [X] T003 Import `github.com/rajayalamanchili/vectrix` into Vercel as a
      new Project (Vercel dashboard → Add New → Project → import from
      GitHub). Requires a Vercel account with GitHub authorized -- a
      manual, account-owning-human step per quickstart.md's
      Prerequisites; it cannot be performed from repository tooling.
- [X] T004 Confirm the new Vercel Project's Settings → Git → Production
      Branch is set to `main` (Vercel's own default for a newly
      connected repository -- confirm, don't change, per
      contracts/deployment-environments-contract.md's branch mapping
      table) (FR-003).
- [X] T005 [P] Confirm the new Vercel Project's Settings → Environment
      Variables is empty for both the Production and Preview scopes,
      satisfying FR-005/SC-004 before any deployment runs.

**Checkpoint**: Vercel project exists and is correctly configured --
User Story 1 and User Story 2 tasks can now be verified.

---

## Phase 3: User Story 1 - A merged change is live in production automatically (Priority: P1) 🎯 MVP

**Goal**: Every push to `main` automatically produces a live, publicly
reachable production deployment, with no manual deploy step.

**Independent Test**: Merge a small, visible change to `main` and
confirm the production URL reflects it without running a deploy command
by hand.

### Implementation for User Story 1

- [X] T006 [US1] Note the current time, then push or merge a small,
      visible change to `main` (e.g. a copy edit) and, in the Vercel
      dashboard's Deployments list, confirm a new Production deployment
      starts within moments with no manual trigger (FR-001).
- [X] T007 [US1] Once that deployment completes, visit the production
      URL shown in the Vercel dashboard and confirm the change is
      visible within 10 minutes of the push noted in T006 (SC-001,
      FR-003).
- [X] T008 [US1] With no further pushes made, revisit the production URL
      again after a few minutes and confirm it remains reachable and
      unchanged (Acceptance Scenario 2 -- no manual "keep-alive" action
      required).

**Checkpoint**: Production deployment is live and verified working
independently of staging.

---

## Phase 4: User Story 2 - A change can be reviewed live before it reaches production (Priority: P1)

**Goal**: Every push to the `staging` branch automatically produces a
live deployment at its own stable URL, independent of production.

**Independent Test**: Push a change to `staging` (without merging to
`main`) and confirm it appears on the staging URL while the production
URL remains unchanged.

### Implementation for User Story 2

- [X] T009 [US2] Note the current time, then push a small, visible
      change to the `staging` branch only (not merged to `main`) and, in
      the Vercel dashboard, confirm a new deployment starts automatically
      for that branch (FR-002).
- [X] T010 [US2] Once complete, find `staging`'s auto-generated,
      stable branch-alias URL in the Vercel dashboard's Deployments list
      (research.md item 2) and confirm it reflects the change within 10
      minutes of the push noted in T009 (SC-002, FR-003).
- [X] T011 [US2] Revisit the production URL from Phase 3 and confirm it
      does **not** reflect the staging-only change -- the two
      environments update independently, each at its own distinct URL
      (FR-004, SC-003, Acceptance Scenario 2).
- [X] T012 [US2] Merge the `staging` branch's change into `main` and
      confirm the production URL updates to match, without needing to
      push the change again (Acceptance Scenario 3, exercising Phase 3's
      T006-T007 mechanism a second time).

**Checkpoint**: Both production and staging are live, independently
updating, and verified end-to-end together.

---

## Phase 5: User Story 3 - A broken deploy fails safely, not silently (Priority: P3)

**Goal**: A build-breaking push to either environment leaves the
previous working deployment live, with the failure visibly reported.

**Independent Test**: Push a deliberately build-breaking change to
`staging` and confirm the staging site keeps serving its last
successful build while the failure is visibly reported.

### Implementation for User Story 3

- [X] T013 [US3] Push a deliberate build-breaking change (e.g. a
      TypeScript syntax error) to the `staging` branch -- deliberately
      using `staging`, not `main`, to avoid rehearsing this against the
      real production branch (quickstart.md Scenario 2 note).
- [X] T014 [US3] Once the build fails, revisit the staging URL and
      confirm it continues serving its last successful build -- no
      downtime, no broken or partial page (FR-006, SC-005).
- [X] T015 [US3] In the Vercel dashboard's deployment list for the
      `staging` branch, confirm the failed attempt is clearly marked as
      failed, visible without needing to reproduce the build locally
      (FR-007).
- [X] T016 [US3] Revert the breaking change and push again to `staging`;
      confirm a new deployment succeeds and the staging URL reflects the
      reverted (working) state again.

**Checkpoint**: All three user stories are independently verified;
failure handling is confirmed safe on the lower-stakes branch.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close out the milestone's own record-keeping once every
story above is verified.

- [X] T017 [P] Re-confirm Vercel Project Settings → Environment
      Variables is still empty for both scopes after all deployments
      above (final SC-004 re-check, now that real deployments have run).
- [X] T018 [P] Run `npm run check:all` once locally to confirm zero
      regression in the existing app -- expected to pass unchanged,
      since this feature added no `src/` code.
- [X] T019 Update `roadmap.md`'s Milestone 7 entry: replace the "Not
      started" Status with the actual production and staging URLs and
      verification date, following the same Status-narrative pattern
      Milestones 1-6 used, and bump `roadmap.md`'s Version footer.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately.
- **Foundational (Phase 2)**: No dependency on T001 -- T003 (importing
  the repo into Vercel) and T004 (confirming the Production Branch
  setting) only need the repository to exist, not the `staging` branch
  specifically; both can run before, after, or in parallel with T001.
  BLOCKS both User Story 1 and User Story 2.
- **User Story 1 (Phase 3)**: Depends on Phase 2 (T003-T005) only. No
  dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends on Phase 2 (T003-T005) and T001
  (the `staging` branch must exist before T009 can push to it). T011
  additionally depends on T007 (needs a known-good production URL/state
  to compare against). T012 depends on T009-T010.
- **User Story 3 (Phase 5)**: Depends only on T009-T010 (one successful
  staging deployment, giving a known staging URL to push a failing
  change against) -- not on T011-T012, which compare against production
  and merge to `main` respectively and aren't prerequisites for testing
  failure behavior on `staging`.
- **Polish (Phase 6)**: Depends on Phases 3-5 all being complete.

### Parallel Opportunities

- T002 can run in parallel with T001 (independent checks).
- T004 and T005 can run in parallel once T003 completes (independent
  dashboard settings).
- T017 and T018 can run in parallel once Phases 3-5 are complete.
- User Story 1 (Phase 3) and User Story 2 (Phase 4) are independently
  testable per their own Independent Test statements, but T011
  specifically needs Phase 3's production state as a comparison point,
  so in practice Phase 3 should be verified before Phase 4's T011.
- User Story 3 (Phase 5) can start as soon as T009-T010 are done -- it
  does not need to wait for T011-T012, so T013 can run in parallel with
  T011/T012 if useful.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL -- blocks both stories).
3. Complete Phase 3: User Story 1 (production live and verified).
4. **STOP and VALIDATE**: production is live, reflects `main`, and
   requires no manual step per push -- this alone is a usable MVP (a
   reachable production site), even before staging exists functionally.

### Incremental Delivery

1. Setup + Foundational → Vercel project connected and configured.
2. User Story 1 → production live → MVP reachable by anyone.
3. User Story 2 → staging live, independent of production → pre-merge
   review now possible.
4. User Story 3 → failure-safety confirmed on the lower-stakes branch.
5. Polish → record-keeping closed out in `roadmap.md`.

---

## Notes

- Nearly every task here is a one-time, manual verification against a
  real external account/service, not a code change -- consistent with
  research.md item 4's decision not to add an automated check for this
  feature.
- Commit only applies to T019 (`roadmap.md`'s Status update) -- Phase
  1-5 tasks operate against branches/the Vercel dashboard, not new
  repository files.
- Verify each checkpoint before moving to the next phase; T011 and T014
  in particular exist specifically to prove independence/safety, not
  just that a deploy happened.
