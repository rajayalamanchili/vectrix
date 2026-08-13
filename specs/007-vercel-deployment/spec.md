# Feature Specification: Deployment to Staging and Production

**Feature Branch**: `007-vercel-deployment`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Milestone 7"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A merged change is live in production automatically (Priority: P1)

Today, a change merged to `main` only exists on a contributor's machine or in
CI's own ephemeral build -- there is no reachable, always-on site a learner
can actually visit. This story makes every merge to `main` result in a live,
publicly reachable production site reflecting that change, with no manual
deploy step.

**Why this priority**: This is the actual point of the milestone: Vectrix is
a learning tool meant to be used, not just built and tested locally. Every
other story in this feature exists in service of production being reliably
live.

**Independent Test**: Can be fully tested by merging a small, visible change
(e.g. a copy edit) to `main` and confirming the production URL reflects it
without anyone running a deploy command by hand.

**Acceptance Scenarios**:

1. **Given** a change has been merged to `main`, **When** the merge
   completes, **Then** the production site reflects that change at a
   stable, publicly reachable URL within a few minutes, with no manual
   deploy step.
2. **Given** the production site is live and unchanged, **When** no new
   merge has happened, **Then** the site remains reachable and stable
   indefinitely (no manual "keep-alive" action required).
3. **Given** a merge to `main` that fails to build, **When** the failed
   build is detected, **Then** the previously live production deployment
   remains untouched and reachable -- the failed build never replaces it.

---

### User Story 2 - A change can be reviewed live before it reaches production (Priority: P1)

Today, reviewing a change in a real deployed environment means checking out
the branch and running it locally. This story adds a second, separate
environment -- staging -- that reflects whatever was most recently pushed to
a long-lived `staging` branch, so a change can be seen live, in a real
deployed environment, before it's merged to `main`.

**Why this priority**: Equal priority to User Story 1 because the two
together are the actual milestone scope (roadmap.md's Definition of Done
names both a production and a staging environment as required, not staging
as a stretch goal) -- shipping only production would leave no pre-merge
review environment at all.

**Independent Test**: Can be fully tested by pushing a change to the
`staging` branch (without merging it to `main`) and confirming it appears on
the staging URL, while the production URL remains unchanged.

**Acceptance Scenarios**:

1. **Given** a change has been pushed to the `staging` branch, **When** the
   push completes, **Then** the staging site reflects that change at its
   own stable URL, distinct from the production URL, within a few minutes,
   with no manual deploy step.
2. **Given** a change is live on staging but not yet merged to `main`,
   **When** the production site is checked, **Then** production does not
   reflect that change -- the two environments are independent.
3. **Given** a change on staging is later merged to `main`, **When** that
   merge completes, **Then** the same change also becomes live on
   production (per User Story 1), without needing to be re-pushed.

---

### User Story 3 - A broken deploy fails safely, not silently (Priority: P3)

A contributor pushes a change that breaks the build (a typo, a failing
type-check) to either `main` or `staging`. Rather than the environment going
dark, half-updating, or silently serving a broken build, the previous
working version stays live and the failure is visible to whoever pushed it.

**Why this priority**: Lower priority than User Stories 1-2 because it's a
safety property of the deploy mechanism those stories already require,
rather than new user-facing capability -- but it's still required, since a
"deployment" that can take down a working site on a bad push is worse than
no automated deployment at all.

**Independent Test**: Can be fully tested by deliberately pushing a
build-breaking change to `staging` (the lower-stakes branch) and confirming
the staging site keeps serving its last successful build while the failure
is visibly reported.

**Acceptance Scenarios**:

1. **Given** a push whose build fails, **When** the build failure occurs,
   **Then** the environment's live site continues serving its last
   successful build -- visitors see no downtime and no broken/partial page.
2. **Given** a build has failed, **When** the person who pushed it looks
   for the result, **Then** the failure is visible without needing to
   reproduce the build locally to discover it happened.

---

### Edge Cases

- What happens when `staging` and `main` diverge significantly (staging has
  been sitting behind or ahead of main for a while)? Staging always simply
  reflects whatever was most recently pushed to it -- there is no automatic
  sync or drift warning between the two branches; keeping them reasonably
  aligned is a process discipline, not a behavior this feature enforces.
