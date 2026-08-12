# Tech Stack

**Project**: Vectrix
**Status**: Locked for Milestones 1-3
**Last amended**: 2026-08-10

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

## Parameter Exploration behavior (Milestone 3)

| Concern | Choice | Rationale |
|---|---|---|
| Sweep chart | Hand-built SVG (decorative, `aria-hidden`) + overlaid native `<button>` per data point, no charting library | Extends the same "hand-built SVG, no dependency" pattern `StarChart`/`FlowDiagram` already established, rather than introducing a general-purpose charting library for one 9-point line chart -- doesn't cross the "genuinely general-purpose charting" bar tech-stack.md already names as the revisit trigger. Native `<button>` elements (not SVG shapes with manual `tabIndex`) carry each point's keyboard focus/activation semantics, decided during `003-parameter-exploration`'s `/speckit.plan` (2026-08-10) specifically because Milestone 1's SVG chart interactions had real, previously-invisible accessibility defects (roadmap.md, 2026-08-05) -- see `003-parameter-exploration/research.md`. |
| Permalink transport | Plain `URLSearchParams` query keys, read via Next.js's `useSearchParams()`, written via `navigator.clipboard.writeText()` -- no base64/compression encoding, no new dependency | A human-inspectable query string lets SC-002 ("zero API keys or credentials") be verified by a learner directly, not only by the automated check -- an opaque encoded blob would cut against that same transparency goal. See `003-parameter-exploration/research.md`'s "permalink transport" decision. |
| Permalink read location | `useSearchParams()` inside `PipelineWalkthrough.tsx`, requiring a `<Suspense>` boundary wrapping `<Component />` in `src/app/concepts/[conceptId]/page.tsx` | Discovered by reading `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` per AGENTS.md's "read the docs before writing code" instruction: a statically-generated page (`generateStaticParams`) calling `useSearchParams()` without a `Suspense` ancestor fails the production build outright. The wrapper is generic (no `concept.id`-keyed branch), so it doesn't touch Principle I. |

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
| Permalink-safety check (SC-002, 003-spec) | `scripts/checks/permalink-safety.ts`, same pure-function/no-browser style as `key-isolation.ts`'s static half | New for Milestone 3 -- fixture-based: calls the real `buildPermalinkParams()` with a fake API key and custom document text present elsewhere in its input, fails if either appears in the output. See `003-parameter-exploration/contracts/permalink-contract.md`. |
| Failure-preset verification check (SC-004, 003-spec) | `scripts/checks/failure-presets.ts`, same pure-function/no-browser style as `determinism.ts` | New for Milestone 3 -- runs each shipped preset's exact configuration through the *live* chunk/embed/rank functions rather than storing expected numbers, so a chunking-algorithm change that silently stops reproducing a preset's labeled failure is caught immediately. See `003-parameter-exploration/contracts/failure-preset-contract.md`. |
| Sweep/permalink behavioral + accessibility checks (SC-001, SC-003, SC-005, 003-spec) | Two new Playwright specs under `tests/parameter-exploration/` (mocked provider, no real key in CI) plus a third `tests/a11y/` spec file, bundled under a new `npm run check:parameter-exploration` script added to `check:all` | Same "small purpose-built check, not a framework" philosophy as Milestones 1-2's additions. |
| Cost-ledger-sum check (SC-002, 004-spec) | `scripts/checks/cost-ledger-sum.ts`, same pure-function/no-browser style as `determinism.ts`/`failure-presets.ts` | New for Milestone 4 -- runs a fake resolving provider through `createLedgerTrackingProvider()` for each configuration's real call sequence and asserts the resulting ledger total exactly matches `costEstimateUsd()`'s own pre-call estimate, so the displayed cumulative total can never silently drift from what was actually shown to the learner beforehand. See `004-real-mode-depth/contracts/cost-ledger-contract.md`. |
| Comparison/cost-ledger behavioral + accessibility checks (SC-001, SC-003, SC-004, 004-spec) | Three new Playwright specs under `tests/real-mode-depth/` (mocked provider, no real key in CI) plus two new `tests/a11y/` spec files, bundled under a new `npm run check:real-mode-depth` script added to `check:all` | Same "small purpose-built check, not a framework" philosophy as Milestones 1-3's additions. |
| Agent determinism / tool-toggle-effect checks (SC-002, SC-003, 005-spec) | Two new pure-function scripts, `scripts/checks/agent-determinism.ts` and `scripts/checks/agent-tool-toggle-effect.ts`, same no-browser style as `determinism.ts`/`failure-presets.ts`, plus a new `tests/agents-tool-use/` Playwright directory (SC-001, SC-007), bundled under a new `npm run check:agents-tool-use` script added to `check:all` | New, module-scoped rather than extending RAG's `determinism.ts` -- that script is explicitly RAG-scoped (imports from `src/concepts/rag/...`), and coupling an unrelated module's check to it would blur what each verifies, the opposite of Constitution Principle I. Same "small purpose-built check, not a framework" philosophy as every prior milestone's additions. See `005-agents-tool-use/research.md`'s "New, module-scoped determinism and tool-toggle-effect checks" decision. |
| Agent disclosure check extension (SC-004, 005-spec) | `scripts/checks/simulated-disclosure.ts`, extended with `checkSurface` calls for `AgentWalkthrough` and each of `StrategyComparison`'s three strategy panels | Same script-grows-in-place precedent as every prior milestone's disclosure extension (FR-004's Real Mode rule, 004's comparison-caveat rule) -- one marker per rendered surface, not per individual step, mirroring the granularity `EmbeddingStep`/`GenerationStep` already established. |
| Agent accessibility check (SC-005, 005-spec) | `tests/a11y/agents-tool-use.spec.ts`, same `npm run check:a11y` command (file-glob, no script change needed) | Extends, doesn't replace, the existing `check:a11y` suite -- covers this module's sample-question chips, custom-question input, tool toggles, and view-tab switcher. |

