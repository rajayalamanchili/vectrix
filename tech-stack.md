# Tech Stack

**Project**: Vectrix
**Status**: Locked for Milestone 1
**Last amended**: 2026-08-03

## Purpose

Cross-module technology decisions live here, once, rather than being
re-decided per concept module. Per Constitution Principle VI and the
Development Workflow section, a `plan.md` that deviates from this file
without amending it first fails the Constitution Check.

## Frontend

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) | Static-friendly (`generateStaticParams` per concept route), zero backend needed for a client-only app, good fit for eventual deployment to any static host. |
| Language | TypeScript | The `ConceptModule` contract (Constitution Principle I) is enforced at compile time via a shared interface -- this only works with real types. |
| Styling | Tailwind CSS v4 (CSS-variable based theme) | Design tokens (color, font) defined once in `globals.css` as CSS variables, consumed by Tailwind's `@theme inline` -- no separate `tailwind.config.js` to keep in sync. |
| Fonts | System font stacks by default; Fraunces / Inter / IBM Plex Mono via `next/font/google` when network access to fonts.googleapis.com is available | The build must succeed in network-restricted environments (sandboxes, some CI). See README.md > "Restoring Google Fonts" for the one-file swap back to the intended type identity. |
| Charts / visualization | Hand-built SVG components (`StarChart`, `FlowDiagram`), no charting library | The signature "star chart" visualization needed bespoke behavior (course-lines from a query beacon to its nearest neighbors) that a general-purpose charting library doesn't model directly -- and the visualization surface area is small enough that a dependency wasn't justified. Revisit if a future module needs genuinely general-purpose charting (e.g. line/bar charts over real metrics). |
| State management | React `useState`/`useMemo` only, lifted to the smallest common parent (e.g. `PipelineWalkthrough`) | No module is complex enough yet to justify a state library; revisit only if a future module's cross-step state genuinely outgrows prop-drilling. |

## Simulated AI behavior (Milestone 1)

| Concern | Choice | Rationale |
|---|---|---|
| "Embedding" | Deterministic bag-of-words vector + fixed seeded random projection to 2D (`mockEmbedding.ts`) | No real embedding model or API call required (Constitution Principle V: deterministic by default; spec.md Assumptions). Explicitly disclosed in the UI per Constitution Principle II. |
| "Generation" | Template-based summary of the top retrieved chunk (`GenerationStep.tsx`) | Zero API keys needed to run the playground standalone. The function is isolated to one file/one function specifically so a real model call is a one-seam swap later -- see the code comment at that call site. |
| Similarity scoring | Cosine similarity over the same bag-of-words vectors used for plotting | Keeps the metric shown in the UI mathematically consistent with what's plotted, rather than introducing a second, disconnected notion of "similarity." |

## Testing & quality

| Concern | Choice | Rationale |
|---|---|---|
| Type checking | `tsc` via `next build` | The `ConceptModule` contract's enforcement depends on this running cleanly on every change. |
| Lint | ESLint (`eslint-config-next`) | Ships with the framework; no additional config needed for Milestone 1. |
| Visual/behavioral verification | Playwright, driven manually during development | Used to verify each pipeline step and the variants comparison actually render and update correctly; not yet wired into CI (candidate for Milestone 2, see roadmap.md). |
| Extensibility regression check (SC-002) | A test that scans core files (home page, registry, dynamic route) for concept-id-keyed conditionals | Not yet implemented as of Milestone 1's initial build -- tracked as a required task before Milestone 1 is considered done (see roadmap.md). |

## Explicitly not yet decided (do not pre-select)

- Testing framework for automated (non-manual-Playwright) checks --
  decide when SC-002/SC-003/SC-005's automated checks are actually built.
- Deployment target -- deferred until there's a reason to deploy rather
  than run locally / in Claude Code.
- Any backend, database, or auth -- out of scope per spec.md Assumptions
  until a future module genuinely needs one (e.g. a concept requiring
  saved learner progress).

**Version**: 1.0.0 -- Locked 2026-08-03, scoped to Milestone 1
