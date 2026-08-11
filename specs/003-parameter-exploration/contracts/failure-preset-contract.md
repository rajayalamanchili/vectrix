# Contract: Failure Presets (US3)

`src/concepts/rag/failurePresets/failurePresets.ts`

## `FAILURE_PRESETS: FailurePreset[]`

A static array of exactly 3 values (FR-009's minimum), typed per
data-model.md's `FailurePreset` interface:

1. **`threshold-too-strict`** -- `similarityThreshold` set high enough
   (e.g. `0.9`) that no chunk in the "coffee" doc clears it for a
   real sample query. `expectedFailure: { type: "empty-results" }`.
2. **`chunk-too-large`** -- `chunkSize` large enough (e.g. `120`,
   `chunkingStrategy: "fixed"`) that the espresso-extraction sentence
   (naming grams and seconds together) shares a chunk with unrelated
   neighboring text, diluting its match. `expectedFailure: {
   type: "fact-split", factSubstring: <that sentence> }` -- see below,
   "fact-split" here means the fact is *present but not isolated*; the
   substring check in the automated script (below) is necessarily a
   proxy, documented per-preset in its `explanation` field.
3. **`chunk-too-small`** -- `chunkSize` small enough (e.g. `20`) that
   the same multi-clause sentence is split across two chunks entirely.
   `expectedFailure: { type: "fact-split", factSubstring: <sentence> }`.

Each entry's `explanation` field is learner-facing prose naming the
exact parameter and its value (Acceptance Scenario 2) -- e.g. "Chunk
size 120 merges this fact with the surrounding cold-brew paragraph,
diluting the match" -- not the internal `expectedFailure` shape.

## `scripts/checks/failure-presets.ts` (SC-004)

For each `FAILURE_PRESETS` entry, imports and calls the real
`chunkText`/`chunkTextBySentence` (per its `chunkingStrategy`) against
the real `sampleDocs` document matching `docId`, and:

- `type: "empty-results"`: asserts
  `chunks.map(scoreAgainstQuery).filter(s => s >= threshold).length === 0`.
- `type: "fact-split"`: asserts no single produced chunk's `.text`
  contains `factSubstring` in full, while the source document's raw
  text does -- i.e. the fact is provably not intact in any one chunk at
  this configuration.

A preset whose predicate no longer holds is a **check failure**,
reported the same way `determinism.ts` reports a divergent run --
naming which preset broke and what the live pipeline produced instead,
so a chunking-algorithm change that silently defuses a preset is caught
here, not discovered later by a learner.

## Caller contract (`PipelineWalkthrough.tsx`)

`FailurePresetPicker` renders above `StepperNav` (reachable regardless
of `stepIndex`, per US3's Independent Test). Selecting a preset applies
every `FailurePreset` field in one update (mirroring `handleDocSelect`'s
existing all-at-once reset pattern) and calls `goTo(3)` (Retrieval step)
so the failure state is immediately visible. A separate, always-visible
"Reset to defaults" control (FR-010) restores
`PipelineWalkthrough.tsx`'s existing initial state values and is not
itself a `FailurePreset` entry.
