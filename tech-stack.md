# Tech Stack

**Project**: Vectrix
**Status**: Locked for Milestones 1-2
**Last amended**: 2026-08-05

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

## Real Mode AI behavior (Milestone 2)

| Concern | Choice | Rationale |
|---|---|---|
| Provider abstraction | `RealModeProvider` behavioral interface (`embedBatch`, `generate`) driven by a data-only `ProviderConfig` (base URL, key-format pattern, embeddings/chat model names, display label) -- no provider name is hardcoded in the interface, `RealModeSession`'s type, or UI copy | Decided during `002-real-mode`'s `/speckit.plan` (2026-08-05, revised after initial draft to remove an OpenAI-specific lock-in): keeps the app genuinely swappable to any provider that speaks the same request/response shape, by changing config data rather than code. Same "one function, one seam" swap-out pattern already used by `mockEmbedding.ts`/`GenerationStep.tsx`'s `mockGenerate()`. |
| Default shipped adapter | One concrete adapter, `openaiCompatibleProvider.ts`, implementing the OpenAI-compatible REST shape (`POST {baseUrl}/embeddings`, `POST {baseUrl}/chat/completions`) via native `fetch` -- no SDK dependency added. Ships with one default `ProviderConfig` (OpenAI itself: `text-embedding-3-small` / `gpt-4o-mini`) -- the only provider actually built, wired into the UI, and end-to-end tested this milestone | This request/response shape is a de facto standard several providers implement compatibly (Azure OpenAI, Groq, Together AI, local OpenAI-compatible shims), so this one adapter covers that whole family via config swap, not just OpenAI specifically. OpenAI's own API accepts direct browser-origin requests (their SDK's `dangerouslyAllowBrowser` flag exists for exactly this use case), keeping Real Mode client-only per this file's locked backend-free stance. |
| Documented (not built) alternate: Anthropic, generation-only | Anthropic's Messages API is a genuinely different shape (not OpenAI-compatible) and has no first-party embeddings endpoint (Anthropic's own docs point to Voyage AI for that) -- recorded as a design-proof example, not implemented, selectable, or tested this milestone | Demonstrates the `ProviderConfig`/`RealModeProvider` split generalizes to a structurally different provider on paper, without expanding this milestone's scope to a multi-provider picker or a split embeddings/generation UI. See `002-real-mode/research.md`'s provider decision for the full reasoning and what a real Anthropic adapter would require (a `generate()`-only implementation, since `embedBatch()` has no Anthropic equivalent). |
| 2D projection (real embeddings) | Hand-rolled 2-component PCA (power iteration, fixed deterministic start vector and iteration count), no new dependency | Mirrors `mockEmbedding.ts`'s existing hand-rolled-math style rather than adding a charting/ML library (UMAP, t-SNE) -- doesn't trigger the "revisit if a future module needs genuinely general-purpose charting" bar above, since this is still a small, bespoke projection need. Deterministic given fixed input vectors, though the input vectors themselves (a live API response) aren't guaranteed identical run-to-run -- see `002-real-mode/research.md`'s Constitution Principle V scope note. |
| API key storage | In-memory React state only (`RagConcept.tsx`), never `sessionStorage`/`localStorage` | Simplest, most conservative way to satisfy "session-only, non-persisted" (spec.md 002) -- gone on tab close and on refresh, no browser-storage location to audit. |

## Testing & quality

