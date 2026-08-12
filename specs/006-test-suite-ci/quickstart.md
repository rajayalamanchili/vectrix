# Quickstart: Validating Automated Test Suite + CI

**Feature**: `006-test-suite-ci` | **Date**: 2026-08-12

## Prerequisites

```bash
npm install
npm run check:all   # confirm the pre-existing local suite still passes first
```

A GitHub remote with push access (`git remote -v` should show
`github.com/rajayalamanchili/vectrix`) and `gh` CLI authenticated, since
several scenarios below require opening a real pull request to observe
GitHub Actions/branch-protection behavior -- this feature's subject
*is* the PR-merge gate itself, so it can't be fully validated against a
local dev server the way Milestones 1-5's UI features were.

## 0. Regression pass (run first)

Re-run `specs/001-core-platform-rag-module/quickstart.md` through
`specs/005-agents-tool-use/quickstart.md`'s scenarios and `npm run
check:all` as it existed before this feature. Confirm zero behavioral
difference in any concept module -- this feature only adds CI wiring and
new tests, it does not touch `src/concepts/`.

## Scenario validation (spec.md User Stories 1-3)

1. **US1, Acceptance Scenario 1-2: checks run automatically and block a
   real regression.** Create a branch that deliberately reintroduces one
   previously-fixed defect (e.g. temporarily revert the Milestone 1
   chunking-strategy state-reset fix, or the Milestone 3 contrast-ratio
   fix), push it, and open a PR against `main` with `gh pr create`.
   Confirm: the workflow starts within moments of the PR opening with no
   manual trigger, each job/matrix entry appears individually in the PR
   checks list, the relevant check fails, and the PR's merge button is
   disabled/blocked by GitHub (not just "checks failing" shown
   informationally).
2. **US1, Acceptance Scenario 3: a fix un-blocks the PR.** On that same
   PR, revert the deliberate regression and push again. Confirm the
   workflow re-runs automatically (no manual re-trigger) and the PR
   becomes mergeable again once every check is green.
3. **US1, Acceptance Scenario 4: no false positives.** Open a second PR
   containing only a comment or documentation change. Confirm the full
   check suite passes cleanly.
4. **US2: every Success Criterion is traceable.** Run `npm run
   check:sc-coverage` locally. Confirm it passes against the completed
   manifest (zero missing entries across all five specs' `SC-###`
   lists). Then temporarily delete one manifest entry and re-run --
   confirm it fails with a message naming the specific missing
   `(specPath, scId)` pair, proving the check actually verifies
   completeness rather than trivially passing.
5. **US2, Acceptance Scenario 4: a converted test would have caught its
   original defect.** For at least one gap closed by this feature (e.g.
   `tests/a11y/viewport-readability.spec.ts` for Milestone 1's SC-004),
   temporarily reintroduce the original layout defect it was written
   against and confirm the new test fails; revert and confirm it passes.
6. **US3: a failing check is individually identifiable.** On a PR with
   exactly one failing check (e.g. re-use scenario 1's setup), confirm a
   reviewer can see which named check failed directly from the PR's
   checks list, without opening any other job's log, and that the failed
   job's own log names the specific assertion/script that failed (not
   just a generic non-zero exit).

## Success criteria checklist

- [ ] SC-001: `npm run check:sc-coverage` passes with zero gaps across
      all 33 `SC-###` entries in specs 001-005.
- [ ] SC-002: Scenario 1 above blocks merge; reverting the regression
      (scenario 2) restores mergeability.
- [ ] SC-003: Scenario 3 above passes with no false positive.
- [ ] SC-004: Scenario 6 above -- failing check identifiable from the PR
      UI alone.
- [ ] SC-005: The PR from scenario 1 shows all jobs complete (pass or
      fail) within 15 minutes of opening.
- [ ] SC-006: Re-run the full workflow three times against the same
      unmodified commit (`gh workflow run` or push an empty commit
      three times); confirm identical pass/fail results each time.
