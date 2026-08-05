# Contract: Real Mode automated checks (SC-004, SC-006, SC-007, SC-008, SC-009; regression: SC-001, SC-002 in 002-spec)

**Status**: New and extended checks, this plan. Extends spec.md 001's
existing four-check contract (`specs/001-core-platform-rag-module/contracts/automated-checks-contract.md`)
rather than replacing it -- `check:extensibility` and `check:determinism`
are unchanged (research.md's scope note); `check:disclosure` gains a
rule; `check:a11y` gains a spec file; two checks are wholly new.

## `check:extensibility` -- unchanged

No new rule. Regression-only: this feature's files all live inside
`src/concepts/rag/`, so 001's existing scan has nothing new to catch.
Supports SC-001 (002-spec).

## `check:disclosure` -- `scripts/checks/simulated-disclosure.ts`, extended

- **New input**: `EmbeddingStep`, `GenerationStep`, and `RealModeToggle`,
  additionally rendered (via `react-dom/server`'s `renderToStaticMarkup`)
  with a fixture `realMode: { active: true, provider: { id: "openai", label: "OpenAI", ... }, ... }` prop.
- **New rule**: fail if the real-mode-rendered output is missing either
  (a) an element with `data-real-disclosure="true"` and non-empty text
  content naming the provider (FR-004, FR-006), or (b) `RealModeToggle`'s
  key-entry prompt is missing an element with `data-key-disclaimer="true"`
  whose text content includes both the where-it's-sent statement and the
  "at your own risk" language (FR-003; data-model.md's disclaimer copy).
- **Exit code**: `0` = every simulated-mode surface AND every real-mode
  surface AND the key-entry disclaimer discloses. `1` = any is missing or
  empty.
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
  input) fails any of 001's existing FR-011 rules (a)-(e) -- Tab
  reachability, visible focus indicator, Enter/Space/Arrow activation,
  non-generic accessible name, disabled-control Tab removal.
- **Exit code**: `0` = 100% of Real Mode's new controls pass (SC-009,
  FR-015). `1` = any control fails, printed with selector + failing rule.
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

Three spec files, one per SC, run together via `npm run
check:real-mode` (`playwright test tests/real-mode/`):

- **`failure-fallback.spec.ts`**: for each of embeddings-call,
  generation-call, and a HyDE/RAG-Fusion intermediate call, mock a
  401/429/network-error response and assert (a) the specific
  `RealModeError.kind`-matching message appears, and (b) the fallback-
  to-Simulated-Mode control is present and works. **Exit**: `0` = all
  failure paths produce a specific error + working fallback (SC-004
  fully satisfied, no path silently substitutes simulated output while
  implying it's real). `1` = any path missing either half.
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

**Supports**: SC-004, SC-007, SC-008.

## Manual verification (not automated, not CI)

One real end-to-end run against the actual OpenAI API with a real key
(implementer-supplied, never committed) confirming: Real Mode activates,
a real embedding chart renders and is disclosed as real (User Story 2),
a real generated answer appears (User Story 4), and HyDE/RAG-Fusion
execute for real with visible intermediate steps (User Story 5) --
mirroring spec.md 001's T036/T044 manual-walkthrough precedent. Recorded
as a `tasks.md` task, not a `check:*` script, since committing a real key
to CI is explicitly out of scope (research.md).
