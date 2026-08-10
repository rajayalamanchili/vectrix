# Contract: Sweep (US1)

## `generateSweepChunkSizes(): number[]`

`src/concepts/rag/sweep/runSweep.ts`. Zero arguments -- the range and
point count are fixed per research.md, not caller-configurable. Always
returns the same 9-element array:
`[20, 35, 45, 60, 70, 85, 95, 110, 120]`. Pure, deterministic.

## `runSimulatedSweep(doc, overlap, chunkingStrategy, query): SweepPoint[]`

Synchronous. For each value from `generateSweepChunkSizes()`: clamps
overlap (`Math.min(overlap, chunkSize - 5)`), chunks the document with
the existing `chunkText`/`chunkTextBySentence`, embeds every chunk plus
the query with the existing `embed()`, ranks by `cosineSimilarity`, and
returns a `SweepPoint` with `topOneScore = ranked[0]?.score ?? 0` and
`status: "done"`. Never returns a `"loading"`/`"error"` point --
Simulated Mode has no async step (Acceptance Scenario 5).

## `sweepCallEstimate(pointCount = 9): number`

`src/concepts/rag/sweep/sweepCallEstimate.ts`. Returns `pointCount + 1`
(research.md's "Real Mode sweep call cost" decision). Same pure-formula
style as `callEstimate.ts`'s `hydeCallCount`/`fusionCallCount`.

## Real Mode sweep execution (caller-owned, in `RetrievalStep.tsx`)

Not a single function -- follows the same per-effect, per-call pattern
`RetrievalStep.tsx` already uses for its own corpus/query embeds:

1. On "Start sweep" (only enabled once the learner has confirmed the
   `sweepCallEstimate()` estimate -- FR-003), capture the current
   `activeQuery`, issue **one** `embedBatch([activeQuery])` call, and
   record the resulting vector for reuse across every point.
2. Sequentially, for each of the 9 chunk sizes: chunk the document
   locally at that size (clamped overlap), issue one
   `embedBatch(chunkTexts)` call for that point's corpus, score against
   the shared query vector from step 1, and update that point's
   `SweepPoint` to `status: "done"` before starting the next point's
   call.
3. Every call closes over the `sweepToken` active when the sweep
   started (research.md); if a newer sweep has since started, the
   result is discarded rather than applied.
4. A failed call sets that one point's `status: "error"` and
   `error: RealModeError` (`stage: "sweep-point-{chunkSize}"`) and the
   sweep continues to the next point rather than aborting the whole run
   -- a single point's failure doesn't invalidate the rest of the curve.

## `SweepCurve` component (US1, FR-002)

`src/concepts/rag/sweep/SweepCurve.tsx`.

```ts
function SweepCurve(props: {
  points: SweepPoint[];
  onPointActivate: (chunkSize: number) => void;
}): JSX.Element
```

- Renders a decorative `aria-hidden` SVG line/axis background sized
  identically to `StarChart.tsx`'s screen-space math, plus one native
  `<button>` per `SweepPoint` absolutely positioned on top of it
  (research.md's keyboard-operability decision) -- each button's
  accessible name states both the chunk size and its score (e.g. "Chunk
  size 60, top match score 0.42 -- load this configuration").
  `status !== "done"` points render `disabled` (Real Mode, mid-sweep).
- Calling `onPointActivate(chunkSize)` is the only way this component
  communicates a selection; it does not know about `PipelineWalkthrough`'s
  stepper or chunk-size state itself.
- A flat curve (FR-004) is not a distinct rendering mode -- it's the
  same chart with all points near the same y-value, plus a caption
  below the chart reading "This range doesn't move the top-match score
  much for this document/question" whenever the score range across all
  `"done"` points is below a small fixed epsilon (0.02).

## Caller contract (`RetrievalStep.tsx` / `PipelineWalkthrough.tsx`)

`chunkSize` is not currently a settable prop on `RetrievalStep` (it's
read-only there today -- only `ChunkingStep` has `onChunkSize`).
`PipelineWalkthrough.tsx` adds one new prop, `onSweepJump: (chunkSize:
number) => void`, threaded to `RetrievalStep`, implemented exactly like
the existing `handleChunkingStrategy` handler: `setChunkSize(chunkSize);
setResults([]);` -- reusing the same "lighter invalidation, no stepper
reset" precedent (spec.md 001 Edge Cases) rather than a document-switch-
style full reset. `RetrievalStep`'s `SweepCurve.onPointActivate` calls
this prop directly; the learner stays on the Retrieval step the whole
time (Acceptance Scenario 2 only requires the chunk/chart/results to
update in place, not a stepper jump).
