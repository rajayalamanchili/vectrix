# Contract: Cost Ledger (US2 -- supports FR-005, FR-006, FR-007, FR-008; SC-002, SC-004)

**Status**: New, this plan. Builds on top of the existing
`RealModeProvider` interface (`002-real-mode/contracts/real-mode-
provider-contract.md`) as a decorator, not a replacement -- see
research.md's "Cost ledger as a `RealModeProvider` decorator" decision.

## `createLedgerTrackingProvider`

```ts
// src/concepts/rag/costLedger/trackedProvider.ts
import type { RealModeProvider } from "../realMode/types";
import type { PricingTable } from "./pricing";
import type { CostLedgerEntry } from "./types";

export function createLedgerTrackingProvider(
  base: RealModeProvider,
  pricing: PricingTable,
  onCallRecorded: (entry: CostLedgerEntry) => void,
): RealModeProvider {
  return {
    async embedBatch(texts) {
      const result = await base.embedBatch(texts); // rejects propagate untouched -- no entry recorded
      onCallRecorded({ id: crypto.randomUUID(), timestamp: Date.now(), callType: "embed", costUsd: pricing.embedCallUsd });
      return result;
    },
    async generate(prompt, opts) {
      const result = await base.generate(prompt, opts);
      onCallRecorded({ id: crypto.randomUUID(), timestamp: Date.now(), callType: "generate", costUsd: pricing.generateCallUsd });
      return result;
    },
  };
}

/** Convenience wrapper every call site uses instead of createOpenAICompatibleProvider() directly. */
export function createTrackedProvider(
  realMode: { provider: RealModeSession["provider"]; apiKey: string },
  onCallRecorded: (entry: CostLedgerEntry) => void,
  pricing: PricingTable = openaiPricing,
): RealModeProvider {
  return createLedgerTrackingProvider(
    createOpenAICompatibleProvider(realMode.provider, realMode.apiKey),
    pricing,
    onCallRecorded,
  );
}
```

- **Entry is recorded only on success.** A rejected `embedBatch`/
  `generate` call propagates its rejection to the caller unchanged (so
  every existing error-handling branch in `RetrievalStep.tsx`,
  `VariantsComparison.tsx`, etc. is untouched) and appends nothing to
  the ledger -- directly satisfies spec.md's Edge Case ("a failed call
  that made no billable request should not be added to the total").
- **One entry per underlying call**, not per learner-facing "action" --
  a HyDE run's `hydeCount` hypothesis-generation calls each append their
  own entry as they individually resolve, matching `VariantsComparison
  .tsx`'s existing "one hypothesis becomes visible per completed call"
  behavior (spec.md 002 FR-008) with one ledger entry riding along.
- **Every existing call site changes exactly one line**: replace
  `createOpenAICompatibleProvider(realMode.provider, realMode.apiKey)`
  with `createTrackedProvider(realMode, onCostLedgerAppend)`, where
  `onCostLedgerAppend` is threaded down from `RagConcept.tsx` alongside
  `realMode` itself, the same prop-threading shape already used for
  `generationParams`/`topK`.

## `costEstimate.ts` -- per-configuration embed/generate call breakdown

Mirrors `realMode/callEstimate.ts`'s existing per-configuration switch
exactly, splitting each configuration's total call count (already
defined there) into its embed vs. generate components:

| `configurationId` | embed calls | generate calls | total (must equal `callsPerConfiguration`) |
|---|---|---|---|
| `naive` | 2 (corpus-embed + query-embed) | 1 (final generate) | 3 = `naiveCallCount()` |
| `hyde` | 2 (corpus-embed + hypotheses-batch-embed) | `hydeCount + 1` (hypothesis generates + final generate) | `hydeCount + 3` = `hydeCallCount(hydeCount)` |
| `fusion` | `fusionN + 1` (corpus-embed + N variant-embeds) | 2 (query-rewrite generate + final generate) | `fusionN + 3` = `fusionCallCount(fusionN)` |

