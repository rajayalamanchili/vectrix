# Contract: Deployment Environments (supports FR-001 through FR-007; SC-001 through SC-005)

**Status**: New, this plan. See `research.md` items 1-3 for the
platform, staging-mechanism, and secrets decisions this contract
implements.

## Branch → environment → URL mapping

| Branch | Environment | URL stability | Configured via |
|---|---|---|---|
| `main` | Production | Fixed for the project's lifetime | Vercel Project Settings → Git → Production Branch = `main` (Vercel's own default for a newly connected repo -- no change needed) |
| `staging` | Staging | Fixed for as long as the `staging` branch exists | Automatic -- Vercel assigns every non-production branch a stable alias URL the first time it's pushed; no dashboard step required |

No other branch is deployed to either persistent environment (Vercel
may still produce ephemeral per-commit preview URLs for other branches
as a side effect of its GitHub integration -- per spec.md's
Assumptions, that's a bonus this contract neither requires nor tests).

## Trigger

A `git push` to `main` or `staging` (directly or via a merged pull
request) is the only trigger. No manual deploy command, dashboard
click, or CI job invocation is part of this contract -- FR-001/FR-002's
"no manual trigger required" is satisfied by Vercel's GitHub
integration alone.

## Secrets

Zero Vercel Environment Variables are configured for either
environment (research.md item 3). A future change that introduces a
server-side secret would violate FR-005/SC-004 and must not be made
without first amending this contract and `tech-stack.md`'s
key-isolation stance.

## Failure behavior

A build/deploy that fails MUST leave `Environment.latestDeployment`
(see `data-model.md`) unchanged -- the environment keeps serving its
last successful build. This is Vercel's default behavior for both the
Production Branch and any other tracked branch: a failed build is
never promoted to "current," and the failure is visible in that
branch's deployment list in the Vercel dashboard (and, for `main`, also
surfaces as a check on the merged pull request, alongside the existing
`006-test-suite-ci` CI checks) -- satisfying FR-007 with no additional
configuration.

## What "done" looks like

- Visiting the production URL shows the build from the most recent
  successful `main` deployment.
- Visiting the staging URL shows the build from the most recent
  successful `staging`-branch deployment, independent of what
  production currently shows.
- No API key or other secret appears anywhere in Vercel's Project
  Settings for this project.
- A deliberately failing push to `staging` leaves the staging URL
  serving its prior build, with the failure visible in Vercel's
  deployment list for that branch.