## Real Mode Depth behavior (Milestone 4)

| Concern | Choice | Rationale |
|---|---|---|
| Cost/call tracking | A `RealModeProvider` decorator, `createLedgerTrackingProvider()` (`src/concepts/rag/costLedger/trackedProvider.ts`), wrapping `embedBatch`/`generate` with the same signatures and appending one ledger entry per call that resolves successfully -- not a fetch-interception layer, and not a manual `onCallRecorded()` call inserted at each of the five existing real-call sites' internal control flow | Decided during `004-real-mode-depth`'s `/speckit.plan` (2026-08-10): every existing call site already constructs its own `RealModeProvider` at the point of use, so wrapping that one construction call is a one-line change per site rather than touching each site's internal orchestration logic -- the same "one function, one seam" swap-out pattern this file already uses for `mockGenerate()`'s isolation and the `RealModeProvider` interface itself. See `004-real-mode-depth/research.md`'s "Cost ledger as a `RealModeProvider` decorator" decision. |
| Cost estimation | A flat, static per-call `PricingTable` (`embedCallUsd`/`generateCallUsd`, `src/concepts/rag/costLedger/pricing.ts`) derived once from published per-token rates and a documented assumed typical call size -- not live per-token metering of actual response `usage` fields | `openaiCompatibleProvider.ts`'s `fetch`-based adapter doesn't parse or expose token usage today, and `004-real-mode-depth/spec.md`'s Assumptions explicitly rule out a live pricing lookup or added complexity. Mirrors the existing app's own precedent: `realMode/callEstimate.ts`'s call-count formulas are already flat-per-call, not token-counted, for the same reason. See `004-real-mode-depth/research.md`'s "Flat per-call pricing, not per-token metering" decision. |
| Comparison view's Simulated-side approximation | The Compare Simulated vs Real view's Simulated half always computes and shows naive RAG's simulated ranking, never a fabricated "simulated HyDE/RAG-Fusion" -- disclosed explicitly via a `data-simulated-disclosure`-style marker whenever a non-naive configuration is selected | `mockEmbedding.ts` has no text-generation capability (HyDE's hypothesis / RAG-Fusion's reworded queries are both generated by a real model call in this codebase), so there is no existing notion of a "simulated HyDE" to draw on -- synthesizing one would be a convincing-looking fake, the exact Constitution Principle II failure mode. See `004-real-mode-depth/research.md`'s "Simulated half for HyDE/RAG-Fusion configurations" decision. |

## Agents & Tool Use behavior (Milestone 5)

