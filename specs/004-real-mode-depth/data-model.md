# Data Model: Real Mode Depth -- Comparison & Cost Tracking

**Feature**: `004-real-mode-depth` | **Date**: 2026-08-10

All types are client-side/in-memory, no persistence layer -- consistent
with every prior milestone (no backend exists in this project). Both
new types below extend `src/concepts/rag/realMode/types.ts`'s existing
shapes (`ConfigurationId`, `RetrievedChunk`, `RealModeError`,
`RealModeSession`) rather than duplicating them.

## ComparisonResult / ChunkRankPair (US1)

```ts
// src/concepts/rag/compareReal/types.ts
import type { ConfigurationId, RealModeError } from "../realMode/types";
import type { RetrievedChunk } from "../pipeline/steps/RetrievalStep";

export interface ChunkRankPair {
  chunkId: string;
  /** 1-based rank, or null if the chunk didn't clear Top-K/threshold on this side, or this side hasn't run yet. */
  simulatedRank: number | null;
  realRank: number | null;
}

export type RealHalfStatus = "needs-key" | "awaiting-confirmation" | "running" | "done" | "error";

export interface ComparisonResult {
  configurationId: ConfigurationId; // "naive" | "hyde" | "fusion"
  docId: string;
  query: string;

  /** Always the naive-RAG simulated ranking, regardless of configurationId (research.md). */
  simulatedRanking: RetrievedChunk[];
  /** true whenever configurationId !== "naive" -- drives the disclosure caveat (FR-004, check:disclosure). */
  simulatedIsApproximation: boolean;

  realRanking: RetrievedChunk[] | null;
  realStatus: RealHalfStatus;
  realError: RealModeError | null;
  /** Real-side call count, shown pre-execution per FR-003 (spec.md 002 FR-010's pattern). */
  realCallEstimate: number;

  /** Merged by chunk id, in Simulated rank order -- what FR-002's side-by-side table renders. */
  pairs: ChunkRankPair[];
}
```

- `simulatedRanking`/`pairs` are computed synchronously and
  deterministically the moment a document/query/configuration is chosen
  -- no loading state on the Simulated side, ever (Constitution
  Principle V; mirrors `RetrievalStep.tsx`'s existing simulated-path
  behavior).
- `realStatus` starts at `"needs-key"` whenever `realMode.apiKey` is
  null (FR-004a's inline-prompt behavior lives in the UI layer, reading
  this status), moves to `"awaiting-confirmation"` once a key exists and
  the learner activates the Real half (FR-003's disclosure gate), then
  `"running"` -> `"done"` or `"error"`.
- `pairs` is recomputed whenever either `simulatedRanking` or
  `realRanking` changes -- a chunk present in only one side gets `null`
  for the other side's rank (Acceptance Scenario 2's example: "chunk #2:
  ranked 1st in Real, ranked 3rd in Simulated" -- and the inverse, a
  chunk only Simulated retrieved).
- Re-running the Real half for the same document/question (Edge Cases:
  repeated runs) replaces `realRanking`/`pairs` wholesale; `simulatedRanking`
  never changes for a fixed document/query/configuration, by construction
  (Constitution Principle V) -- this asymmetry is what the comparison
  view surfaces, per spec.md's Edge Cases entry.

## SessionCostLedger / CostLedgerEntry (US2)

```ts
// src/concepts/rag/costLedger/types.ts
export type CallType = "embed" | "generate";

export interface CostLedgerEntry {
  id: string;           // crypto.randomUUID()
  timestamp: number;
  callType: CallType;
  costUsd: number;      // pricing.embedCallUsd or pricing.generateCallUsd at time of the call
}

export interface SessionCostLedger {
  entries: CostLedgerEntry[];
  warningThresholdUsd: number;     // learner-configurable; DEFAULT_WARNING_THRESHOLD_USD if never set
  pendingResetPrompt: boolean;     // true right after a doc/pipeline-state change, until the learner answers (FR-006)
}

export const DEFAULT_WARNING_THRESHOLD_USD = 1.0;

export function sumLedgerUsd(ledger: SessionCostLedger): number {
  return ledger.entries.reduce((sum, e) => sum + e.costUsd, 0);
}

export function ledgerCallCount(ledger: SessionCostLedger): number {
  return ledger.entries.length;
}
```

