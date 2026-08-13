# Data Model: Deployment to Staging and Production

This feature introduces no application data -- no new `src/concepts/`
entity, no persisted learner state. Its "entities" (per spec.md's Key
Entities section) are infrastructure configuration, formalized here for
the same traceability purpose a `data-model.md` normally serves.

## Environment

Represents one of the two deployment targets this feature requires.

| Field | Type | Notes |
|---|---|---|
| `name` | `"production" \| "staging"` | Fixed, exactly two values -- FR-003/FR-004 require no more, no fewer. |
| `trackedBranch` | string | `main` for production, `staging` for staging. One branch per environment; a branch maps to at most one environment. |
| `url` | string | Stable for the environment's lifetime (FR-003). Production: the project's primary Vercel domain. Staging: Vercel's auto-generated branch-alias URL for `staging` (research.md item 2). |
| `latestDeployment` | `Deployment` | The most recent deployment that reached `"success"` -- what the environment actually serves right now (FR-006). |

**Invariant**: `production.trackedBranch` and `staging.trackedBranch`
are never equal -- a push to one environment's branch MUST NOT affect
the other (FR-004).

## Deployment

Represents one build-and-release attempt.

| Field | Type | Notes |
|---|---|---|
| `commit` | string (SHA) | The commit that triggered this deployment, via a push to a tracked branch. |
| `environment` | `Environment.name` | Which environment this attempt targets, determined solely by which branch was pushed to. |
| `status` | `"success" \| "failed"` | `"failed"` MUST NOT change what `environment.latestDeployment` points to (FR-006) -- the prior `"success"` deployment stays live. |
| `triggeredAt` | timestamp | When the push that started this deployment happened. |

**State transitions**: A `Deployment` is created in an implicit
"building" state and resolves to exactly one of `"success"` or
`"failed"`; it never transitions again afterward (each push creates a
new `Deployment` record rather than mutating an old one). Only a
`"success"` transition updates its `Environment`'s `latestDeployment`
pointer (FR-006/SC-005).
