# Contract: Real Mode automated checks (SC-004, SC-005, SC-006, SC-007, SC-008, SC-009; regression: SC-001, SC-002 in 002-spec)

**Status**: New and extended checks, this plan; re-synced 2026-08-06
against the `checklists/requirements.md` follow-up (`check:a11y`'s
dynamic-content rule, `failure-fallback.spec.ts`'s retry-resume
assertion), then again the same day against a `/speckit.analyze` pass
that found four further gaps: `check:disclosure` didn't cover
`RetrievalStep` even though FR-004 names it (F1), `check:a11y` didn't
cover User Story 6's evaluation controls (C1), `failure-fallback.spec.ts`
didn't individually exercise each of FR-016's 7 canonical call types
(E1), and SC-005 had no automated check at all (E2) -- all four are
folded in below, and SC-005 is now named in this contract's title.
Extends spec.md 001's existing four-check contract
(`specs/001-core-platform-rag-module/contracts/automated-checks-contract.md`)
rather than replacing it -- `check:extensibility` and `check:determinism`
are unchanged (research.md's scope note); `check:disclosure` gains a
rule; `check:a11y` gains a spec file; two checks are wholly new.

## `check:extensibility` -- unchanged

No new rule. Regression-only: this feature's files all live inside
`src/concepts/rag/`, so 001's existing scan has nothing new to catch.
Supports SC-001 (002-spec).

## `check:disclosure` -- `scripts/checks/simulated-disclosure.ts`, extended

- **New input**: `EmbeddingStep`, `RetrievalStep`, `GenerationStep`, and
  `RealModeToggle`, additionally rendered (via `react-dom/server`'s
  `renderToStaticMarkup`) with a fixture
  `realMode: { active: true, provider: { id: "openai", label: "OpenAI", ... }, ... }` prop.
  `RetrievalStep` is included here (`/speckit.analyze` finding F1,
  2026-08-06) because FR-004 names it explicitly alongside
  `EmbeddingStep` -- Milestone 1's Simulated Mode never required its own
  marker on `RetrievalStep`, but FR-004's Real Mode wording doesn't leave
  that reuse implicit, so this check no longer either.
- **New rule**: fail if the real-mode-rendered output is missing either
  (a) an element with `data-real-disclosure="true"` and non-empty text
  content naming the provider, present on **each** of `EmbeddingStep`,
  `RetrievalStep` (naming the projection method too), and `GenerationStep`
  independently (FR-004, FR-006), or (b) `RealModeToggle`'s key-entry
  prompt is missing an element with `data-key-disclaimer="true"` whose
  text content includes both the where-it's-sent statement and the
  "at your own risk" language (FR-003; data-model.md's disclaimer copy).
- **Exit code**: `0` = every simulated-mode surface AND every real-mode
  surface (including `RetrievalStep`) AND the key-entry disclaimer
  discloses. `1` = any is missing or empty.
- **Supports**: FR-003, FR-004, FR-006, Constitution Principle II (the inverse
  direction: real output must not be presented ambiguously either).

## `check:a11y` -- `tests/a11y/real-mode.spec.ts` (new third spec file)

Same command (`npm run check:a11y` / `playwright test tests/a11y/`),
same `@axe-core/playwright` + real-keyboard-event pattern as 001's two
existing specs, run against a mocked-provider dev server so no real key
is needed.

- **Input**: the running app with Real Mode toggled on via a fake test
  key (provider calls mocked at the HTTP layer).
- **Rule**: fail if any control in FR-015's enumeration (Real Mode
  toggle, API key input, temperature slider, RAG-Fusion N slider, HyDE
  hypothesis-count slider, custom-document textarea, custom-question
  input, and -- `/speckit.analyze` finding C1, 2026-08-06, previously
  missing from both FR-015 and this check -- the evaluation feature's
  `EvalPair` question input, expected-chunk picker, pair-removal
  control, and evaluation Run control) fails any of 001's existing
  FR-011 rules (a)-(e) -- Tab reachability, visible focus indicator,
  Enter/Space/Arrow activation, non-generic accessible name,
  disabled-control Tab removal.
- **New rule** (checklist follow-up 2026-08-06, FR-015's dynamic-content
  extension): submit a key that fails `ProviderConfig.keyFormatPattern`
  and assert the resulting error element is programmatically associated
  with the key input (`aria-describedby` referencing the error's `id`,
  not merely adjacent in the DOM); separately, trigger a mocked call
  failure and assert the resulting `ErrorBanner` carries `role="alert"`
  or `aria-live="assertive"` so it's announced without the learner
  needing to be focused on it.
- **Exit code**: `0` = 100% of Real Mode's new controls pass (SC-009,
  FR-015), AND the key-format error and failure banners pass the new
  dynamic-content rule. `1` = any control or dynamic-content case fails,
  printed with selector + failing rule.
- **Supports**: SC-009, FR-015, Constitution Principle VII.

## `check:key-isolation` -- new, two halves

### Static half -- `scripts/checks/key-isolation.ts`