| Concern | Choice | Rationale |
|---|---|---|
| Tool selection / "reasoning" simulation | Rule-based, binary-confidence matchers -- each shipped `Tool` owns a pure `match(question): ToolMatch \| null` function (regex/keyword test against its own non-overlapping domain), no continuous similarity score | Tool selection is a categorical classification into non-overlapping domains (calculator vs. unit-converter vs. knowledge-lookup), not a nearest-neighbor problem the way RAG's retrieval is -- reusing `mockEmbedding.ts`'s cosine-similarity approach here would produce a plausible-looking but ungrounded confidence number for a problem that isn't actually a similarity search. A binary rule-based matcher is also directly disclosable in plain language, satisfying FR-002/FR-009's simulation-disclosure requirement more legibly than a numeric score would. See `005-agents-tool-use/research.md`'s "Rule-based, binary-confidence tool matching" decision. |
| Tie-breaking (two tools both fit) | Fixed toolbox declaration order -- first enabled, matching tool in `DEFAULT_TOOLBOX`'s array order wins, deterministically, every time | Directly satisfies spec.md's Edge Case ("two tools both a reasonable fit... the deterministic selection rule still picks exactly one, consistently") and Constitution Principle V, without needing a second scoring dimension on top of the binary matcher above. |
| Toolbox | Three genuinely-computing, non-overlapping tools -- Calculator (real arithmetic via a small hand-rolled operand/operator extraction, no `eval`), Unit Converter (real conversion math over a small fixed unit table), Knowledge Lookup (a small, fixed, shipped fact set) | Implements spec.md's Assumptions directly: tools that can be computed honestly return genuinely correct results, and a knowledge tool draws from a curated fact set, the same "curated, not live" precedent RAG's sample documents already established. No new npm dependency (no math-expression-parser library) -- the supported expression shape is deliberately narrow (one operator, two operands) rather than a general arithmetic parser. |
| Multi-step reasoning loop / iteration cap | A fixed `MAX_ITERATIONS = 3` -- on a tool match, one extra "verify" reasoning step before finalizing (real, inspectable overhead vs. the single-tool-call strategy); on no match, up to `MAX_ITERATIONS` re-reasoning attempts before a distinct `"gave-up"` outcome, never a fabricated answer | Makes User Story 3's "added cost is legible, not hidden" acceptance scenario concretely true (same answer, genuinely more steps) and makes FR-006's iteration-cap edge case reachable by a real shipped sample question, not only a synthetic test fixture. See `005-agents-tool-use/research.md`'s "multi-step loop" decision for the full reachability argument. |

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

**Version**: 1.6.0 -- 2026-08-11, added Agents & Tool Use's AI-behavior
and testing decisions during `005-agents-tool-use`'s `/speckit.plan` --
rule-based binary-confidence tool matchers (not a continuous similarity
score) with fixed-declaration-order tie-breaking, a three-tool toolbox
that computes genuinely correct results (no fabricated observations), a
fixed `MAX_ITERATIONS = 3` multi-step-loop design whose added cost and
iteration-cap "gave up" outcome are both real and reachable rather than
synthetic, and two new module-scoped pure-function checks
(`agent-determinism.ts`, `agent-tool-toggle-effect.ts`) plus a new
`tests/agents-tool-use/` Playwright directory. No new npm dependency
introduced. This is also the first amendment made on behalf of a second
concept module rather than extending the RAG module.

Supersedes 1.5.0 (2026-08-10, added Real Mode Depth's AI/data-behavior
and testing decisions during `004-real-mode-depth`'s `/speckit.plan` --
a `RealModeProvider` decorator (`createLedgerTrackingProvider`) for
cost/call tracking instead of a fetch-interception layer, a flat
static per-call `PricingTable` instead of per-token metering, the
comparison view's Simulated-side decision to always show naive RAG's
ranking rather than fabricate a "simulated HyDE/RAG-Fusion," and one new
pure-function check (`cost-ledger-sum.ts`) plus a new `tests/real-mode-
depth/` Playwright directory. No new npm dependency introduced), 1.4.0
(2026-08-10, added Parameter Exploration's
AI/data-behavior and testing decisions during `003-parameter-exploration`'s
`/speckit.plan` -- hand-built SVG+native-`<button>` sweep chart (no
charting library), `URLSearchParams`-based permalinks (no encoding
dependency), the `useSearchParams()`/`<Suspense>` constraint discovered
by reading Next.js's own docs, and two new pure-function checks
(permalink-safety, failure-preset verification). No new npm dependency
introduced), 1.3.0 (2026-08-05, revised Real Mode's provider decision
to be config-driven rather than hardcoded (`ProviderConfig` +
`RealModeProvider`, OpenAI as the one default/shipped adapter) and
added a documented-not-built Anthropic generation-only alternate, after
the initial 1.2.0 draft locked "OpenAI" into the interface/types/UI-copy
language directly), 1.2.0 (2026-08-05, added Real Mode's AI-behavior and testing
decisions -- provider = OpenAI (hardcoded), hand-rolled PCA projection,
in-memory-only key storage, `RealModeProvider` abstraction, and five
new/extended automated checks -- during `002-real-mode`'s `/speckit.plan`;
no new npm dependency introduced) and 1.1.0 (2026-08-03, Milestone 1's
four automated checks (SC-002/003/005/006) decided during
`001-core-platform-rag-module`'s `/speckit.plan`; narrowed the
project-wide testing-framework decision to Milestone 6 scope
specifically).
