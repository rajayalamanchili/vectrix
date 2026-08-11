"use client";

import { useState } from "react";
import { buildPermalinkParams, type PermalinkSourceState } from "./permalinkParams";

/**
 * "Generate permalink" action (US2, contracts/permalink-contract.md):
 * copies a shareable URL to the clipboard and announces success via an
 * `aria-live="polite"` region. Shows an always-visible exclusion notice
 * whenever a custom document is active (FR-007), not only after the
 * first generation.
 */
export function PermalinkButton({ state }: { state: PermalinkSourceState }) {
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    const params = buildPermalinkParams(state);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void handleGenerate()}
        className="rounded border border-doc-teal/40 px-3 py-1.5 text-xs font-medium text-doc-teal transition-colors hover:bg-doc-teal/10"
      >
        Generate permalink
      </button>
      <span role="status" aria-live="polite" className="text-xs text-ink-500">
        {copied ? "Copied to clipboard" : ""}
      </span>
      {state.customMode === "custom" && (
        <span className="text-xs italic text-ink-500">
          Your custom document text isn&apos;t included in the link -- only sample documents can be shared this way.
        </span>
      )}
    </div>
  );
}
