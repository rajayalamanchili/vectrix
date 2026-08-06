# Phase 0 Research: Real Mode for the RAG Concept Module

**Feature**: `002-real-mode` | **Date**: 2026-08-05, re-synced 2026-08-06

spec.md 002's Assumptions deliberately deferred the embeddings/generation
provider choice to this plan. This document resolves that, plus the
other genuinely undecided technical questions the spec surfaces:
projection method, key storage, provider abstraction shape, call-count
estimation, multi-hypothesis/multi-variant retrieval mechanics, and the
testing approach for the four new/extended Success Criteria (SC-004,
SC-006, SC-007, SC-008, SC-009). A `checklists/requirements.md`
follow-up (2026-08-06, 27/27 items closed) added two further technical
decisions this document now also records -- retry semantics for a
partial multi-call failure (FR-007) and the UI treatment for
non-executable variants (FR-009) -- and extended the call-count and
testing-approach decisions below to cover FR-011's evaluation-run
disclosure and FR-007's retry-resume behavior respectively.

## Decision: Provider abstraction is provider-agnostic; OpenAI is the one default config, not a hardcoded choice

**Decision** (revised 2026-08-05, after the initial draft of this
research locked "OpenAI" into the interface/types/UI-copy language
directly -- corrected on request): the provider is a data value, not a
hardcoded literal. A `ProviderConfig` record (base URL, key header name,
key-format validation pattern, embeddings model name, chat model name,
display label) parameterizes one concrete adapter,
`openaiCompatibleProvider.ts`, which speaks the OpenAI-compatible REST
shape (`POST {baseUrl}/embeddings`, `POST {baseUrl}/chat/completions`)
via native `fetch`. `RealModeSession.provider` holds a `ProviderConfig`
value, not a fixed string-literal union -- nothing in the
`RealModeProvider` interface, `RealModeSession`'s type, or FR-004/FR-006's
UI copy names a specific vendor. The one `ProviderConfig` shipped and
end-to-end tested this milestone targets OpenAI itself
(`text-embedding-3-small` / `gpt-4o-mini`), per the design-only decision
below -- swapping to a different OpenAI-compatible endpoint (Azure
OpenAI, Groq, Together AI, a local OpenAI-compatible shim) is a config
change, not a code change.

**Rationale**: spec.md's own acceptance-scenario copy is already
provider-agnostic (`"Real embeddings via [provider]"`, `"Real answer via
[provider]"` -- a bracketed placeholder, not a named vendor), and its Key
Entities describe "the configured provider" generically. Hardcoding
"OpenAI" into the interface and types, as this research's first draft
did, was narrower than the spec itself required and made a later
provider swap a code change instead of a config change -- corrected here
so the abstraction matches what spec.md actually committed to. Shipping
exactly one *concrete, tested* adapter (rather than a multi-provider
picker) is a separate, still-valid decision: no acceptance scenario in
spec.md asks a learner to choose between providers, so building a picker
UI, per-provider key-format rules, and per-provider disclosure copy this
milestone would be scope the spec doesn't call for.

