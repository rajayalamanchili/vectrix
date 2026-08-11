/**
 * Pre-call dollar-cost disclosure (FR-003, FR-008) -- splits each
 * configuration's total call count (already defined in
 * realMode/callEstimate.ts's callsPerConfiguration) into its embed vs.
 * generate components, so a dollar figure can be shown next to the
 * existing call-count estimate. See contracts/cost-ledger-contract.md's
 * breakdown table.
 */
import type { ConfigurationId } from "../realMode/types";
import type { PricingTable } from "./pricing";

export function embedCallsForConfiguration(
  configurationId: ConfigurationId,
  params: { hydeCount: number; fusionN: number },
): number {
  switch (configurationId) {
    case "naive":
      return 2;
    case "hyde":
      return 2;
    case "fusion":
      return params.fusionN + 1;
  }
}

export function generateCallsForConfiguration(
  configurationId: ConfigurationId,
  params: { hydeCount: number; fusionN: number },
): number {
  switch (configurationId) {
    case "naive":
      return 1;
    case "hyde":
      return params.hydeCount + 1;
    case "fusion":
      return 2;
  }
}

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
