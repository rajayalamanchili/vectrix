# Phase 1 Data Model: Real Mode for the RAG Concept Module

**Feature**: `002-real-mode` | **Date**: 2026-08-05, re-synced 2026-08-06

All entities are client-side, in-memory TypeScript types -- no
persistence layer (per spec.md 002 Assumptions). Types marked
**(existing)** are unchanged from spec.md 001; **(new)** types are this
plan's addition, defined in `src/concepts/rag/realMode/types.ts` unless
noted otherwise.

## RealModeSession **(new)**

Lifted state in `RagConcept.tsx`, shared by both views (per
research.md's provider-abstraction decision).

| Field | Type | Notes |
|---|---|---|
| `active` | `boolean` | FR-002's toggle state. Default `false` -- every downstream prop threading through Real Mode data defaults to inactive, which is what makes SC-002 (002-spec)'s "Simulated Mode stays fully unaffected" true by construction, not by a separate code path. |
| `provider` | `ProviderConfig` | A data value (base URL, model names, key-format pattern, display label), not a string-literal union (research.md's revised provider decision) -- swapping the shipped default (OpenAI) for another OpenAI-compatible endpoint is a `ProviderConfig` value change, not a type change. |
| `apiKey` | `string \| null` | In-memory only (research.md's key-storage decision) -- never written to `sessionStorage`/`localStorage`/any request this project's own code doesn't make. `null` until FR-003's prompt is completed. |
| `error` | `RealModeError \| null` | Most recent Real Mode API failure, if any (FR-007). Cleared on next successful call or explicit dismissal. |

## Key-entry disclaimer copy (FR-003, supports User Story 1 Acceptance Scenario 2)

`RealModeToggle.tsx`'s key-entry prompt (first shown the moment Real
Mode is activated with no key yet configured) MUST render both halves
below together, not the safe-handling half alone -- FR-003 requires the
risk disclaimer to sit "alongside," not replace, the where-it's-sent
statement:

> **Where your key goes**: Sent directly from this browser to
> {provider.label}'s API -- never to any server this project runs (there
> isn't one). Held in memory for this browser tab only; closing or
> refreshing the tab clears it immediately.
>
> **Use at your own risk**: Entering any API key into a web page carries
> some inherent risk no client-side app can fully remove -- e.g. a
> browser extension with page access could read it while active. Use a
> key you're comfortable exposing this way, ideally one with a low
> spending limit.

Both paragraphs render inside the same prompt element carrying
`data-key-disclaimer="true"`, mirroring the `data-simulated-disclosure`/
`data-real-disclosure` marker convention (spec.md 001;
`contracts/real-mode-automated-checks-contract.md`), so `check:disclosure`
can assert non-empty content the same way it already does for the other
two disclosure surfaces. `{provider.label}` is interpolated from the
active `ProviderConfig` (below), not hardcoded, consistent with the
provider-agnostic design.

## ProviderConfig **(new)**

The data shape that parameterizes `openaiCompatibleProvider.ts`
(`contracts/real-mode-provider-contract.md`) -- adding or swapping a
provider is authoring one value of this type, not writing new adapter
code, for any provider that speaks the OpenAI-compatible REST shape.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Free-form identifier, e.g. `"openai"` -- not a fixed union, so a second config doesn't require a type change. |
| `label` | `string` | Display name for FR-004/FR-006 disclosure copy, e.g. `"OpenAI"` -- this is what fills spec.md's `"Real embeddings via [provider]"` placeholder. |
| `baseUrl` | `string` | e.g. `"https://api.openai.com/v1"`. |
| `embeddingsModel` | `string` | e.g. `"text-embedding-3-small"`. |
| `chatModel` | `string` | e.g. `"gpt-4o-mini"`. |
| `keyFormatPattern` | `RegExp` | FR-003's pre-validation rule, e.g. `/^sk-/` for OpenAI-style keys. |

**Shipped this milestone**: exactly one `ProviderConfig` value, targeting
OpenAI, is built, wired into the UI, and end-to-end tested (research.md).
A structurally different provider (Anthropic -- different request/
response shape, no embeddings endpoint) is documented in research.md as
a design proof that the `ProviderConfig`/`RealModeProvider` split
generalizes, but is not a second value shipped here.

## RealModeError **(new)**

| Field | Type | Notes |
|---|---|---|
| `kind` | `"invalid-key" \| "network" \| "rate-limit" \| "partial-failure" \| "other"` | Drives which specific message + whether a retry vs. fallback-only action is offered (FR-007, SC-004). `"partial-failure"` is RAG-Fusion/HyDE-specific -- a mid-sequence call failure (spec.md Edge Cases). |
| `message` | `string` | Plain-language, specific -- never a raw provider error string verbatim (FR-007 requires "clear, specific," not "whatever the API returned"). |
| `stage` | `string` | Which step/call failed (e.g. `"embed-corpus"`, `"generate-hypothesis-2"`), used by `tests/real-mode/failure-fallback.spec.ts` to assert the right banner appears for the right failure, and by Retry (below) to know exactly which call to re-issue. |

**Retry resumes at `stage`, it never restarts the sequence** (FR-007,
checklist follow-up 2026-08-06): `ErrorBanner.tsx`'s Retry action re-runs
only the call named by `error.stage`. It does this by reading whichever
partial results `VariantExecutionTrace` (below) already holds for calls
before `stage` and continuing from there -- those results are never
discarded or re-fetched, so a retry after, say, RAG-Fusion's third of
five query variants fails costs exactly one more call, not five.

**Correcting a rejected key, in place** (FR-003, checklist follow-up
2026-08-06): `"invalid-key"` (from a failed live call) and a local
`keyFormatPattern` mismatch (before any call is made) render distinct
wording in the same key-input error slot. Neither clears
`RealModeSession.apiKey`'s input value -- the learner edits the existing
text and resubmits; submission stays blocked only while the current
value fails the format check, never as a lingering state after a
live-call rejection is corrected.

## RealEmbeddingResult **(new)** -- replaces `EmbeddedPoint` when Real Mode is active

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Chunk id or `"query"`/`"hypothesis-{n}"`/`"variant-{n}"`. |
| `vector` | `number[]` | Raw returned embedding vector (1536-dim for `text-embedding-3-small`), used for cosine similarity -- never truncated or altered before scoring. |
| `x`, `y` | `number` | PCA-projected 2D coordinates (research.md). |
| `projectionMethod` | `"pca"` | Named literal, surfaced in the UI per FR-004 ("names... the dimensionality-reduction method"). |

Same `{ x, y, vector }` shape as `EmbeddedPoint` **(existing)** by
design, so `StarChart`'s `StarPoint` consumer needs no change -- only
the producer differs between modes.

## GenerationParams **(new)**

Learner-adjustable real-generation settings, per spec.md's Key Entities.
Lives alongside `RealModeSession` in `RagConcept.tsx` (shared by both
views, since both can trigger real generation).

| Field | Type | Notes |
|---|---|---|
| `temperature` | `number` | `0.0-1.0`, step `0.1`, default `0.3` (FR-012). Passed through unchanged to `RealModeProvider.generate()`; the UI range is a legible subset of OpenAI's native `0-2` scale, not the full range, so the low/high-temperature framing in spec.md's Edge Cases ("very consistent" vs. clearly varied) stays intuitive without requiring the learner to understand the provider's specific scale. |
| `fusionN` | `number` | `2-5`, step `1`, default `3` (FR-013) -- matches `variantData.ts`'s existing `howItWorks` copy ("3-5 varied phrasings") so the new control doesn't contradict already-shipped explanatory text. |
| `hydeCount` | `number` | `1-3`, step `1`, default `1` (FR-014) -- default `1` preserves single-hypothesis behavior as the unsurprising baseline; range capped at `3` to bound latency/cost for a teaching tool. |

## VariantExecutionTrace **(new)**

The ordered, inspectable intermediate output of one real variant run
(FR-008), shaped per-variant since HyDE and RAG-Fusion genuinely differ
in mechanics (research.md):

```ts
type VariantExecutionTrace =
  | {
      variantId: "naive";
      queryEmbedding: RealEmbeddingResult;
      retrieval: RetrievedChunk[];
      callCount: number; // always 3: embed corpus, embed query, generate
    }
  | {
      variantId: "hyde";
      hypotheses: { text: string; embedding: RealEmbeddingResult }[]; // length = hydeCount
      averagedRetrieval: RetrievedChunk[]; // retrieval against the mean of hypotheses' vectors
      callCount: number; // hydeCount + 3, see research.md
    }
  | {
      variantId: "fusion";
      queryVariants: { text: string; embedding: RealEmbeddingResult; retrieval: RetrievedChunk[] }[]; // length = fusionN
      fusedRetrieval: RetrievedChunk[]; // Reciprocal Rank Fusion over queryVariants[*].retrieval
      callCount: number; // fusionN + 3, see research.md
    };
```

Every variant of the union also implicitly carries `finalAnswer: string`
(the last generation call's output) and an optional `error?:
RealModeError` for a partial-failure mid-sequence (spec.md Edge Cases).
Array fields (`hypotheses`, `queryVariants`) are populated incrementally,
one element per completed call (FR-008's serial-execution requirement) --
on a mid-sequence failure, whatever elements already exist stay in place
rather than being cleared, which is what makes FR-007's resume-not-
restart retry possible: Retry re-issues only the one call `error.stage`
names and appends its result to the array already held here, instead of
re-running the whole sequence from an empty trace.

## Executable variant set (FR-009)

Not a new type -- a fixed constant, `EXECUTABLE_VARIANT_IDS = ["naive",
"hyde", "fusion"]`, local to `VariantsComparison.tsx` (spec.md
Assumptions: only these three are genuinely executable this milestone;
`variantData.ts`'s existing `RagVariant[]` shape is unchanged, since
executability is a Real-Mode-only concern, not a property of the
explanatory data Simulated Mode also reads). When Real Mode is active,
any `RagVariant` whose `id` isn't in this set (`"graphrag"`, `"self-rag"`,
`"agentic"`) renders its Run control `disabled`, with adjacent text
reading "Explanatory only this milestone" (FR-009, checklist follow-up
2026-08-06) -- the control stays visible and reachable via Tab (so
`check:a11y`'s disabled-control rule still applies to it) rather than
being removed from the DOM.

## EvalPair **(new)**

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `"eval-{n}"`, sequential within one authoring session. |
| `question` | `string` | Learner-authored question text. |
| `expectedChunkId` | `string` | A `Chunk.id` **(existing, spec.md 001)** from the currently active document -- the UI constrains this to an actual chunk id (e.g. a picker over the current chunk list), not free text, so recall@K scoring (research.md) can't silently no-op against a typo'd id. |

## RecallResult **(new)** -- derived, not learner-authored

| Field | Type | Notes |
|---|---|---|
| `configurationId` | `"naive" \| "hyde" \| "fusion"` | Which configuration this score is for. |
| `k` | `number` | The pipeline's current Top-K at evaluation time (FR-011, per `/speckit.clarify`). |
| `scorePerPair` | `{ evalPairId: string; hit: boolean }[]` | Per-pair detail, so the UI can show which specific pairs the configuration missed, not just an aggregate. |
| `recallAtK` | `number` | `[0, 1]`, `scorePerPair.filter(hit).length / scorePerPair.length`. |

## Eval call-count estimate (FR-011, checklist follow-up 2026-08-06)

Not a stored field -- a value `callEstimate.ts` computes and
`EvalPanel.tsx` renders above the Run control, before any evaluation
call is made, mirroring FR-010's HyDE/RAG-Fusion pre-execution
disclosure (`data-model.md`'s existing call-count formulas):

```
evalCallEstimate = evalPairs.length * configurationsTested.length
  * callsPerConfiguration(configurationId)
```

where `callsPerConfiguration` is the same per-configuration call count
`VariantExecutionTrace.callCount` already produces (3 for naive, `hydeCount
+ 3` for HyDE, `fusionN + 3` for fusion) -- an eval run's total cost is
just that number multiplied across every pair and every configuration
under test, using FR-016's same "one call" definition. Recomputed live
whenever `evalPairs`, the configuration selection, or `GenerationParams`
change.

## CustomDocumentInput state **(new)** -- Pipeline Walkthrough and Compare Variants, independently

Per research.md's decision that the two views don't share this state:

| Field | Type | Notes |
|---|---|---|
| `mode` | `"sample" \| "custom"` | Which source is active. |
| `customText` | `string` | Learner-pasted text, capped at 10,000 characters (FR-005, per `/speckit.clarify`), enforced before any API call is made -- client-side length check, not a server-side one (there is no server). |
| `customQuestion` | `string` | Replaces the sample-document `sampleQueries` chip list when `mode === "custom"` (spec.md Edge Cases: sample questions must be cleared/marked stale when a custom document replaces the sample one). |

**Reverting to a sample document clears the custom state** (User Story 3
Scenario 3, checklist follow-up 2026-08-06): switching `mode` from
`"custom"` back to `"sample"` resets both `customText` and
`customQuestion` to `""` and restores the target sample document's own
`sampleQueries` chip list -- the symmetric counterpart of the
sample-to-custom direction above, so no custom text or stale question
lingers once a learner has moved back to a sample document.

## Extended existing types

| Type | Field added | Notes |
|---|---|---|
| `DocumentStep` props **(existing, spec.md 001)** | `realMode?: RealModeSession` | Optional, defaults to inactive -- renders `CustomDocumentInput` only when `realMode?.active` is true. |
| `EmbeddingStep` props | `realMode?: RealModeSession` | When active, calls `RealModeProvider.embedBatch()` instead of `mockEmbedding.embed()`, and PCA instead of the fixed `PROJECTION` matrix; renders a `data-real-disclosure="true"` marker (mirroring `data-simulated-disclosure`, FR-004) instead of the simulated-mode caption. |
| `RetrievalStep` props | `realMode?: RealModeSession` | Same real-vs-mock branch for the query embedding; cosine similarity scoring itself is unchanged (already provider-agnostic over `number[]` vectors). |
| `GenerationStep` props | `realMode?: RealModeSession`, `params?: GenerationParams` | When active, calls `RealModeProvider.generate()` with `params.temperature` instead of `mockGenerate()`; renders `data-real-disclosure="true"` with "Real answer via OpenAI" instead of the simulated caption (FR-006). |

## State ownership summary

Per tech-stack.md's "lifted to the smallest common parent" rule:

- `RealModeSession`, `GenerationParams` -- lifted to `RagConcept.tsx`
  (shared by Pipeline Walkthrough and Compare Variants).
- `CustomDocumentInput` state, `EvalPair[]`, `RecallResult[]` -- owned
  independently by `PipelineWalkthrough.tsx` and `VariantsComparison.tsx`
  respectively (research.md's independent-state decision); eval state
  specifically lives in `VariantsComparison.tsx` since US6 compares
  "naive RAG against a variant," the same vocabulary as that view.
- `VariantExecutionTrace` -- owned by `VariantsComparison.tsx`, one per
  currently-selected-and-run variant.