**Documented alternate config (design proof, not built): Anthropic,
generation-only.** Anthropic's Messages API is not OpenAI-compatible in
shape (different endpoint, different request/response envelope) and has
no first-party embeddings endpoint at all (Anthropic's own docs point
users to Voyage AI for that) -- so it cannot be expressed as a
`ProviderConfig` value for the existing `openaiCompatibleProvider.ts`
adapter; it would need its own adapter module implementing only the
`generate()` half of `RealModeProvider`, with `embedBatch()` unimplemented
(or the interface split into separate embeddings/generation roles, which
this milestone doesn't do). This is recorded here to demonstrate the
abstraction survives a structurally different provider on paper, not as
a Milestone 2 deliverable -- Anthropic is not wired into the UI, not
selectable, and not covered by any automated check this milestone.
OpenAI's `ProviderConfig` remains the sole shipped, default, and only
end-to-end-tested provider; see the "Explicitly not yet decided"
addition in tech-stack.md.

**Alternatives considered**:
- *Split `RealModeProvider` into independent `EmbeddingsProvider`/
  `GenerationProvider` interfaces now*, so Anthropic (generation) could
  pair with Voyage AI (embeddings) as two independently-configured
  defaults: rejected for this milestone -- doubles the key-entry/
  validation/disclosure surface (two keys, two providers named in the
  UI) for a capability no acceptance scenario in spec.md asks for. Left
  as a natural extension point (noted above) rather than built.
- *A provider picker (OpenAI + Anthropic + others) in the UI now*:
  rejected as scope creep for the same reason -- multiplies FR-003 key
  validation, FR-004 disclosure copy, and testing surface per provider
  with no spec.md acceptance scenario requiring provider choice.
- *A backend proxy*: explicitly out of scope per spec.md 002 Assumptions
  and tech-stack.md's locked backend-free stance -- true regardless of
  which provider(s) are configured.

**tech-stack.md amendment**: the "Real Mode AI behavior" table now
describes the `ProviderConfig`-driven abstraction and names OpenAI as
the default *shipped adapter*, not as a fixed architectural choice; see
repo diff.

## Decision: 2D projection method (FR-004)

**Decision**: A hand-rolled 2-component PCA (power iteration on the
covariance matrix of the batch of returned embedding vectors for the
current run), computed client-side, no new dependency.

**Rationale**: Mirrors `mockEmbedding.ts`'s existing style -- small,
dependency-free, hand-rolled math -- rather than introducing a
charting/ML library, which per AGENTS.md requires amending tech-stack.md
with justification tech-stack.md doesn't currently have grounds for
(the visualization surface is still small; see tech-stack.md's existing
"revisit if a future module needs genuinely general-purpose charting"
note, which this doesn't trigger). PCA's "directions of greatest
variance" framing is also easier to explain in one Marginalia sentence
than UMAP's neighbor-graph mechanics, consistent with Constitution
Principle IV. Determinism: power iteration uses a fixed starting vector
(the first standard basis vector) and a fixed iteration count (100), not
a random init, so the projection is a pure function of its input
vectors -- identical embedding vectors always produce an identical 2D
layout, even though the vectors themselves come from a live,
not-guaranteed-identical API response run to run (see the Principle V
scope note below).

**Alternatives considered**:
- *UMAP (`umap-js`)*: rejected -- new runtime dependency, stochastic
  layout unless carefully seeded, and harder to explain to a learner
  than PCA for a small (single-digit to low-double-digit) point count.
- *t-SNE*: same objections as UMAP, plus notoriously sensitive to
  hyperparameters for small point counts.

## Decision: API key storage (SC-006)

**Decision**: In-memory-only React state (`useState` in `RagConcept.tsx`,
the shared parent of both views), not `sessionStorage` or
`localStorage`.

**Rationale**: spec.md 002's Key Entities describe `RealModeSession` as
"session-only, non-persisted, scoped to the current browser session
only," and its Edge Cases ask what happens when a learner "closes the
tab" (the key must not survive that). Plain React state trivially
satisfies both: it's gone on tab close AND on a hard refresh, which is
the simplest, most conservative reading of "not stored" -- no browser
storage API to reason about, audit, or clear. User Story 1's Acceptance
Scenario 3 ("the key is retained for the session, not re-requested")
is satisfied because the SPA instance itself doesn't reload when
toggling Real Mode on/off within one visit.

**Alternatives considered**: `sessionStorage` -- rejected as
unnecessary risk surface (survives a refresh within the tab, which is
technically still "session-scoped" but adds a browser-storage location
that SC-006's verification would then need to inspect, for zero
required behavior spec.md actually asks for).

## Decision: Provider abstraction shape

**Decision**: Two parts -- a behavioral interface every caller depends
on, and a data shape describing which concrete provider fills it in:

```ts
// src/concepts/rag/realMode/types.ts
interface ProviderConfig {
  id: string;              // free-form, e.g. "openai" -- not a fixed union
  label: string;            // display name for disclosure UI, e.g. "OpenAI"
  baseUrl: string;           // e.g. "https://api.openai.com/v1"
  embeddingsModel: string;   // e.g. "text-embedding-3-small"
  chatModel: string;         // e.g. "gpt-4o-mini"
  keyFormatPattern: RegExp;  // FR-003 pre-validation, e.g. /^sk-/
}

interface RealModeProvider {
  embedBatch(texts: string[]): Promise<number[][]>;
  generate(prompt: string, opts: { temperature: number }): Promise<string>;
}
```

`src/concepts/rag/realMode/openaiCompatibleProvider.ts` implements
`RealModeProvider`, taking a `ProviderConfig` as a constructor argument
and calling `{config.baseUrl}/embeddings` /
`{config.baseUrl}/chat/completions` -- no vendor name appears in the
interface or the adapter's own logic, only in the `ProviderConfig` value
passed in. Every pipeline step and the variants view call only the
`RealModeProvider` interface, never `ProviderConfig` fields or provider
specifics directly.

**Rationale**: Mirrors the "one function, one seam" swap-out pattern
already documented in `mockEmbedding.ts` and `GenerationStep.tsx`'s code
comments (`embed()`/`cosineSimilarity()`, `mockGenerate()`) -- Real Mode
adds a second, real implementation behind the same shape of seam rather
than a new architectural pattern. Splitting behavior (`RealModeProvider`)
from configuration (`ProviderConfig`) is what makes the design-only
provider-agnosticism decision above actually true in code, not just in
prose -- a new OpenAI-compatible endpoint is a new `ProviderConfig`
value, zero new logic. Keeping the interface to exactly two methods
(embed, generate) is sufficient for every acceptance scenario in
spec.md; a richer interface (streaming, function-calling, etc.) isn't
needed by anything spec.md describes.

**Alternatives considered**: A class-based provider registry anticipating
several concurrently-selectable providers -- rejected per the
design-only/single-shipped-adapter decision above; would be speculative
generality with no current caller. Hardcoding `provider: "openai"` as a
fixed string-literal type on `RealModeSession` (this research's original
draft) -- rejected on revision, since it defeats the config-swap
extensibility this decision exists to provide.

## Decision: Call-count estimation (FR-010, FR-013)

**Decision**: Two formulas, both scoped to a single variant run against
an already-embedded corpus (corpus embedding is cached per
document/chunk-settings via `useMemo`, so it's not re-counted per run):

- **HyDE** (M hypothetical answers): `M + 3` calls -- generate M
  hypotheses (M separate calls, so each is individually visible and
  independently retryable per FR-014), embed the corpus (1 call, cached
  across runs against the same document/chunk-settings), embed all M
  hypotheses in one batched call, generate the final answer (1 call).
- **RAG-Fusion** (N query variants): `N + 3` calls -- generate all N
  reworded queries in one completion call (they're one coherent
  generative task), embed the corpus (1 call, cached), embed each of the
  N variants in its own separate call (not batched -- see the retrieval
  mechanics decision below), generate the final answer (1 call).

Naive RAG has no FR-010 estimate requirement (FR-010 only applies to
"a variant requiring more than one embedding/generation call").

**Rationale**: Both land on a `+3` baseline with the learner-adjustable
count (M or N) as the sole variable term, which is what FR-013 requires
("the estimated-call-count disclosure... updating live as N changes")
and what SC-008 verifies ("the estimated-call-count shown... matches the
actual number of calls made"). The asymmetry (HyDE batches its
per-hypothesis embedding call, RAG-Fusion doesn't batch its per-variant
one) is deliberate, not an inconsistency -- see the next decision.

**Alternatives considered**: A single generic "N calls" formula ignoring
the fixed corpus-embed/final-generate calls -- rejected because it would
under-count and make SC-008's "matches the actual number of calls made"
check fail against the real implementation.

**Extension (FR-011, checklist follow-up 2026-08-06): evaluation-run
call-count estimate.** An evaluation run repeats one configuration's
retrieval per `EvalPair`, across every configuration tested, so its
total is `evalPairs.length * configurationsTested.length *
callsPerConfiguration(configurationId)` -- reusing exactly the `3` /
`M + 3` / `N + 3` per-configuration figures above rather than a new
formula. This mirrors FR-010's disclosure requirement (shown before any
evaluation call is made) instead of leaving evaluation as a scope
exception, since FR-011 can trigger just as many real calls as a single
HyDE/RAG-Fusion run -- more, in fact, once multiple pairs and
configurations multiply it out. Rejected alternative: scoping FR-010's
disclosure to variant execution only and leaving evaluation
undisclosed -- rejected because a learner running 10 pairs against a
`hydeCount=3` HyDE configuration triggers 60 calls with no warning
shown, which is exactly the surprise-cost problem FR-010 exists to
prevent for variants.

## Decision: HyDE multi-hypothesis vs. RAG-Fusion multi-variant retrieval mechanics

**Decision**: These stay mechanically distinct, matching how the two
techniques actually differ:

- **HyDE**: generate M hypothetical answers -> embed each -> average the
  M vectors into one mean vector -> retrieve **once** against that
  averaged vector -> generate the final answer. This is the standard
  multi-sample HyDE approach (combine evidence *before* retrieval).
- **RAG-Fusion**: generate N reworded queries -> retrieve **once per
  variant**, independently, against each variant's own embedding ->
  fuse the N ranked lists (Reciprocal Rank Fusion, already named in
  `variantData.ts`'s existing `howItWorks` copy) into one final ranking
  -> generate the final answer. This combines evidence *after*
  retrieval.

**Rationale**: spec.md's Acceptance Scenarios already imply this shape
without spelling out the vector math -- User Story 5 Scenario 6 says
HyDE's hypotheses are shown "before retrieval runs" (singular retrieval,
after all hypotheses are visible), while Scenario 2 says RAG-Fusion
shows "each generated query variant and its own retrieved ranking...
before the fused final ranking" (plural, independent retrievals, one per
variant). This also directly justifies the call-count asymmetry above:
HyDE's hypothesis embeddings are about to be averaged together anyway,
so batching that embed call changes nothing observable and saves an
implementation detail; RAG-Fusion's variants must stay independently
retrieved for fusion to be meaningful, so their embed calls can't be
collapsed into one without losing the "per-variant ranking" FR-008
explicitly requires to be inspectable.

**Alternatives considered**: Retrieving once per HyDE hypothesis too
(mirroring RAG-Fusion) -- rejected as not what the literature calls
"HyDE," and spec.md's Scenario 6 wording ("before retrieval runs,"
singular) doesn't support it either.

