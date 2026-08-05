# Phase 1 Data Model: Real Mode for the RAG Concept Module

**Feature**: `002-real-mode` | **Date**: 2026-08-05

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
| `stage` | `string` | Which step/call failed (e.g. `"embed-corpus"`, `"generate-hypothesis-2"`), used by `tests/real-mode/failure-fallback.spec.ts` to assert the right banner appears for the right failure. |

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

## CustomDocumentInput state **(new)** -- Pipeline Walkthrough and Compare Variants, independently

Per research.md's decision that the two views don't share this state:

| Field | Type | Notes |
|---|---|---|
| `mode` | `"sample" \| "custom"` | Which source is active. |
| `customText` | `string` | Learner-pasted text, capped at 10,000 characters (FR-005, per `/speckit.clarify`), enforced before any API call is made -- client-side length check, not a server-side one (there is no server). |
| `customQuestion` | `string` | Replaces the sample-document `sampleQueries` chip list when `mode === "custom"` (spec.md Edge Cases: sample questions must be cleared/marked stale when a custom document replaces the sample one). |

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
