"use client";

/**
 * FR-007's pre-call threshold-crossed warning, shown in place of the
 * action that would otherwise fire a real call -- mirrors
 * ErrorBanner.tsx's existing `role="alert"` pattern rather than
 * inventing a new one. Clicking "Proceed anyway" is the one explicit
 * action that lets that specific call through; it does not silently
 * disable the warning for any other action.
 */
export function CostWarningBanner({
  totalUsd,
  thresholdUsd,
  onProceedAnyway,
}: {
  totalUsd: number;
  thresholdUsd: number;
  onProceedAnyway: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm">
      <p className="text-ink-100">
        This session&apos;s estimated real-mode cost (${totalUsd.toFixed(5)}) has crossed your warning
        threshold (${thresholdUsd.toFixed(2)}). This is still just an estimate, not an exact bill.
      </p>
      <div className="mt-3">
        <button
          type="button"
          onClick={onProceedAnyway}
          className="rounded border border-danger bg-danger px-3 py-1.5 text-xs font-medium text-chart-bg transition-colors hover:opacity-90"
        >
          Proceed anyway
        </button>
      </div>
    </div>
  );
}