## Decision: Retry resumes a failed multi-call sequence, it doesn't restart it (FR-007)

**Decision**: On a mid-sequence HyDE/RAG-Fusion failure, `ErrorBanner.tsx`'s
Retry action re-issues only the one call named by `RealModeError.stage`,
reading whichever hypotheses/query-variants `VariantExecutionTrace`
already holds for calls before that stage and appending the retried
call's result to that same trace, rather than clearing the trace and
re-running the sequence from its first call.

**Rationale**: FR-008 already requires serial execution specifically so
"a mid-sequence failure always occurs before any later call has been
issued" -- which means the caller can state, unambiguously, exactly
which calls already succeeded at the moment of failure. Discarding those
results on retry would silently re-spend the learner's own API budget on
calls that already returned a perfectly good result, for no teaching
benefit; resuming is strictly cheaper and no harder to implement, since
the serial-execution requirement already tracks per-call state
incrementally (`VariantExecutionTrace`'s array fields, populated one
element per completed call).

**Alternatives considered**: Restarting the full sequence on every
retry -- simpler to reason about in isolation, but rejected because it
contradicts the reason FR-008 mandates serial (not parallel) execution
in the first place, and because it directly costs the learner real money
for calls that already succeeded, which nothing in spec.md asks for.

## Decision: Non-executable variants get a disabled Run affordance, not a hidden one (FR-009)

