# Contract: Compare Simulated vs Real (US1 -- supports FR-001, FR-002, FR-002a, FR-003, FR-004, FR-004a; SC-001, SC-003)

**Status**: New, this plan. A third top-level view, sibling to
`PipelineWalkthrough` and `VariantsComparison` in `RagConcept.tsx`'s
`TABS` array (per `/speckit.clarify`'s view-placement answer).

## View responsibilities

`src/concepts/rag/compareReal/CompareSimulatedVsReal.tsx` owns:

- Its own independent `docId`/`customMode`/`query` state (research.md
  -- mirrors `VariantsComparison.tsx`'s existing independent-state
  precedent, not shared with Pipeline Walkthrough).
- A configuration selector (`naive` | `hyde` | `fusion`), reusing
  `VariantsComparison.tsx`'s existing `aria-pressed` pill-button pattern
  (already accessibility-verified) rather than inventing a new selector
  widget (FR-002a).
- Building one `ComparisonResult` (`compareReal/types.ts`,
  data-model.md) per (docId, query, configurationId) combination.

## Simulated half

Computed synchronously, always, regardless of `configurationId`:

```ts
const chunks = chunkText(doc.text, CHUNK_SIZE, CHUNK_OVERLAP); // same fixed defaults VariantsComparison.tsx already uses
const queryVector = embed(query).vector;
const simulatedRanking = rankChunks(
  chunks,
  chunks.map((c) => embed(c.text).vector),
  queryVector,
  topK,
); // reuses realMode/variantExecution.ts's rankChunks -- same function Real Mode's own orchestration uses
```

- `simulatedIsApproximation = configurationId !== "naive"`.
- When `simulatedIsApproximation` is true, the Simulated panel renders
  an element with `data-simulated-disclosure="true"` (or an equivalent
  marker `check:disclosure` is extended to recognize, research.md)
  whose text explicitly states Simulated Mode approximates HyDE/RAG-
  Fusion as plain retrieval, since it has no model to generate
  hypotheses or reworded queries. This is **required** whenever
  `simulatedIsApproximation` is true -- `check:disclosure`'s new rule
  fails the build if it's missing (research.md).
- This computation never blocks on network and never shows a loading
  state -- Constitution Principle V, same as every other Simulated
  surface in this app.

## Real half

- `realStatus` starts `"needs-key"` when `realMode.apiKey` is null
  (FR-004a) -- the view still renders the Simulated panel and chart in
  full; only the Real panel shows the existing inline `RealModeToggle`-
  style key-entry prompt in place of its chart.
- Once a key exists, activating the Real half shows the pre-call cost/
  call disclosure (FR-003, reusing spec.md 002 FR-010's exact pattern --
  "Estimated calls for this run: N (~$X)" next to a confirm button,
  same shape `VariantsComparison.tsx`'s existing Run buttons already
  use) before any call fires, and separately the cost-ledger's own
  warning-threshold gate (`contracts/cost-ledger-contract.md`) if
  applicable -- both gates can apply to the same action; the warning
  gate, if triggered, is checked first (a learner who is over threshold
  sees that warning even for an action whose own call-count estimate is
  small).
- Executes via the exact same orchestration logic
  `VariantsComparison.tsx`'s `runNaive`/`runHyde`/`runFusion` already
  use (`rankChunks`, `averageVectors`, `reciprocalRankFusion` from
  `realMode/variantExecution.ts`) against this view's own document/
  query, using `createTrackedProvider` (cost-ledger-contract.md) instead
  of `createOpenAICompatibleProvider` directly so every call is counted.
- `realRanking` carries its own `data-real-disclosure="true"` marker
  naming the provider, identical in spirit to every other Real Mode
  surface (`check:disclosure`'s existing rule already covers this
  pattern; no new rule needed for this half specifically).

## Pairing ranks (FR-002)

```ts
function pairRanks(simulated: RetrievedChunk[], real: RetrievedChunk[] | null): ChunkRankPair[] {
  const allChunkIds = new Set([...simulated.map((r) => r.chunk.id), ...(real ?? []).map((r) => r.chunk.id)]);
  return Array.from(allChunkIds).map((chunkId) => ({
    chunkId,
    simulatedRank: simulated.findIndex((r) => r.chunk.id === chunkId) + 1 || null,
    realRank: real ? real.findIndex((r) => r.chunk.id === chunkId) + 1 || null : null,
  }));
}
```

- Rendered as a table/list (not requiring the learner to visually
  cross-reference two separate charts), satisfying Acceptance Scenario
  2's literal example ("chunk #2: ranked 1st in Real, ranked 3rd in
  Simulated") and SC-001's "readable without additional clicks."
- Close/identical agreement between the two sides is rendered with the
  same neutral styling as any divergence -- no visual treatment implies
  divergence is the expected outcome (FR-004, Acceptance Scenario 4).

## Repeated-run asymmetry (Edge Cases)

Re-running the Real half for an unchanged document/query/configuration
replaces `realRanking` (and therefore `pairs`) with whatever the live
API returns this time -- which may differ run to run, since Real Mode
is not claimed deterministic (spec.md 002). `simulatedRanking` is
recomputed identically every time (Constitution Principle V). The view
makes this explicit rather than confusing: a "Real Mode re-ran; results
may differ from the last run" note appears whenever the Real half is
re-triggered with unchanged Simulated inputs.

## Non-goals

- GraphRAG, Self-RAG, and Agentic RAG are not selectable in this view's
  configuration selector -- they have no real execution to compare
  against (spec.md 002 Assumptions, unchanged; FR-002a).
- No comparison of *generated answers* -- this view compares retrieval
  ranking only, matching spec.md's FR-002 scope ("each chunk's
  rank/position"), not generation output.
