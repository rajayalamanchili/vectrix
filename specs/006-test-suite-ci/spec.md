# Feature Specification: Automated Test Suite + CI

**Feature Branch**: `006-test-suite-ci`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Milestone 6"

## Clarifications

### Session 2026-08-12

- Q: Should every check be merge-blocking from day one, or can newly-converted tests start as advisory until proven stable? → A: All checks are required/merge-blocking from the moment they're added — no advisory period.
- Q: For Success Criteria previously verified by human visual judgment (e.g. Milestone 1's 375px-viewport readability check), should the automated replacement use pixel-diff screenshot comparison or structural/DOM assertions? → A: Structural/DOM assertions (no new tooling; no-horizontal-scroll, no-clipped-text style checks) — no pixel-diff baseline tooling introduced.
- Q: Is the SC-005 full CI check-suite runtime target of 15 minutes per pull request correct, given the suite already includes 66+ Playwright a11y tests plus several module-specific check scripts? → A: Keep 15 minutes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A regression is caught before it merges (Priority: P1)

A contributor opens a pull request that changes RAG module code and, without
realizing it, breaks a previously-working behavior (for example, the
chunking-strategy toggle silently resets query state again, as it did once
before in Milestone 1). Today nothing stops that PR from merging unless
someone remembers to run `npm run check:all` locally and happens to catch it.
With this feature, the same regression is caught automatically, before the
PR can be merged.

**Why this priority**: This is the actual point of Milestone 6, stated
directly in roadmap.md: "wired into CI so every Success Criterion across all
prior milestones regresses loudly instead of silently." Every other story in
this feature is in service of this one being trustworthy.

**Independent Test**: Can be fully tested by opening a pull request that
deliberately reintroduces a previously-fixed defect (e.g. the Milestone 1
chunking-strategy state-reset bug) and confirming the pull request is
blocked from merging with a failing check, then confirming the PR becomes
mergeable again once the regression is reverted.

**Acceptance Scenarios**:

1. **Given** a pull request that changes application code, **When** the
   pull request is opened or updated, **Then** the full check suite (type
   checking, linting, build, and every existing `check:*` script) runs
   automatically without any manual step.
2. **Given** a pull request whose changes cause any single check to fail,
   **When** that check suite finishes running, **Then** the pull request is
   marked as not mergeable and the failure is visible on the pull request
   itself.
3. **Given** a pull request that previously failed a check, **When** the
   contributor pushes a fix and the check suite re-runs and passes,
   **Then** the pull request becomes mergeable again with no manual
   override needed.
4. **Given** a pull request that changes nothing behaviorally (e.g. a
   comment or documentation-only change), **When** the check suite runs,
   **Then** it passes, confirming the suite does not produce false-positive
   failures.

---

### User Story 2 - Every Success Criterion has a real, repeatable test (Priority: P1)

A contributor (or an agent working on the next milestone) wants to know
whether Milestones 1 through 5 still work as specified. Today, some of that
evidence is a committed, automated check (`check:a11y`, `check:determinism`,
etc.), but some of it is a note in roadmap.md saying a scenario was
"verified via an ad hoc script against the dev server" or "confirmed via
historical Playwright screenshots" -- a one-time human observation that
cannot re-run itself and silently goes stale the next time related code
changes. This story closes that gap: every Success Criterion in every
`spec.md` from Milestones 1-5 gets a committed, automated test that produces
the same evidence on every run, not just the one time someone happened to
check by hand.

**Why this priority**: Automating checks that don't yet exist is the other
half of roadmap.md's Milestone 6 Definition of Done ("Every Success
Criterion across Milestones 1-5 has a corresponding automated test, not a
manual verification note"). Wiring CI (User Story 1) around an incomplete
set of checks would give false confidence -- CI would go green while gaps
identified in roadmap.md (Milestone 1's T036/T044/T051 ad hoc scenarios,
Milestone 5's two ad hoc-verified quickstart.md scenarios, Milestone 1
SC-004's screenshot-only viewport check) remain unverified after every
future change.

**Independent Test**: Can be fully tested by taking the list of Success
Criteria from each of the five existing `spec.md` files, and for each one,
confirming a specific, named automated test exists and currently passes --
with zero criteria left pointing only to a roadmap.md prose note as their
evidence.

**Acceptance Scenarios**:

1. **Given** a Success Criterion in any of the five existing feature specs,
   **When** the full check suite is run, **Then** at least one automated
   test exists whose pass/fail result is traceable back to that specific
   Success Criterion.
2. **Given** a Success Criterion whose only current evidence is a manual
   quickstart.md walkthrough or an ad hoc script run noted in roadmap.md
   (e.g. Milestone 1's full 5-step pipeline walkthrough, Milestone 5's
   question-switch state-reset scenario), **When** this feature is
   complete, **Then** that scenario is covered by a committed, automatically
   re-runnable test instead.
3. **Given** the newly-added automated tests, **When** they are run against
   the current, unmodified codebase, **Then** they pass -- confirming they
   codify existing correct behavior rather than changing it.
4. **Given** a deliberately reintroduced version of a previously-fixed
   defect from Milestones 1-5 (e.g. the Milestone 1 axe heading-order
   violation, the Milestone 3 contrast-ratio defect), **When** the relevant
   automated test runs, **Then** it fails, confirming the test would have
   caught the original defect.

---

### User Story 3 - A failing check tells you what broke (Priority: P3)

A contributor whose pull request fails CI wants to know which milestone,
which Success Criterion, and roughly why -- without first having to
memorize which of the nine `check:*` scripts maps to which spec.md, or pull
every check's full log by hand.

**Why this priority**: This makes User Story 1 and 2's guarantees usable
day-to-day rather than merely present. It's lower priority than the first
two because a contributor can still fall back to reading raw check output or
asking someone familiar with the mapping -- it's a usability improvement on
top of an already-functioning gate, not a precondition for the gate to
exist.

**Independent Test**: Can be fully tested by intentionally failing one
specific check (e.g. an a11y test) in a pull request and confirming the CI
output identifies that check by name and which milestone/module it belongs
to, without needing to open unrelated logs to find it.

**Acceptance Scenarios**:

1. **Given** a pull request where exactly one check fails, **When** a
   contributor views the CI result, **Then** the failing check's name is
   visible without expanding or searching through passing checks' output.
2. **Given** a failing check, **When** a contributor views its output,
   **Then** the output identifies which milestone and which check script
   produced the failure (not just a generic "checks failed" status).

---

### Edge Cases

- What happens when a check requires a real third-party API key (e.g. the
  Milestone 2 live end-to-end OpenAI run)? These remain excluded from the
  automated CI suite and stay a manual, documented task, consistent with
  the project's existing "no first-party server, no committed API key"
  stance -- CI runs only the mocked-provider tests that already exist for
  Real Mode.
- What happens when a future milestone adds a new concept module with its
  own `check:*` script? Wiring it into CI must not require editing a
  per-module list inside the CI configuration itself -- only adding the new
  script to the existing aggregate check command, consistent with
  Constitution Principle I (no core file may be conditioned on a specific
  concept's identity).
- What happens when a check is flaky (passes most runs, occasionally fails
  with no code change)? A flaky check that isn't distinguished from a real
  regression erodes trust in the whole gate -- flakiness, once identified,
  must be fixed at the source (e.g. a timing issue in a Playwright test),
  not silently retried or ignored.
- What happens when a contributor needs to merge urgently and CI is broken
  for reasons unrelated to their change (e.g. a genuinely flaky check)?
  This is a process question (who can override, and how) rather than a
  behavior this feature must define; it is out of scope here and left to
  the project's existing pull-request review process.
- What happens when two Success Criteria across different milestones are
  effectively verified by the same underlying test (e.g. an a11y test that
  happens to cover controls from two milestones at once)? That's
  acceptable -- the requirement is that every Success Criterion has
  traceable automated coverage, not that each one has a dedicated,
  exclusive test.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically run a check suite (type checking,
  linting, production build, and every existing `check:*` script) on every
  pull request that targets the main branch, without requiring a
  contributor to trigger it manually.
- **FR-002**: System MUST prevent a pull request from being merged while
  any check in the suite is failing. Every check MUST be required/
  merge-blocking as soon as it is added to the suite -- there is no
  advisory or non-blocking trial period for newly-converted tests.
- **FR-003**: System MUST re-run the check suite automatically whenever new
  commits are pushed to an open pull request, and update the pull request's
  mergeability accordingly.
- **FR-004**: Every Success Criterion defined in `specs/001-core-platform-
  rag-module/spec.md` through `specs/005-agents-tool-use/spec.md` MUST have
  at least one committed, automated test whose result is traceable to that
  specific Success Criterion.
- **FR-005**: Where a Success Criterion's only current evidence is a manual
  quickstart.md walkthrough, an ad hoc script run, or a note in roadmap.md
  describing a one-time human verification, that evidence MUST be replaced
  with (or supplemented by) a committed, automatically re-runnable test
  covering the same scenario. Where that prior verification relied on a
  human's visual judgment (e.g. Milestone 1's 375px-viewport readability
  check, SC-004), the automated replacement MUST use structural/DOM
  assertions (e.g. no horizontal scroll, no clipped or overlapping text,
  computed element widths within the viewport) rather than pixel-diff
  screenshot comparison against a baseline image.
- **FR-006**: The check suite MUST NOT require a real third-party API key
  or network access to a live model provider to run in CI; any scenario
  that genuinely requires a live provider call remains a manual, documented
  task outside the automated suite.
- **FR-007**: Adding a new concept module's checks to the CI gate MUST
  require only adding that module's check command to the existing
  aggregate check command (e.g. `check:all`) -- not a new conditional or
  module-specific branch inside the CI configuration itself.
- **FR-008**: When any check fails, the failure report MUST identify which
  named check failed, without requiring a contributor to inspect passing
  checks' output to find it.
- **FR-009**: The newly-added automated tests MUST pass against the current
  codebase at the time this feature ships, confirming they codify already-
  correct behavior rather than introducing new required behavior changes.
- **FR-010**: System MUST make the check suite's pass/fail result visible
  directly on the pull request (not only in a separate log a contributor
  must know to look for).

### Key Entities

- **Check**: A single named, automated verification (e.g. `check:a11y`,
  `tsc --noEmit`, a Playwright spec file) that produces a pass/fail result
  and, on failure, a description of what broke.
- **Success Criterion**: An `SC-###` entry from one of Milestones 1-5's
  `spec.md` files; the unit of coverage this feature tracks completeness
  against.
- **CI Run**: One execution of the full check suite against a specific
  pull request state (a commit), whose overall pass/fail result determines
  that pull request's mergeability at that point in time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the Success Criteria defined across Milestones 1-5's
  `spec.md` files have at least one committed, automated test -- zero
  remain covered only by a manual verification note.
- **SC-002**: A pull request that reintroduces any previously-fixed defect
  from Milestones 1-5 (verified by deliberately reverting one fix and
  confirming the suite catches it) is blocked from merging by a failing
  check, every time, with no manual step required to catch it.
- **SC-003**: A pull request that changes no observable behavior (e.g. a
  documentation-only change) passes the full check suite without any
  false-positive failure.
- **SC-004**: A contributor can identify which specific check failed,
  directly from the pull request's CI status, without needing to run
  anything locally first.
- **SC-005**: The full check suite completes within 15 minutes of a pull
  request being opened or updated, so it does not become a bottleneck to
  merging.
- **SC-006**: Re-running the full check suite three times against the same
  unmodified commit produces the same pass/fail result each time (no
  flaky, non-deterministic check in the gate).

## Assumptions

- The project's existing per-milestone `check:*` scripts and Playwright
  specs (see tech-stack.md's "Testing & quality" table) are the right
  building blocks for this suite and are not being replaced wholesale --
  this milestone formalizes and completes their wiring rather than
  re-architecting verification from scratch. Which CI platform hosts this
  and how the check suite's internals are organized are implementation
  choices for `plan.md`, not this spec.
- "Blocks merge" means a contributor with normal repository permissions
  cannot merge a pull request with a failing required check through the
  platform's standard merge control -- not that merging is physically
  impossible under every possible administrative override.
- Real Mode's live end-to-end verification against an actual model
  provider (the Milestone 2 manual task) stays a manual, documented
  process outside CI, consistent with tech-stack.md's existing "no
  committed API key in CI" precedent for Real Mode's other automated
  checks.
- Converting an existing manual/ad hoc verification into an automated test
  is expected to require choosing a specific tool or pattern per scenario;
  beyond the structural-assertion approach specified above for
  visually-judged criteria, the remaining technique choices are a
  `plan.md`/`tasks.md` decision, not specified here.
- "Every Success Criterion" refers to Milestones 1-5 as they exist today;
  Milestone 6 does not retroactively expand or renegotiate what those
  milestones' Success Criteria say, only ensures each already-written one
  has automated coverage.