**Decision**: `EXECUTABLE_VARIANT_IDS = ["naive", "hyde", "fusion"]`, a
constant local to `VariantsComparison.tsx` (not a `variantData.ts`
field -- see data-model.md's "Executable variant set" section).  When
Real Mode is active, GraphRAG/Self-RAG/Agentic RAG's Run control renders
`disabled` with adjacent text ("Explanatory only this milestone") rather
than being removed from the DOM or left looking identical to Simulated
Mode's version.

**Rationale**: FR-009 already requires the UI to "clearly state...
whether each is executable" -- a disabled-with-explanation control
states this at the exact point a learner would try to act on it (the
Run button itself), which is a stronger, more discoverable signal than
static explanatory text elsewhere on the page that a learner reaching
for "Run" might not have read. Keeping the control present (not
removed) also means `check:a11y`'s existing disabled-control Tab-removal
rule (001's FR-011 rule (e), reused by FR-015) continues to apply to it
without a special case.

**Alternatives considered**: Removing the Run control entirely for these
three variants in Real Mode -- rejected because a missing control is
ambiguous (is it broken? not loaded yet?) in a way a disabled control
with inline text isn't. Leaving the control fully enabled and failing at
click-time with an error -- rejected because it invites exactly the
"expecting real execution if it isn't implemented yet" outcome FR-009
explicitly prohibits.

## Decision: Compare Variants gets independent document/query state for Real Mode (US5, US6)

**Decision**: `VariantsComparison.tsx` gains its own `docId`/custom-text
and `query` state for Real Mode execution, not shared React state with
`PipelineWalkthrough.tsx`.

**Rationale**: The two views have never shared document/query state --
Compare Variants is currently a purely static, document-agnostic
explanatory view. Coupling them now would mean switching tabs silently
changes the other tab's active document, which nothing in spec.md asks
for and would surprise a learner mid-walkthrough. Both views reuse the
same `CustomDocumentInput` component (FR-005) and sample-doc list for
consistency, but as independent instances/state.

**Alternatives considered**: Sharing one global `docId`/`query` in
`RagConcept.tsx` -- rejected for the coupling reason above; would also
complicate the reset-on-switch behavior already carefully specified for
Pipeline Walkthrough (spec.md 001 Edge Cases) by extending it to a
second, unrelated view.

## Decision: recall@K scoring (FR-011, US6)

**Decision**: For each learner-defined `(question, expectedChunkId)`
pair and a given configuration (naive RAG or a selected executable
variant), run that configuration's real retrieval for `question` and
score `1` if `expectedChunkId` appears anywhere in the top-K results
(K = the pipeline's current Top-K, per the `/speckit.clarify` resolution
folded into FR-011), else `0`. The configuration's recall@K = (sum of
per-pair scores) / (total pairs), shown as a percentage per
configuration, side by side.

**Rationale**: This is the standard recall@K definition FR-011 already
names in the UI-copy example ("recall@3: expected chunk appears in top 3
results") -- no design freedom needed beyond confirming which retrieval
path (real, not simulated) and which K (the shared pipeline Top-K, per
clarification) it uses.

## Decision: Testing approach for SC-004, SC-006, SC-007, SC-008, SC-009

**Decision**: Extend Milestone 1's four-script/spec pattern rather than
introducing a new framework, splitting each new/changed SC the same way
001 did (see 001's research.md precedent):

- **SC-004** (100% of failure paths -> error + fallback) --
  `tests/real-mode/failure-fallback.spec.ts`, Playwright route
  interception returning canned 401/429/network-error responses for
  each call type, asserting the specific error banner + working
  fallback button appear. Extended (FR-007, checklist follow-up
  2026-08-06): for a mid-sequence HyDE/RAG-Fusion failure, also assert
  Retry issues exactly one new request (the failed call) and the
  already-succeeded earlier calls' results stay visible unchanged, not
  re-fetched -- proving resume, not restart.
- **SC-006** (no API key leaves the browser) -- two halves, per
  001's precedent of pairing a cheap static check with a real
  browser-driven one:
  - `scripts/checks/key-isolation.ts` (static, `tsx`) -- fails if any
    file exists under a first-party server-route path (`src/app/api/**`
    or any Next.js Route Handler pattern), which would be the only way
    this project could ever receive the key server-side. Cheap
    regression insurance, not the primary proof.
  - `tests/real-mode/key-isolation.spec.ts` (dynamic, Playwright) -- the
    primary proof: mocks the provider's responses via route interception
    with a fake test key, runs a full Real Mode flow, and asserts (via
    `page.on('request')`) every outgoing request either targets the
    mocked provider origin or does not contain the key string in any
    header/body/query string.
- **SC-007** (temperature effect observable) --
  `tests/real-mode/temperature-effect.spec.ts`, mocked high-temperature
  responses that differ between two runs and mocked low-temperature
  responses that are identical between two runs, over the same prompt.
- **SC-008** (RAG-Fusion N effect + call-count accuracy) --
  `tests/real-mode/fusion-n-effect.spec.ts`, mocked responses for two
  different N values producing different fused rankings, plus a request
  count assertion matching the `N + 3` formula above.
- **SC-009** (Real Mode controls are keyboard-operable, FR-015) --
  `tests/a11y/real-mode.spec.ts`, a third spec file alongside 001's
  existing two (same `npm run check:a11y` command, same
  `@axe-core/playwright` + real-keyboard-event pattern), covering the
  toggle, key input, temperature/N/hypothesis-count sliders, and the
  custom-document textarea. Extended (FR-015, checklist follow-up
  2026-08-06): also assert the key-format error is
  `aria-describedby`-associated with the key input, and that a
  triggered `ErrorBanner` carries `role="alert"`/`aria-live` -- FR-015's
  bar now covers dynamic content, not only the enumerated control
  widgets.

All of the above mock the provider's HTTP responses -- deterministic,
free, CI-safe, no real API key needed. One real end-to-end run against
the actual OpenAI API, with a real (implementer-supplied) key, is a
manual verification task in `tasks.md` (mirroring 001's T036/T044
manual-walkthrough pattern), not part of the automated/CI suite, since
committing a real API key into CI is out of scope and undesirable.

**Rationale**: Consistent with 001's already-decided philosophy (small,
purpose-built checks now; Milestone 6 formalizes across all milestones
later) and with tech-stack.md's existing note that the project-wide
framework choice stays open until Milestone 6. Mocking at the HTTP layer
rather than mocking the `RealModeProvider` interface directly means the
tests also exercise the real `fetch` call shape, headers, and response
parsing -- closer to the real integration than a pure unit-level mock,
without the cost/flakiness of live API calls in CI.

**Alternatives considered**: Requiring a real API key in CI (via a
repo secret) -- rejected: costs money per CI run, is flaky against rate
limits, and risks the exact key-leak concern SC-006 exists to prevent if
misconfigured. Unit-testing `RealModeProvider` with a mocked interface
instead of mocked HTTP -- rejected as weaker proof for SC-006
specifically, which is about what actually crosses the network, not
what the abstraction layer receives.

## Scope note: `check:extensibility` and `check:determinism` need no new rules

**Decision**: Neither existing script changes.

**Rationale**: `check:extensibility` (SC-001 in 002's spec, a regression
gate) scans for cross-module conditionals and registry-id uniqueness --
all of this feature's new files live inside `src/concepts/rag/`, and no
new registry entry is added, so there's nothing new for that scan to
catch; it simply needs to keep passing. `check:determinism` (Constitution
Principle V) is scoped to Simulated Mode's mock-embedding pipeline,
which this feature doesn't touch -- Real Mode's own local computations
(PCA projection, cosine ranking, recall@K scoring) are pure functions of
their inputs and therefore deterministic by construction for a fixed
API response, but the API response itself isn't guaranteed identical
run-to-run (spec.md 002 Edge Cases explicitly says so for temperature,
and the same reasoning applies to embeddings). Principle V governs
*simulated* behavior specifically; Real Mode is by definition not
simulated, so this is a documented scope boundary, not a gap.
