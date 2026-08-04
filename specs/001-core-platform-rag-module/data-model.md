# Phase 1 Data Model: Core Extensible Platform + RAG Concept Module

**Feature**: `001-core-platform-rag-module` | **Date**: 2026-08-03

All entities are client-side, in-memory TypeScript types -- there is no
persistence layer (per spec.md Assumptions). Entities already implemented
are marked **(existing)**; fields/entities this plan adds to close
FR-013/FR-014 are marked **(new)**.

## ConceptModule **(existing)**

The extensibility contract every concept, including RAG, satisfies.
Source of truth: `src/lib/concept-types.ts`.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | URL-safe, used as `/concepts/[id]` route segment; MUST be unique within `conceptRegistry` (FR-001, added 2026-08-04). Enforced by an automated check, not just array authorship -- see the uniqueness rule added to `check:extensibility` in `contracts/automated-checks-contract.md`. |
| `title` | `string` | Display name. |
| `tagline` | `string` | One-line hook, home page card. |
| `description` | `string` | 2-4 sentences, home page card + concept header. |
| `category` | `string` | Grouping label, free text. |
| `estimatedTime` | `string` | Human-readable hint, e.g. "12-18 min". |
| `Component` | `ComponentType` | Renders the whole concept experience. |

## SampleDoc **(existing)**

Source: `src/concepts/rag/lib/sampleDocs.ts`.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | e.g. `"coffee"`, `"onboarding"`. |
| `title` | `string` | Shown on the document-selector chip. |
| `text` | `string` | Full source text, static fixture. |
| `sampleQueries` | `string[]` | Pre-written questions shown as quick-pick chips. |

## Chunk **(existing, extended)**

A contiguous slice of a `SampleDoc`'s text.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `"chunk-{index}"`, sequential within one chunking run. |
| `text` | `string` | The chunk's text content. |
| `startWord` | `number` | Word-index start boundary (fixed-size strategy) or sentence-run start (sentence strategy). |
| `endWord` | `number` | Word-index end boundary. |
| `strategy` **(new)** | `"fixed" \| "sentence"` | Which chunking function produced this chunk -- added so the Chunking step can label chunks by strategy and so the determinism check (SC-006) and boundary-difference check (SC-008) can assert against a known-produced-by field rather than re-deriving it. |

Produced by two functions in `sampleDocs.ts`:
- `chunkText(text, chunkSize, overlap): Chunk[]` **(existing)** -- fixed-size
  overlapping word windows.
- `chunkTextBySentence(text, chunkSize, overlap): Chunk[]` **(new)** --
  splits on sentence-ending punctuation, then greedily groups consecutive
  sentences into a chunk until adding the next sentence would exceed
  `chunkSize` words (per the `/speckit.clarify` 2026-08-03 resolution),
  then starts a new chunk. `overlap` applies the same way as the
  fixed-size strategy: the next chunk starts `overlap` words back from
  the previous chunk's end, snapped to the nearest sentence boundary at
  or before that point, so overlap remains meaningful for both
  strategies.

## EmbeddedPoint **(existing)**

Source: `src/concepts/rag/lib/mockEmbedding.ts`.

| Field | Type | Notes |
|---|---|---|
| `x`, `y` | `number` | 2D projected coordinates for plotting. |
| `vector` | `number[]` | `VOCAB_DIM`-length normalized bag-of-words vector, used for `cosineSimilarity`, not for plotting directly. |

## RetrievedChunk **(existing, filtering extended)**

| Field | Type | Notes |
|---|---|---|
| `chunk` | `Chunk` | The retrieved chunk. |
| `score` | `number` | Cosine similarity to the current query, `[0, 1]` given non-negative bag-of-words vectors. |

Retrieval filtering pipeline (in `RetrievalStep.tsx`), post FR-013:
1. Rank all chunks by `score` descending (existing).
2. **(new)** Filter to `score >= similarityThreshold`.
3. Slice to `topK` (existing, FR-006/FR-013 -- Top-K and threshold apply
   independently, in this order, so threshold can empty the list before
   Top-K ever matters, satisfying SC-007).

## RagVariant **(existing)**

Source: `src/concepts/rag/variants/variantData.ts`. No changes.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Variant identifier. |
| `name` | `string` | Display name. |
| `problem` | `string` | What naive RAG failure mode it addresses. |
| `howItWorks` | `string` | Explanation text. |
| `tradeoff` | `string` | Cost of adopting the variant. |
| `flow` | `{ stage: string; differs: boolean }[]` | Ordered pipeline stages, each flagged whether it differs from naive RAG. |

## Pipeline state shape **(existing, extended)** -- `PipelineWalkthrough.tsx`

Lifted `useState` fields, per tech-stack.md's state-management choice:

| Field | Type | Notes |
|---|---|---|
| `stepIndex` | `number` | Active stepper position, `0-4`. |
| `docId` | `string` | Selected `SampleDoc.id`. |
| `chunkSize` | `number` | Words, `20-120`. |
| `overlap` | `number` | Words, `0-min(40, chunkSize-5)`. |
| `chunkingStrategy` **(new)** | `"fixed" \| "sentence"` | FR-014 toggle, default `"fixed"` (preserves existing behavior for anyone who never touches the toggle). |
| `query` | `string` | Active question text. |
| `topK` | `number` | `1-5`. |
| `similarityThreshold` **(new)** | `number` | `0.00-1.00`, step `0.01`, default `0` (FR-013, per `/speckit.clarify` resolution). |
| `results` | `RetrievedChunk[]` | Confirmed retrieval results, only set when the learner clicks "Use these results" in Step 4. |

**Reset rule (new, per `/speckit.clarify`)**: a `useEffect` keyed on
`[docId, chunkingStrategy]` resets `query`, `results`, and `stepIndex`
to their defaults whenever either changes, so Generation can never
display a prompt built from a chunk set that no longer exists.

## New: Disclosure marker contract (supports SC-003 automated check)

Any UI surface presenting simulated AI behavior (currently
`EmbeddingStep.tsx`'s projection caption, `GenerationStep.tsx`'s
simulated-answer note) MUST wrap that disclosure text in an element
carrying `data-simulated-disclosure="true"`. This is a new, minimal
convention introduced so `scripts/checks/simulated-disclosure.ts` (see
research.md) has a stable, non-text-fragile hook to assert against,
satisfying Constitution Principle II and SC-003 without relying on
brittle prose matching.