| Concern | Choice | Rationale |
|---|---|---|
| Type checking | `tsc` via `next build` | The `ConceptModule` contract's enforcement depends on this running cleanly on every change. |
| Lint | ESLint (`eslint-config-next`) | Ships with the framework; no additional config needed for Milestone 1. |
| Visual/behavioral verification | Playwright, driven manually during development | Used to verify each pipeline step and the variants comparison actually render and update correctly; not yet wired into CI (candidate for Milestone 2, see roadmap.md). |
| Extensibility regression check (SC-002) | A standalone `tsx`-run script (`scripts/checks/no-cross-module-conditionals.ts`) that scans core files (home page, registry, dynamic route) for concept-id-keyed conditionals | Decided during `001-core-platform-rag-module`'s `/speckit.plan` (2026-08-03): a small purpose-built script, not a full test framework, so Milestone 6's later framework choice isn't pre-empted. See that feature's `research.md`. |
| Disclosure regression check (SC-003) | A standalone `tsx`-run script (`scripts/checks/simulated-disclosure.ts`) using `react-dom/server`'s `renderToStaticMarkup` to assert a `data-simulated-disclosure` marker is present with non-empty text | Same decision as above; static-render is sufficient since disclosure is static text, not an interaction. |
| Accessibility regression check (SC-005) | Playwright (`tests/a11y/keyboard-operability.spec.ts`) + `@axe-core/playwright`, run as a committed script rather than manually | Same decision; this is the one check needing real browser keyboard/focus behavior, which is why it promotes Playwright from "driven manually" to committed for this specific check only. |
| Determinism regression check (SC-006) | A standalone `tsx`-run script (`scripts/checks/determinism.ts`) that runs the pure chunk/embed/rank pipeline ten times against a fixed fixture and diffs output | Same decision; pure-function re-verification needs no browser or DOM. Scope stays Simulated-Mode-only after Milestone 2 -- see `002-real-mode/research.md`'s Principle V scope note. |
| Real Mode disclosure extension (FR-004, FR-006) | `scripts/checks/simulated-disclosure.ts`, extended with a `data-real-disclosure` rule | Decided during `002-real-mode`'s `/speckit.plan` (2026-08-05): same script, same command, one more assertion -- mirrors how `check:extensibility` grew FR-001's uniqueness rule in place rather than becoming a new script. |
| API-key-isolation check (SC-006, 002-spec) | `scripts/checks/key-isolation.ts` (static: no first-party server route exists) + `tests/real-mode/key-isolation.spec.ts` (Playwright, mocked provider: network-capture assertion) | New for Milestone 2 -- this is the one requirement so far with a real security/privacy consequence if wrong, so it's verified via captured network requests, not assumed from architecture alone. See `002-real-mode/contracts/real-mode-automated-checks-contract.md`. |
| Real Mode behavioral checks (SC-004, SC-007, SC-008) | Three Playwright specs under `tests/real-mode/`, provider responses mocked via route interception -- no real API key in CI | New for Milestone 2, same "small purpose-built check, not a framework" philosophy as Milestone 1's four. One real end-to-end run against the live API is a manual `tasks.md` task instead, since committing a real key to CI is out of scope. |
| Accessibility regression check (SC-009, 002-spec) | `tests/a11y/real-mode.spec.ts`, a third spec file alongside Milestone 1's two, same `npm run check:a11y` command | Extends, doesn't replace, Milestone 1's SC-005 check -- covers Real Mode's toggle, key input, temperature/N/hypothesis-count sliders, and custom-document textarea. |

## Explicitly not yet decided (do not pre-select)

- Project-wide, CI-wired testing framework (Milestone 6 scope) -- the
  four checks above close Milestone 1's specific SC-002/003/005/006 gap
  with narrowly-scoped scripts; which framework unifies verification
  across Milestones 1-5 under CI is still open, per roadmap.md Milestone
  6.
- Deployment target -- deferred until there's a reason to deploy rather
  than run locally / in Claude Code.
- Any backend, database, or auth -- out of scope per spec.md Assumptions
  until a future module genuinely needs one (e.g. a concept requiring
  saved learner progress). Milestone 2 (Real Mode) confirms this stays
  true even with real API calls in the picture: calls go straight from
  the browser to the provider, verified by `check:key-isolation`.
- A second Real Mode provider actually built, wired into the UI, and
  tested -- Milestone 2 ships and tests OpenAI only, behind a
  `ProviderConfig` abstraction general enough that a second
  OpenAI-compatible endpoint is a config change. A structurally
  different provider (e.g. Anthropic) is documented as a design proof
  (see the table above) but not built; revisit only if a future
  milestone's spec explicitly requires provider choice in the UI.

**Version**: 1.3.0 -- 2026-08-05, revised Real Mode's provider decision
to be config-driven rather than hardcoded (`ProviderConfig` +
`RealModeProvider`, OpenAI as the one default/shipped adapter) and
added a documented-not-built Anthropic generation-only alternate, after
the initial 1.2.0 draft locked "OpenAI" into the interface/types/UI-copy
language directly.

Supersedes 1.2.0 (2026-08-05, added Real Mode's AI-behavior and testing
decisions -- provider = OpenAI (hardcoded), hand-rolled PCA projection,
in-memory-only key storage, `RealModeProvider` abstraction, and five
new/extended automated checks -- during `002-real-mode`'s `/speckit.plan`;
no new npm dependency introduced) and 1.1.0 (2026-08-03, Milestone 1's
four automated checks (SC-002/003/005/006) decided during
`001-core-platform-rag-module`'s `/speckit.plan`; narrowed the
project-wide testing-framework decision to Milestone 6 scope
specifically).