- `entries` is append-only within a session; the only two ways it
  shrinks are a full reset (learner answers "Reset total" to the
  FR-006 prompt) or a page refresh (research.md's in-memory-only
  decision -- the whole ledger, not just `entries`, is gone).
- One `CostLedgerEntry` is appended per **successful** underlying
  `embedBatch`/`generate` call, by `createLedgerTrackingProvider`
  (contracts/cost-ledger-contract.md) -- never per learner-facing
  "action" (a HyDE run with `hydeCount=2` appends 4 entries: 1
  corpus-embed + 2 hypothesis-generate + 1 hypotheses-batch-embed... the
  exact breakdown per configuration is `costEstimate.ts`'s
  `embedCallsForConfiguration`/`generateCallsForConfiguration`, mirroring
  `callEstimate.ts`'s existing per-configuration switch). A call that
  rejects appends nothing (Edge Cases: "a failed call that made no
  billable request should not be added").
- `pendingResetPrompt` is a single flag, not a queue -- if multiple
  doc-change events fire before the learner answers, the prompt simply
  stays visible; answering it once clears it regardless of how many
  triggers fired.

## PricingTable (US2)

```ts
// src/concepts/rag/costLedger/pricing.ts
export interface PricingTable {
  providerId: string;
  /** Shown verbatim in the UI next to every cost figure (FR-008's "pricing-assumption basis named"). */
  label: string;
  embedCallUsd: number;
  generateCallUsd: number;
}

export const openaiPricing: PricingTable = {
  providerId: "openai",
  label: "OpenAI, text-embedding-3-small / gpt-4o-mini -- assumes ~500 tokens/embed call, ~400 input + ~150 output tokens/generate call",
  embedCallUsd: 0.00001,
  generateCallUsd: 0.00015,
};
```

- Exactly one shipped value this milestone (matching Milestone 2's "one
  shipped, wired-in provider" scope) -- keyed by `providerId` so a
  second provider's pricing is a new object, not new code, same
  extensibility shape as `ProviderConfig` itself.
- `label` is what every cost display renders alongside a dollar figure
  (FR-008) -- never just the number alone.

## `costEstimate.ts` (US2 -- pre-call disclosure)

```ts
// src/concepts/rag/costLedger/costEstimate.ts
import type { ConfigurationId } from "../realMode/types";
import type { PricingTable } from "./pricing";

export function embedCallsForConfiguration(configurationId: ConfigurationId, params: { hydeCount: number; fusionN: number }): number { /* naive: 2 (corpus + query), hyde: 2 (corpus + hypotheses-batch), fusion: fusionN + 1 (corpus + N variants) -- see contracts/cost-ledger-contract.md */ }
export function generateCallsForConfiguration(configurationId: ConfigurationId, params: { hydeCount: number; fusionN: number }): number { /* naive: 1, hyde: hydeCount + 1, fusion: 2 -- see contracts/cost-ledger-contract.md */ }

export function costEstimateUsd(
  configurationId: ConfigurationId,
  params: { hydeCount: number; fusionN: number },
  pricing: PricingTable,
): number {
  return (
    embedCallsForConfiguration(configurationId, params) * pricing.embedCallUsd +
    generateCallsForConfiguration(configurationId, params) * pricing.generateCallUsd
  );
}
```

- `embedCallsForConfiguration(id) + generateCallsForConfiguration(id) ===
  callsPerConfiguration(id, params)` from the existing
  `realMode/callEstimate.ts` for every `configurationId` -- this
  identity is what `scripts/checks/cost-ledger-sum.ts` (SC-002) verifies
  against a live fixture run, not just by construction.
- Shown to the learner **before** a real call fires (same placement as
  `VariantsComparison.tsx`'s existing "Estimated calls for this run:"
  text) -- FR-003/FR-008 both require the estimate up front, in dollars
  this time as well as call count.
