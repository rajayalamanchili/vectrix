# Implementation Plan: Automated Test Suite + CI

**Branch**: `006-test-suite-ci` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-test-suite-ci/spec.md`

## Summary

Wire the project's existing `check:*` scripts, Playwright specs, `tsc`,
`eslint`, and `next build` into a GitHub Actions workflow that runs on
every pull request and blocks merge on any failure -- and close the
handful of Success Criteria across Milestones 1-5 that today are only
backed by a manual quickstart.md walkthrough or an ad hoc script run
(roadmap.md's own status notes name these explicitly), so `npm run
check:all` going green is, for the first time, actually equivalent to
"every Success Criterion in every spec.md still holds." The technical
approach adds no new npm dependency: a GitHub Actions workflow file
(platform config, not a package), one new pure-function check
(`sc-coverage.ts`, matching the project's existing "small purpose-built
script" pattern) that verifies every `SC-###` across the five existing
specs has a traceable, committed test, and a small number of new
Playwright/structural-assertion tests closing the identified gaps.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 22 (existing project stack, unchanged)

**Primary Dependencies**: Next.js 16, Playwright 1.62 (`@playwright/test`, `@axe-core/playwright`), `tsx` -- all already present; no new npm dependency added. New: a GitHub Actions workflow (`.github/workflows/ci.yml`), which is repository configuration consumed by GitHub's own infrastructure, not an npm package.

**Storage**: N/A

**Testing**: Playwright (existing, extended with a handful of new specs/assertions) + `tsx`-run pure-function scripts (existing pattern, extended with one new script, `scripts/checks/sc-coverage.ts`)

**Target Platform**: GitHub Actions `ubuntu-latest` runners (the project's pull requests already live on `github.com/rajayalamanchili/vectrix`, confirmed via `git remote -v`)

**Project Type**: Single Next.js web application (existing structure, unchanged) -- this feature adds CI/tooling around it, not a new deployable component

**Performance Goals**: Full CI suite (all jobs, run in parallel) completes within 15 minutes per pull request (spec.md SC-005, confirmed via `/speckit-clarify`)

**Constraints**: No new npm dependency (continues every prior milestone's precedent per tech-stack.md); no real third-party API key or live-provider network call in CI (spec.md FR-006); every check required/merge-blocking from the moment it's added, no advisory period (spec.md FR-002, confirmed via `/speckit-clarify`); adding a new concept module's checks to the gate must not require editing the CI workflow's job list (spec.md FR-007)

**Scale/Scope**: 5 existing milestones' specs (33 total `SC-###` entries), 9 existing `check:*` npm scripts, ~86 existing Playwright tests (66 a11y + 20 module-specific), plus this milestone's own new coverage script and gap-closing tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. Extensibility Is Structural | Yes | The CI workflow must not gain a per-module conditional as new concept modules ship (spec.md FR-007). **Design decision** (research.md): the workflow generates its check-job matrix dynamically from `package.json`'s `check:*` script names via a first "discover checks" job, so adding a module's check to `check:all`/`package.json` -- already the sole integration point per Milestone 5's precedent -- is the only change needed. No job list to hand-edit in `.github/workflows/ci.yml`. PASS. |
| II. Never Blur Simulated vs Real | No new simulated behavior introduced | This feature doesn't add or change any simulated AI behavior; it tests existing ones more thoroughly. N/A. |
| III. Every Interaction Teaches Something | No new learner-facing UI | This is a CI/tooling milestone -- no new slider, toggle, or chart ships. N/A. |
| IV. Guided, Not Just Dense | No new learner-facing UI | Same as above. N/A. |
| V. Deterministic By Default | Yes | spec.md SC-006 requires the check suite itself to be flake-free across repeated runs. The new gap-closing tests reuse existing fixed sample documents/fixtures (e.g. the pinned "coffee" fixture already used by `determinism.ts`), introducing no new unseeded randomness. PASS. |
| VI. Spec Before Code | Yes | This plan follows an approved `spec.md`, itself preceded by a completed `/speckit-clarify` pass. PASS (in progress, this document). |
| VII. Accessible and Reduced-Motion by Default | Partially | No new interactive control ships, but closing Milestone 1's SC-004 gap (375px viewport readability) touches accessibility-adjacent testing. Per `/speckit-clarify`, this is verified via structural/DOM assertions (no horizontal scroll, no clipped text, 44x44px touch targets), not a new UI pattern. PASS. |

No violations. **Complexity Tracking is not needed.**

**Post-Phase-1 re-check**: research.md's and data-model.md's decisions
(matrix-driven job generation, the traceability manifest, structural/DOM
viewport assertions) introduce no new npm dependency, no per-module
conditional, and no new learner-facing UI -- the table above still holds
unchanged after design. Re-confirmed, no new violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-test-suite-ci/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── ci-workflow-contract.md
│   └── sc-traceability-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml                        # NEW: GitHub Actions workflow (this feature's core deliverable)

scripts/checks/
└── sc-coverage.ts                    # NEW: verifies every SC-### across specs 001-005 has a manifest entry
└── lib/
    └── sc-traceability-manifest.ts   # NEW: the manifest data (SC-### -> covering test(s)) sc-coverage.ts checks

tests/
├── a11y/
│   ├── viewport-readability.spec.ts  # NEW: closes Milestone 1 SC-004 (structural/DOM assertions, per clarification)
│   └── pipeline-walkthrough.spec.ts  # EXTENDED: closes Milestone 1 SC-008 (chunking-strategy-boundary)
├── agents-tool-use/
│   ├── walkthrough.spec.ts           # EXTENDED: closes Milestone 5 question-switch state-reset gap
│   └── strategy-comparison.spec.ts   # EXTENDED: closes Milestone 5 SC-007's same-answer-more-steps gap
└── smoke/
    └── first-time-visitor-journey.spec.ts  # NEW: closes Milestone 1 SC-001's committed first-time-visitor journey

package.json                          # `check:sc-coverage` script added to `check:all`'s chain
tech-stack.md                         # amended: CI platform + traceability-manifest decisions recorded
```

**Structure Decision**: This feature extends the existing single Next.js
project (`src/`, `tests/`, `scripts/checks/`) -- no new top-level project
or frontend/backend split. The one new top-level directory is
`.github/workflows/`, standard location for GitHub Actions. New test
files land in the existing `tests/` tree, following each gap's natural
milestone home (e.g. the M1 viewport gap under `tests/a11y/`, matching
where M1's other a11y tests already live) rather than a
milestone-numbered subdirectory, consistent with how `tests/a11y/`
already holds specs spanning multiple milestones.

## Complexity Tracking

*No violations -- table not needed.*