- **Input**: repo file tree.
- **Rule**: fail if any file exists matching a Next.js server-route
  pattern (`src/app/api/**/route.ts`, `src/app/**/route.ts`, or any
  file exporting a Route Handler) -- the only structural way this
  project could ever receive a key server-side.
- **Exit code**: `0` = no such file exists. `1` = at least one found,
  printed with its path.
- **Supports**: SC-006 (structural half).

### Dynamic half -- `tests/real-mode/key-isolation.spec.ts` (Playwright)

- **Input**: the running app, Real Mode activated with a fake test key,
  provider responses mocked via route interception.
- **Rule**: fail if any captured outgoing request (via `page.on
  ('request')`) both (a) does NOT target the mocked provider origin, AND
  (b) contains the test key string in any header, body, or query
  string.
- **Exit code**: `0` = every request containing the key targets only the
  provider origin; no other request anywhere contains it. `1` = a
  key-containing request to a non-provider origin was captured, printed
  with its URL.
- **Supports**: SC-006 (behavioral half, the primary proof).

## `check:real-mode-behavior` -- `tests/real-mode/*.spec.ts` (Playwright, mocked provider)

Four spec files, run together via `npm run check:real-mode`
(`playwright test tests/real-mode/`):

- **`failure-fallback.spec.ts`**: mocks a 401/429/network-error response
  individually for **each of FR-016's 7 canonical call types**
  (corpus-embed, query-embed, hypothesis-embed, variant-embed,
  hypothesis-generate, variant-query-generate, final-generate --
  `/speckit.analyze` finding E1, 2026-08-06: previously this spec only
  named 3 broad buckets, which didn't verifiably close SC-004's "100%"
  bar) and asserts, per call type, (a) the specific
  `RealModeError.kind`-matching message appears, and (b) the fallback-
  to-Simulated-Mode control is present and works. Additionally
  (checklist follow-up 2026-08-06, FR-007's retry-resume semantics): for
  a HyDE/RAG-Fusion sequence that fails on, say, its third call, mock a
  passing response for Retry and assert (c) exactly one new request is
  captured (the failed call re-issued) and (d) the trace's
  already-succeeded first two calls' results are unchanged in the UI,
  not re-fetched. Additionally (`/speckit.analyze` finding N5, 2026-08-06
  -- FR-011's partial-failure handling, added by finding C3, previously
  had no automated regression coverage): with at least 3 `EvalPair`s and
  a mocked failure on the second pair's retrieval, assert (e) the eval
  run stops there, (f) the first pair's `RecallResult` stays visible,
  and (g) Retry issues exactly one new request. **Exit**: `0` = all 7
  call types individually produce a specific error + working fallback
  (SC-004 fully satisfied against FR-016's actual enumerated list, no
  path silently substitutes simulated output while implying it's real),
  variant-sequence retry resumes rather than restarts, AND eval-run
  retry resumes only the failed pair. `1` = any call type or any retry
  assertion fails.
- **`temperature-effect.spec.ts`**: mock two high-temperature completions
  for the same prompt that differ, and two low-temperature completions
  for the same prompt that are identical; assert the UI reflects both.
  **Exit**: `0` = both temperature regimes behave as SC-007 describes.
  `1` = either doesn't.
- **`fusion-n-effect.spec.ts`**: mock RAG-Fusion runs at two different N
  values with different fused rankings; assert (a) the ranking visibly
  differs and (b) the number of captured requests matches the `N + 3`
  formula (data-model.md/research.md) for each N. **Exit**: `0` = both
  hold (SC-008 fully satisfied). `1` = either doesn't.
- **`intermediate-steps-visible.spec.ts`** (new, `/speckit.analyze`
  finding E2, 2026-08-06 -- SC-005 previously had no automated check at
  all, only a manual quickstart.md scenario): for one mocked HyDE run
  (M >= 2) and one mocked RAG-Fusion run (N >= 2), assert every
  intermediate DOM element named in `VariantExecutionTrace` (each
  hypothesis text + embedding indicator; each query variant + its own
  per-variant ranking) is present and visible **before** the final
  fused/averaged result renders, matching FR-016's canonical call-type
  list exactly. **Exit**: `0` = 100% of both variants' intermediate
  execution steps are visible during the run (SC-005 fully satisfied).
  `1` = any intermediate step is missing or only the final result is
  present.

**Supports**: SC-004, SC-005, SC-007, SC-008.

## Manual verification (not automated, not CI)

One real end-to-end run against the actual OpenAI API with a real key
(implementer-supplied, never committed) confirming: Real Mode activates,
a real embedding chart renders and is disclosed as real (User Story 2),
a real generated answer appears (User Story 4), and HyDE/RAG-Fusion
execute for real with visible intermediate steps (User Story 5) --
mirroring spec.md 001's T036/T044 manual-walkthrough precedent. Recorded
as a `tasks.md` task, not a `check:*` script, since committing a real key
to CI is explicitly out of scope (research.md).
