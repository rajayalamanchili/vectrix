"use client";

/**
 * FR-007's warning-threshold gate mechanism (research.md), shared by
 * every real-call-triggering action so each call site's own change stays
 * a one-guard-condition addition rather than reinventing the arming
 * logic per file. `callKey` must capture exactly the inputs that would
 * produce a new real call (document, chunk settings, retry token, etc.)
 * so a genuinely new action re-arms the gate, while re-rendering for an
 * unrelated reason does not.
 */
import { useState } from "react";
import { sumLedgerUsd, type SessionCostLedger } from "./types";

export function isOverBudget(costLedger?: SessionCostLedger): boolean {
  return Boolean(costLedger && sumLedgerUsd(costLedger) >= costLedger.warningThresholdUsd);
}

export function useCostGate(costLedger: SessionCostLedger | undefined, callKey: string) {
  const [armedKey, setArmedKey] = useState<string | null>(null);
  const blocked = isOverBudget(costLedger) && armedKey !== callKey;
  return {
    blocked,
    proceed: () => setArmedKey(callKey),
  };
}
