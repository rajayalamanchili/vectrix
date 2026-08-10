# Data Model: Parameter Exploration & Sharing

**Feature**: `003-parameter-exploration` | **Date**: 2026-08-10

All types are client-side/in-memory, no persistence layer -- consistent
with every prior milestone (no backend exists in this project).

## SweepPoint / SweepState (US1)

```ts
interface SweepPoint {
  chunkSize: number;           // one of the 9 fixed values (research.md)
  clampedOverlap: number;      // Math.min(overlap, chunkSize - 5)
  status: "pending" | "loading" | "done" | "error";
  topOneScore: number | null;  // ranked[0]?.score, null until status === "done"
  error?: RealModeError;       // set only if status === "error" (Real Mode)
}

interface SweepState {
  status: "idle" | "awaiting-confirmation" | "running" | "done";
  token: number;                // research.md's cancellation counter
  points: SweepPoint[];
}
```

- `awaiting-confirmation` exists only for Real Mode (FR-003); Simulated
  Mode goes `idle -> running -> done` synchronously in one tick, since
  it's pure computation with no cost/latency to disclose (Acceptance
  Scenario 5).
- `points` is populated progressively in Real Mode (one element's
  `status` flips to `"done"` per completed `corpus-embed` call), mirroring
  `VariantExecutionTrace`'s existing "populated one element per
  completed call" convention (spec 002, FR-008).
- Starting a new sweep replaces `SweepState` wholesale and increments
  `token` (research.md's cancel-and-replace decision) -- there is no
  queue.
- `SweepState` is intentionally *not* part of `PermalinkParams` below:
  per spec.md's Edge Cases, a permalink generated mid-sweep encodes only
  the pre-sweep parameter state.

## PermalinkParams (US2)

The exact, complete set of URL query keys a permalink can carry. Every
field maps 1:1 to state already owned by `PipelineWalkthrough.tsx` or
threaded to it as props (research.md's "where state lives" decision).

| Query key | Source state | Present when |
|---|---|---|
| `mode` | `"sim"` or `"real"`, from `realMode.active` | always |
| `doc` | `docId` (sample doc id only -- never `"custom"`) | always, unless `customMode === "custom"` (see below) |
| `cs` | `chunkSize` | always |
| `ov` | `overlap` | always |
| `strat` | `chunkingStrategy` (`"fixed"` \| `"sentence"`) | always |
| `th` | `similarityThreshold` | always |
| `k` | `topK` | always |
| `q` | `query` (URI-encoded) | always |
| `temp` | `generationParams.temperature` | `mode === "real"` |
| `fn` | `generationParams.fusionN` | `mode === "real"` |
| `hc` | `generationParams.hydeCount` | `mode === "real"` |

**Explicitly never encoded** (FR-006, FR-007 -- no exception):
- `realMode.apiKey`
- `customText` / `customQuestion` (the pasted-document Real Mode input)

When `customMode === "custom"` at generation time, `doc` is simply
omitted and the "Generate permalink" UI shows inline text stating the
custom document was excluded (FR-007) -- generation still succeeds; it
does not block or fail.

**Applying a loaded permalink** (FR-008): on first mount,
`PipelineWalkthrough.tsx` reads `useSearchParams()` once. If `doc` is
present but doesn't match any `sampleDocs` id, the load fails closed
with a visible, specific message (Edge Cases: a renamed/removed sample
document) rather than silently substituting a different document. If
`mode=real`, `onRealModeChange` sets `active: true` with `apiKey`
untouched (`null` for a fresh visitor) -- `RealModeToggle.tsx`'s existing
active-but-no-key prompt flow already handles the rest, so no real API
call happens until the visitor supplies their own key (Acceptance
Scenario 3).

## FailurePreset (US3)

```ts
interface FailurePreset {
  id: string;
  label: string;               // e.g. "Threshold too strict"
  docId: string;                // must be a real sampleDocs id
  chunkSize: number;
  overlap: number;
  chunkingStrategy: ChunkingStrategy;
  similarityThreshold: number;
  topK: number;
  query: string;
  explanation: string;          // names the causing parameter (Acceptance Scenario 2)
  expectedFailure:
    | { type: "empty-results" }
    | { type: "fact-split"; factSubstring: string };
}
```

- `expectedFailure` is consumed only by
  `scripts/checks/failure-presets.ts` (research.md) -- it is not
  rendered in the UI; the UI shows `explanation` (learner-facing prose)
  instead.
- Three shipped values (FR-009 minimum): `threshold-too-strict`
  (`expectedFailure: { type: "empty-results" }`), `chunk-too-large` and
  `chunk-too-small` (both `{ type: "fact-split", factSubstring }`, using
  a real multi-number sentence from the "coffee" sample doc as the
  fact -- e.g. the espresso extraction sentence naming grams and
  seconds together).
- Loading a preset applies every field above in one update (mirroring
  `handleDocSelect`'s existing "reset query/results/stepIndex together"
  pattern in `PipelineWalkthrough.tsx`) and jumps to the Retrieval step
  so the failure is immediately visible.
- "Reset to defaults" (FR-010) restores `PipelineWalkthrough.tsx`'s
  existing initial `useState` values (`docId: "coffee"`, `chunkSize: 60`,
  `overlap: 15`, `chunkingStrategy: "fixed"`, `similarityThreshold: 0`,
  `query: ""`) -- it is a plain reset, not itself a `FailurePreset`
  value, and is reachable from any preset-loaded *or* swept state.
