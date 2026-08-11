/**
 * Cost ledger as a `RealModeProvider` decorator (research.md) --
 * wraps `embedBatch`/`generate` with the same signatures, appending
 * exactly one `CostLedgerEntry` immediately after each underlying call
 * resolves successfully. A rejected call propagates unchanged and
 * records nothing (Edge Cases: "a failed call that made no billable
 * request should not be added to the total"). See
 * contracts/cost-ledger-contract.md.
 */
import type { RealModeProvider, RealModeSession } from "../realMode/types";
import { createOpenAICompatibleProvider } from "../realMode/openaiCompatibleProvider";
import { openaiPricing, type PricingTable } from "./pricing";
import type { CostLedgerEntry } from "./types";

export function createLedgerTrackingProvider(
  base: RealModeProvider,
  pricing: PricingTable,
  onCallRecorded: (entry: CostLedgerEntry) => void,
): RealModeProvider {
  return {
    async embedBatch(texts) {
      const result = await base.embedBatch(texts);
      onCallRecorded({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        callType: "embed",
        costUsd: pricing.embedCallUsd,
      });
      return result;
    },
    async generate(prompt, opts) {
      const result = await base.generate(prompt, opts);
      onCallRecorded({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        callType: "generate",
        costUsd: pricing.generateCallUsd,
      });
      return result;
    },
  };
}

/** Convenience wrapper every real-call site uses instead of createOpenAICompatibleProvider() directly. */
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
