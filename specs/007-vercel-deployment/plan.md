# Implementation Plan: Deployment to Staging and Production

**Branch**: `007-vercel-deployment` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-vercel-deployment/spec.md`

## Summary

Stand up two persistent, auto-deploying environments for the existing
Vectrix app -- production tracking `main`, staging tracking a
long-lived `staging` branch -- on Vercel, connected via its native
GitHub integration. This is infrastructure/configuration only: no new
application code, no new npm dependency, no `vercel.json`, and no
deploy-time secret, since the app is already fully client-side (see
`research.md`).

## Technical Context

**Language/Version**: N/A -- no new application code or language; this
feature is deployment configuration for the existing Next.js 16 /
TypeScript app.

**Primary Dependencies**: Vercel, via its native GitHub Git integration
-- no new npm package. Zero-config for the app's existing default
(non-static-export) Next.js build output (research.md item 1).

**Storage**: N/A

**Testing**: Manual, documented verification against the real, live
deployments (`quickstart.md`) -- no new Playwright spec or `check:*`
script added to `check:all`, since this feature's subject is
infrastructure outside the repository's own runtime (research.md
item 4).

**Target Platform**: Vercel's managed Next.js hosting (one production
deployment, one staging deployment).

**Project Type**: Existing single web-app (Next.js App Router). This
feature adds no new source directory.

**Performance Goals**: N/A -- no performance requirement in spec.md
beyond Vercel's own platform defaults.

**Constraints**: Zero deploy-time secrets (FR-005); production and
staging must update independently of one another (FR-004).

**Scale/Scope**: Single low-traffic learning-tool app; Vercel's free
"Hobby" tier is sufficient (research.md item 1).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Extensibility Is Structural | PASS | This feature touches no `src/concepts/` code and adds no conditional anywhere keyed on a concept id -- it's deployment configuration outside the app's own source. |
| II. Never Blur Simulated vs. Real Behavior | PASS (N/A) | No change to any simulated or real-mode behavior. |
| III. Every Interaction Teaches Something | PASS (N/A) | No new slider, toggle, or chart -- no learner-facing UI at all. |
| IV. Guided, Not Just Dense | PASS (N/A) | No new interactive surface. |
| V. Deterministic By Default | PASS | A given commit always produces the same build output; this feature introduces no randomness. (Scope note: this principle governs simulated pipeline *behavior*, not build reproducibility -- included here for completeness, not because it was in tension.) |
| VI. Spec Before Code | PASS | `spec.md` was written and passed its quality checklist before this plan; `tasks.md` follows this plan, same order as every prior milestone. |
| VII. Accessible and Reduced-Motion by Default | PASS (N/A) | No new interactive control introduced. |
| Technology Constraints (tech-stack.md) | PASS, after amendment | `tech-stack.md` had no deployment-platform entry (it was explicitly listed under "Explicitly not yet decided"). Amended in this planning pass -- see the new "Deployment (Milestone 7)" table and the removed "Deployment target" line, tech-stack.md v1.8.0 -- before this plan proceeds, per the constitution's "a `plan.md` that deviates from `tech-stack.md` without first amending it fails the Constitution Check" rule. |

**Post-Phase-1 re-check**: Still PASS across all rows -- Phase 1's
design artifacts (`data-model.md`, `contracts/`,
`quickstart.md`) describe infrastructure configuration and a manual
verification walkthrough only; nothing in them introduces application
code, a new interactive control, or a new dependency that would change
any row above.

## Project Structure

### Documentation (this feature)

```text
specs/007-vercel-deployment/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── deployment-environments-contract.md   # Phase 1 output
├── checklists/
│   └── requirements.md   # /speckit-specify output
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

No new source directory. The existing single-project Next.js structure
is unchanged:

```text
src/
├── app/
├── concepts/
└── ...                   # unchanged by this feature

tech-stack.md              # amended: new "Deployment (Milestone 7)"
                            # section; "Deployment target" line removed
                            # from "Explicitly not yet decided"
roadmap.md                  # already amended (prior commit) with the
                            # Milestone 7 entry this plan implements
```

**Structure Decision**: No new `src/` directories and no new
top-level config file (no `vercel.json` -- Vercel autodetects the
existing `next build` output with zero configuration, per
research.md item 1). This feature's only durable artifacts are its own
`specs/007-vercel-deployment/` documentation and the `tech-stack.md`
amendment above; the remaining work (connecting the Vercel dashboard to
the repo, creating the `staging` branch) is operational setup captured
as tasks in `tasks.md`, not new repository structure.

## Complexity Tracking

*No entries -- the Constitution Check above has no unjustified
violations.*
