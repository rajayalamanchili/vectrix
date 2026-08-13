# Research: Deployment to Staging and Production

## 1. Deployment platform

**Decision**: Vercel, connected directly to the existing GitHub
repository (`github.com/rajayalamanchili/vectrix`) via its native Git
integration.

**Rationale**: Vercel is built by the same team as Next.js and builds/
serves the framework's default (non-static-export) output with zero
configuration -- no `next.config.ts` change, no new `vercel.json`, no
new npm dependency, consistent with every prior milestone's "no new
dependency unless justified" precedent (tech-stack.md). The app already
uses App Router features that assume a Next.js-aware host (e.g.
`003-parameter-exploration`'s `useSearchParams()`/`<Suspense>`
requirement, discovered by reading Next.js's own docs per AGENTS.md);
Vercel supports these natively rather than requiring `output: 'export'`
and revalidating every route still behaves identically under full
static export. Vercel's free "Hobby" tier is sufficient for a
low-traffic learning tool, and its GitHub integration deploys the
Production Branch (`main`) and any other pushed branch automatically
with no manual trigger, directly satisfying FR-001/FR-002. This is also
the platform explicitly chosen in conversation before this planning
pass began.

**Alternatives considered**: A static export (`output: 'export'`)
deployed to a generic static host (GitHub Pages, S3+CloudFront,
Cloudflare Pages) was considered, since tech-stack.md's Frontend table
already praises Next.js as "static-friendly... good fit for eventual
deployment to any static host." Rejected for this milestone specifically
because it would require re-verifying every existing route (including
the `<Suspense>`-wrapped `useSearchParams()` page) still builds and
behaves identically under full static export -- an untested assumption
-- for no benefit, when a zero-config, dynamic-capable host (Vercel)
already satisfies every requirement in spec.md without that risk.
Netlify was considered as a comparable capability-for-capability
alternative, but rejected for having no existing precedent anywhere in
this repository and no reason to prefer it over the framework's own
first-party host, which is also what was explicitly requested.

## 2. Staging environment mechanism

**Decision**: Use Vercel's default per-branch deployment behavior
directly -- set `main` as the Production Branch (Vercel's own default
for a newly connected repository) and let the `staging` branch receive
Vercel's automatically-generated, stable branch-alias URL (in the shape
`git-staging-<project>-<team>.vercel.app`), which Vercel updates in
place on every push to that branch. No custom domain, no `vercel.json`,
and no separate second Vercel project or paid-tier "Environments"
feature.

**Rationale**: Vercel assigns every tracked branch a stable alias URL
that persists and simply gets redeployed on each push -- this already
satisfies FR-002/FR-003/FR-004 (a distinct, stable staging URL that
updates independently of production) the moment the repository is
connected, with zero additional configuration. spec.md's own Assumption
explicitly says a custom domain is not required, so there's no reason
to add the extra "assign a branch to a custom domain" step Vercel also
offers. A second Vercel project pointed at the same repo was considered
and rejected as unnecessary duplication of dashboard/config surface for
a capability the first project's branch-alias behavior already
provides for free.

**Alternatives considered**: Vercel's paid-plan "Custom Environments"
feature (beyond the built-in Production/Preview split) would offer a
more first-class "staging" label in Vercel's own UI, but requires a
paid plan for a personal learning-tool project with no such budget
line -- rejected as disproportionate to the actual need, which the
free branch-alias behavior already meets.

## 3. Deploy-time secrets

**Decision**: No Vercel Environment Variables are configured for this
feature; the build runs with none.

**Rationale**: `grep -rn "process.env" src/` (run against the current
codebase) returns zero matches -- the app has no server-side secret
today, consistent with tech-stack.md's Real Mode design (API keys stay
client-side, in-memory only, per `RagConcept.tsx`). This directly
satisfies FR-005/SC-004 without any action needed beyond leaving
Vercel's Environment Variables panel empty.

**Alternatives considered**: None -- there is no secret this milestone
introduces or needs to manage. If a future milestone adds a
server-side secret, this decision (and tech-stack.md's key-isolation
stance) would need to be revisited first, per spec.md's Edge Cases.

## 4. Verification approach for this feature

**Decision**: Manual, documented verification against the real, live
Vercel deployments (`quickstart.md`), not a new automated check script
or Playwright spec added to `check:all`.

**Rationale**: Unlike every prior milestone's `check:*` additions,
this feature's subject is infrastructure that exists outside the
repository's own runtime -- there is no local dev server or mocked
provider response to point Playwright at the way `tests/real-mode/`
mocks HTTP responses. This matches the project's own existing
precedent for anything that can only be verified against a live
external service: Milestone 2's `roadmap.md` explicitly records "a
real end-to-end run against the live OpenAI API" as a manual,
documented `tasks.md` task rather than a CI-enforced script, precisely
because committing real infrastructure access to an automated suite
was out of scope. The same reasoning applies here, one level up the
stack (deployment infrastructure rather than a live model API).

**Alternatives considered**: A synthetic-monitoring script that
periodically curls both live URLs and asserts a 200 response was
considered, but rejected as new, ongoing operational surface (it would
need its own hosting and schedule to run outside of CI, which only
executes on pull requests) disproportionate to a personal learning
tool's actual availability needs. Revisit only if uptime monitoring
becomes a concrete, stated need.

## 5. `tech-stack.md` amendment

Per the constitution's Technology Constraints section ("A `plan.md`
that deviates from `tech-stack.md` without first amending it fails the
Constitution Check"), the decisions above are recorded as a new
"Deployment (Milestone 7)" section in `tech-stack.md`, and the
now-resolved "Deployment target" line is removed from that file's
"Explicitly not yet decided" section, as part of this planning pass
(see the diff accompanying this plan).
