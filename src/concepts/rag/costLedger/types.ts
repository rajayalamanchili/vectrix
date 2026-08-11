/**
 * US2 (004-real-mode-depth): the session-wide cost/call ledger's own
 * data shapes. See specs/004-real-mode-depth/data-model.md and
 * contracts/cost-ledger-contract.md.
 */
export type CallType = "embed" | "generate";

export interface CostLedgerEntry {
  id: string;
  timestamp: number;
  callType: CallType;
  /** pricing.embedCallUsd or pricing.generateCallUsd at the time of this call. */
  costUsd: number;
}

export interface SessionCostLedger {
  entries: CostLedgerEntry[];
  warningThresholdUsd: number;
  /** True right after a doc/pipeline-state change, until the learner answers (FR-006). */
  pendingResetPrompt: boolean;
}

export const DEFAULT_WARNING_THRESHOLD_USD = 1.0;

export function sumLedgerUsd(ledger: SessionCostLedger): number {
  return ledger.entries.reduce((sum, e) => sum + e.costUsd, 0);
}

export function ledgerCallCount(ledger: SessionCostLedger): number {
  return ledger.entries.length;
}
