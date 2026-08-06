"use client";

import { useState, type FormEvent } from "react";
import type { RealModeSession } from "./types";

/**
 * FR-002's toggle plus FR-003's key-entry prompt. The prompt (disclaimer
 * + key input) shows whenever Real Mode is active and no *accepted* key
 * exists yet -- either because none has been submitted this session, or
 * because the last live call rejected the one on file (kind
 * "invalid-key", data-model.md's "Correcting a rejected key, in place").
 * Once a key is accepted, re-toggling Real Mode off and on again does
 * NOT re-show the prompt (User Story 1 Acceptance Scenario 3) -- the
 * prompt only reappears while `apiKey` is still null or under a live
 * rejection.
 */
export function RealModeToggle({
  realMode,
  onRealModeChange,
}: {
  realMode: RealModeSession;
  onRealModeChange: (next: RealModeSession) => void;
}) {
  const [draftKey, setDraftKey] = useState(realMode.apiKey ?? "");
  const [attempted, setAttempted] = useState(false);

  const liveRejection = realMode.error?.kind === "invalid-key" ? realMode.error : null;
  const formatValid = realMode.provider.keyFormatPattern.test(draftKey);
  const showFormatError = attempted && !formatValid;
  // A format error (local, pre-call) takes precedence over a stale live
  // rejection once the learner starts correcting the value -- both are
  // never shown at once, per data-model.md's "same key-input error slot".
  const displayedError = showFormatError
    ? `That doesn't look like a valid ${realMode.provider.label} API key -- check for typos or extra spaces.`
    : liveRejection?.message ?? null;

  const needsKey = realMode.active && (realMode.apiKey === null || liveRejection !== null);
  const isCorrection = realMode.apiKey !== null && liveRejection !== null;

  function handleToggle() {
    onRealModeChange({ ...realMode, active: !realMode.active });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (!formatValid) return;
    onRealModeChange({ ...realMode, apiKey: draftKey, error: null });
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        role="switch"
        aria-checked={realMode.active}
        onClick={handleToggle}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          realMode.active
            ? "border-doc-teal bg-doc-teal/15 text-doc-teal"
            : "border-chart-line text-ink-500 hover:text-ink-300"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${realMode.active ? "bg-doc-teal" : "bg-ink-500"}`}
        />
        Real Mode
      </button>

      {needsKey && (
        <div className="mt-3 max-w-md rounded-lg border border-chart-line bg-chart-bg-raised p-4">
          <div data-key-disclaimer="true" className="space-y-2 text-xs leading-relaxed text-ink-300">
            <p>
              <strong className="text-ink-100">Where your key goes:</strong> Sent directly from
              this browser to {realMode.provider.label}&apos;s API -- never to any server this
              project runs (there isn&apos;t one). Held in memory for this browser tab only;
              closing or refreshing the tab clears it immediately.
            </p>
            <p>
              <strong className="text-ink-100">Use at your own risk:</strong> Entering any API
              key into a web page carries some inherent risk no client-side app can fully
              remove -- e.g. a browser extension with page access could read it while active. Use
              a key you&apos;re comfortable exposing this way, ideally one with a low spending
              limit.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-2">
            <label htmlFor="real-mode-key-input" className="block text-xs font-medium text-ink-300">
              {isCorrection ? `Correct your ${realMode.provider.label} API key` : `${realMode.provider.label} API key`}
            </label>
            <input
              id="real-mode-key-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              aria-describedby={displayedError ? "real-mode-key-error" : undefined}
              aria-invalid={displayedError ? true : undefined}
              className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 focus:border-doc-teal focus:outline-none"
            />
            {displayedError && (
              <p id="real-mode-key-error" className="text-xs text-danger">
                {displayedError}
              </p>
            )}
            <button
              type="submit"
              className="rounded bg-doc-teal/20 px-3 py-1.5 text-xs font-medium text-doc-teal hover:bg-doc-teal/30 transition-colors"
            >
              {isCorrection ? "Save key" : "Activate Real Mode"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
