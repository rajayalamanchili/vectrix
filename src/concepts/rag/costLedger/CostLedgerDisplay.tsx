"use client";

/**
 * FR-005's always-visible running total + call count (rendered in
 * RagConcept.tsx's chrome, next to RealModeToggle, so it's reachable
 * from every step/view without separate navigation -- Constitution
 * Principle IV). FR-006's reset-prompt banner renders whenever
 * `pendingResetPrompt` is true; only "Reset total" clears `entries`,
 * "Keep accumulating" just dismisses the prompt. FR-007's warning
 * threshold is learner-configurable here, defaulting to
 * DEFAULT_WARNING_THRESHOLD_USD.
 */
import { sumLedgerUsd, ledgerCallCount, type SessionCostLedger } from "./types";
import { openaiPricing } from "./pricing";

export function CostLedgerDisplay({
  ledger,
  onThresholdChange,
  onKeepAccumulating,
  onResetTotal,
}: {
  ledger: SessionCostLedger;
  onThresholdChange: (v: number) => void;
  onKeepAccumulating: () => void;
  onResetTotal: () => void;
}) {
  const totalUsd = sumLedgerUsd(ledger);
  const callCount = ledgerCallCount(ledger);

  return (
    <div className="mb-4 rounded-md border border-chart-line/60 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        <span data-cost-ledger-total="true" className="font-mono text-ink-100">
          Session cost: ${totalUsd.toFixed(5)} ({callCount} call{callCount === 1 ? "" : "s"})
        </span>
        <span className="text-ink-500 italic">Estimate only -- {openaiPricing.label}.</span>
        <label className="ml-auto flex items-center gap-1.5 text-ink-300">
          Warn above $
          <input
            type="number"
            min={0}
            step={0.1}
            value={ledger.warningThresholdUsd}
            onChange={(e) => onThresholdChange(Math.max(0, Number(e.target.value) || 0))}
            aria-label="Cumulative real-mode cost warning threshold, in dollars"
            className="w-20 rounded border border-chart-line bg-chart-bg px-2 py-1 text-ink-100 focus:border-doc-teal focus:outline-none"
          />
        </label>
      </div>

      {ledger.pendingResetPrompt && (
        <div role="alert" className="mt-3 rounded border border-query-amber/40 bg-query-amber/10 p-3">
          <p className="text-ink-100">
            Keep accumulating the session cost total, or reset it to zero?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onKeepAccumulating}
              className="rounded border border-chart-line px-3 py-1.5 text-xs text-ink-300 transition-colors hover:text-ink-100"
            >
              Keep accumulating
            </button>
            <button
              type="button"
              onClick={onResetTotal}
              className="rounded border border-query-amber/40 px-3 py-1.5 text-xs font-medium text-query-amber transition-colors hover:bg-query-amber/15"
            >
              Reset total
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
