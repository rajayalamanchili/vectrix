"use client";

import type { RealModeError } from "./types";

/**
 * Shared Real Mode failure UI (FR-007): a clear, specific message plus a
 * fallback-to-Simulated-Mode action, announced via `role="alert"` so a
 * learner not focused on this element still hears it (FR-015).
 *
 * Retry, when provided, MUST re-issue only the one call named by
 * `error.stage` -- never the whole multi-call sequence (FR-007,
 * data-model.md's "Retry resumes at stage, it never restarts the
 * sequence"). Callers are responsible for that resume behavior; this
 * component only renders the action.
 */
export function ErrorBanner({
  error,
  onRetry,
  onFallbackToSimulated,
}: {
  error: RealModeError;
  onRetry?: () => void;
  onFallbackToSimulated: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm"
    >
      <p className="text-ink-100">{error.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/15 transition-colors"
          >
            Retry
          </button>
        )}
        <button
          onClick={onFallbackToSimulated}
          className="rounded border border-chart-line px-3 py-1.5 text-xs font-medium text-ink-300 hover:text-ink-100 transition-colors"
        >
          Switch to Simulated Mode
        </button>
      </div>
    </div>
  );
}