- What happens if a future change to the app requires a server-side secret
  (contrary to its current fully client-side design)? Out of scope for this
  feature -- introducing a server-side secret would require revisiting this
  spec's Assumption that no deploy-time credential is ever needed, and
  amending `tech-stack.md`'s existing key-isolation stance first.
- What happens when someone visits the staging URL directly (not through a
  review link)? Staging is reachable by anyone who has its URL, the same as
  production -- see Assumptions for why access restriction is out of scope.
- What happens during the first-ever deploy, before any successful build
  exists yet to fall back to? The initial deploy must succeed on its own;
  User Story 3's "fall back to the last successful build" guarantee only
  applies once at least one successful deploy exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically build and deploy the application to
  a production environment on every push to the `main` branch, with no
  manual trigger required.
- **FR-002**: System MUST automatically build and deploy the application to
  a staging environment on every push to a dedicated `staging` branch, with
  no manual trigger required.
- **FR-003**: Production and staging deployments MUST be reachable at two
  distinct, stable URLs that do not change between deploys.
- **FR-004**: The production and staging environments MUST update
  independently of each other -- a push to one MUST NOT alter what the
  other currently serves.
- **FR-005**: The deployment process MUST NOT require any credential or
  secret to be configured, consistent with the application's existing
  fully client-side architecture (no API key is ever sent to or stored on a
  first-party server, per its Real Mode design).
- **FR-006**: A build/deploy that fails MUST NOT replace the currently live
  deployment on that environment -- the last successful deployment MUST
  remain live and reachable until a new build succeeds.
- **FR-007**: The success or failure of each deployment attempt MUST be
  visible to whoever triggered it (via a push), without requiring a
  separate manual check to discover a failure happened.

### Key Entities

- **Production Environment**: The stable, public deployment that always
  reflects the most recent successful build from `main`.
- **Staging Environment**: A separate, stable, public deployment that
  always reflects the most recent successful build from the `staging`
  branch, used for pre-merge review.
- **Deployment**: One build-and-release attempt triggered by a push to
  either tracked branch, resulting in either a new live version of that
  environment or a reported failure with the environment left unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After merging a change to `main`, the production site
  reflects that change within 10 minutes, with zero manual steps taken by
  the person who merged it.
- **SC-002**: After pushing a change to the `staging` branch, the staging
  site reflects that change within 10 minutes, with zero manual steps
  taken by the person who pushed it.
- **SC-003**: Production and staging are simultaneously reachable at two
  different URLs, verifiable by visiting both and observing they can show
  different content/versions at the same time.
- **SC-004**: Zero credentials (API keys or other secrets) are present
  anywhere in the deployment configuration, verifiable by inspection.
- **SC-005**: A deliberately build-breaking push to either environment
  results in that environment's previously live version remaining
  reachable and unaffected, verified by attempting a failing push and
  confirming the site is unchanged and the failure is visibly reported.

## Assumptions

- The app remains fully client-side (per `tech-stack.md`'s current
  architecture, confirmed by no `process.env` reference existing anywhere
  in `src/` as of this writing), so no deploy-time secret management is
  needed to satisfy FR-005/SC-004. If a future milestone introduces a
  server-side secret, this assumption -- and `tech-stack.md`'s key-isolation
  stance -- must be revisited first.
- GitHub remains the source-code host (`origin` is already
  `github.com/rajayalamanchili/vectrix`), since automatic branch-tracked
  deployment assumes a connected git provider integration.
- "Staging" is one long-lived branch, not a per-pull-request ephemeral
  environment. Many deployment platforms also provide automatic per-PR
  preview deployments as a side effect of their GitHub integration; if
  available, that's a welcome bonus but not something this spec's Success
  Criteria test for or depend on.
- One production URL and one staging URL, both at the deployment platform's
  own default domain, are sufficient to satisfy this spec -- a custom
  domain is not required.
- Staging is reachable by anyone with its URL, same as production, rather
  than access-restricted -- consistent with the app having no accounts,
  no learner data persistence, and no server-side secret to protect
  (per `roadmap.md`'s "Out of current roadmap" section), an unfinished or
  broken staging build carries no real risk beyond looking unpolished.
- Which specific deployment platform hosts this, and how its
  branch-to-environment mapping is configured, is an implementation choice
  for `plan.md` (and `tech-stack.md`, which the plan amends), not specified
  here, consistent with how prior specs (e.g. `006-test-suite-ci/spec.md`)
  kept platform choice out of `spec.md` itself.
