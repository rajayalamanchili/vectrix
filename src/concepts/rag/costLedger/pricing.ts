/**
 * Flat, static per-call pricing (research.md's "Flat per-call pricing,
 * not per-token metering" decision) -- derived once from published
 * per-token rates and a documented assumed typical call size, since
 * openaiCompatibleProvider.ts doesn't parse response `usage` fields
 * today. `label` is what every cost figure in the UI renders alongside
 * the dollar amount (FR-008) -- never just the number alone.
 */
export interface PricingTable {
  providerId: string;
  label: string;
  embedCallUsd: number;
  generateCallUsd: number;
}

export const openaiPricing: PricingTable = {
  providerId: "openai",
  label:
    "OpenAI, text-embedding-3-small / gpt-4o-mini -- assumes ~500 tokens/embed call, ~400 input + ~150 output tokens/generate call",
  embedCallUsd: 0.00001,
  generateCallUsd: 0.00015,
};