```ts
// src/concepts/rag/costLedger/costEstimate.ts
export function embedCallsForConfiguration(id: ConfigurationId, p: { hydeCount: number; fusionN: number }): number {
  switch (id) {
    case "naive": return 2;
    case "hyde": return 2;
    case "fusion": return p.fusionN + 1;
  }
}
export function generateCallsForConfiguration(id: ConfigurationId, p: { hydeCount: number; fusionN: number }): number {
  switch (id) {
    case "naive": return 1;
    case "hyde": return p.hydeCount + 1;
    case "fusion": return 2;
  }
}
export function costEstimateUsd(id: ConfigurationId, p: { hydeCount: number; fusionN: number }, pricing: PricingTable): number {
  return embedCallsForConfiguration(id, p) * pricing.embedCallUsd + generateCallsForConfiguration(id, p) * pricing.generateCallUsd;
}
```

- `embedCallsForConfiguration(id, p) + generateCallsForConfiguration(id, p)
  === callsPerConfiguration(id, p)` (from `callEstimate.ts`) for every
  `id`/`p` -- this identity is exactly what
  `scripts/checks/cost-ledger-sum.ts` (below) verifies isn't just true
  by inspection but holds against a live fixture run.
- Shown to the learner before any real call fires, next to the existing
  call-count estimate text (e.g. "Estimated calls for this run: 4 (~$0.0004)"),
  satisfying FR-003/FR-008 together.

## `scripts/checks/cost-ledger-sum.ts` (SC-002)

Pure-function check, no browser -- same style as `determinism.ts`/
`failure-presets.ts`. For each `configurationId` at a representative
`hydeCount`/`fusionN`:

1. Constructs a fake base `RealModeProvider` whose `embedBatch`/
   `generate` resolve immediately with dummy data (no network).
2. Wraps it with `createLedgerTrackingProvider`, collecting every
   recorded entry into a `SessionCostLedger`.
3. Issues the exact call sequence that configuration's real orchestration
   logic issues (mirroring `runNaive`/`runHyde`/`runFusion`'s call
   order in `VariantsComparison.tsx`).
4. Asserts `sumLedgerUsd(ledger) === costEstimateUsd(configurationId,
   params, pricing)` and `ledgerCallCount(ledger) ===
   callsPerConfiguration(configurationId, params)`.

A mismatch is a **check failure** -- it means the pre-call estimate
shown to the learner (`costEstimateUsd`) and the ledger's actual
post-call total have silently drifted apart, which is precisely the
"cost tracker that silently drifts from reality" roadmap.md calls out
as the reason SC-002 is a hard gate for this milestone, not a
nice-to-have.

## Warning-threshold gate (FR-007, SC-004)

Every real-call-triggering action checks `sumLedgerUsd(costLedger) >=
costLedger.warningThresholdUsd` immediately before constructing/using
its tracked provider. If true, the action renders `CostWarningBanner`
inline (same placement convention as `ErrorBanner.tsx`) instead of
firing the call, showing the current total, the threshold, and a
"Proceed anyway" button; clicking it fires the call exactly as if the
threshold hadn't been crossed. This is a per-action gate, not a global
lock -- crossing the threshold once doesn't disable Real Mode, it just
requires one extra explicit click per action from then on for the rest
of the session (until the learner raises the threshold or resets the
ledger).

## Reset-prompt (FR-006)

`SessionCostLedger.pendingResetPrompt` is set to `true` by any existing
doc-change/reset handler (`onLedgerResetPrompt()` callback, threaded
alongside `costLedger`) and cleared by whichever of `CostLedgerDisplay`'s
two buttons ("Keep accumulating" / "Reset total") the learner clicks;
only "Reset total" also clears `entries`.

## Non-goals

- No per-token metering (research.md's "flat per-call pricing"
  decision) -- `costUsd` on each entry is always one of exactly two
  fixed values from `PricingTable`, never computed from actual response
  size.
- No cross-session/persisted ledger -- resets on refresh
  (research.md/clarify decision), matching the existing API-key
  storage precedent.
