# Quickstart: Validating Deployment to Staging and Production

**Feature**: `007-vercel-deployment` | **Date**: 2026-08-13

## Prerequisites

- A Vercel account, with the `github.com/rajayalamanchili/vectrix`
  repository imported as a Vercel Project (Vercel dashboard → Add New
  → Project → import from GitHub). This is a one-time, manual,
  account-owning-human step -- it cannot be done from this repository's
  own tooling. See `contracts/deployment-environments-contract.md` for
  the exact settings the imported project needs (Production Branch =
  `main`, no Environment Variables).
- A `staging` branch pushed to the same GitHub remote (`git checkout -b
  staging && git push -u origin staging`, from a commit at or after
  this feature's own work).
- `gh` CLI authenticated (`gh auth status`), consistent with
  `006-test-suite-ci/quickstart.md`'s precedent -- this feature's
  subject, like that one, is infrastructure that can't be fully
  validated against a local dev server.

## 0. Regression pass (run first)

This feature adds no `src/` code -- run `npm run check:all` once
locally to confirm the existing app is unaffected (it should be,
since nothing in `src/` changed). Re-running Milestones 1-6's own
quickstart.md scenarios is not necessary here, since this feature is
additive infrastructure with no code path that touches any of them.

## Scenario validation (spec.md User Stories 1-3)

1. **US1, Scenario 1: a merge to `main` goes live in production.**
   Merge any small, visible change to `main` (or push directly, given
   this repo's existing single-maintainer flow). In the Vercel
   dashboard, confirm a new Production deployment starts within
   moments with no manual trigger. Once it completes, visit the
   production URL and confirm the change is visible.
2. **US1, Scenario 3 / US3: a failed build on `main` doesn't take down
   production.** Skip performing this directly against `main` (too
   risky to rehearse against the real production branch) -- Scenario 4
   below exercises the identical failure-handling behavior against
   `staging` instead, which Vercel treats identically.
3. **US2, Scenario 1: a push to `staging` goes live on its own URL.**
   Push a small, visible change to the `staging` branch only (not
   merged to `main`). Confirm a new deployment starts automatically,
   and once complete, the staging URL (Vercel's auto-generated
   branch-alias URL for `staging`, found in the Vercel dashboard's
   Deployments list) reflects the change.
4. **US2, Scenario 2: staging and production are independent.** With
   the change from step 3 live on staging but not yet merged to
   `main`, revisit the production URL and confirm it does *not* show
   that change.
5. **US2, Scenario 3: merging staging's change promotes it to
   production.** Merge the `staging` branch's change into `main`.
   Confirm the production URL updates to match (per step 1's
   mechanism), without needing to push the change again.
6. **US3, Scenario 1-2: a broken build fails safely and visibly.**
   Push a deliberate build-breaking change (e.g. a syntax error) to
   `staging`. Confirm: the staging URL continues serving its last
   successful build (revisit it and confirm no downtime, no broken
   page), and the failure is visible in the Vercel dashboard's
   deployment list for that branch without needing to reproduce the
   build locally. Then revert the breaking change and push again to
   confirm staging recovers.

## Confirming the hard requirements (SC-004, FR-005)

- In the Vercel dashboard, open the project's Settings → Environment
  Variables for both Production and Preview/staging scopes. Confirm
  the list is empty -- no API key or other credential appears anywhere
  (SC-004).
