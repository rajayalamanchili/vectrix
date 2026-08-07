"use client";

import { useState } from "react";

/** FR-005: pasted custom documents are capped at 10,000 characters, enforced client-side before any API call is made. */
export const MAX_CUSTOM_DOCUMENT_LENGTH = 10_000;

export interface CustomDocumentInputProps {
  mode: "sample" | "custom";
  customText: string;
  customQuestion: string;
  onCustomTextChange: (text: string) => void;
  onCustomQuestionChange: (question: string) => void;
  onUseCustom: () => void;
  onRevertToSample: () => void;
}

/**
 * FR-005's paste-only custom document/question input, gated on Real Mode
 * being active (rendered by `DocumentStep` only when `realMode?.active`).
 * The 10,000-character limit is enforced here, on submit, so a learner's
 * pasted text is never silently truncated (User Story 3 Acceptance
 * Scenario 2) -- the error follows the same correction-in-place pattern
 * as `RealModeToggle`'s key-format error: the input keeps its value, and
 * the error is `aria-describedby`-associated with the textarea.
 */
export function CustomDocumentInput({
  mode,
  customText,
  customQuestion,
  onCustomTextChange,
  onCustomQuestionChange,
  onUseCustom,
  onRevertToSample,
}: CustomDocumentInputProps) {
  const [error, setError] = useState<string | null>(null);
  const overLimit = customText.length > MAX_CUSTOM_DOCUMENT_LENGTH;

  function handleUseCustom() {
    if (customText.trim().length === 0) {
      setError("Paste some document text before using it as the active document.");
      return;
    }
    if (overLimit) {
      setError(
        `This document is ${customText.length.toLocaleString()} characters, over the ${MAX_CUSTOM_DOCUMENT_LENGTH.toLocaleString()}-character limit -- shorten it before using it as the active document.`,
      );
      return;
    }
    setError(null);
    onUseCustom();
  }

  if (mode === "custom") {
    return (
      <div className="rounded-lg border border-doc-teal/40 bg-doc-teal/5 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-doc-teal">Custom document active</span>
          <button
            type="button"
            data-primary-focus="true"
            onClick={onRevertToSample}
            className="shrink-0 rounded border border-chart-line px-2.5 py-1 text-xs text-ink-300 hover:border-ink-500 transition-colors"
          >
            Revert to sample document
          </button>
        </div>
        <p className="text-xs leading-relaxed text-ink-500">
          Every downstream step (Chunking, Embedding, Retrieval, Generation)
          now uses this text and question instead of the built-in sample
          documents.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-chart-line p-4">
      <label htmlFor="custom-doc-text" className="mb-1 block text-xs font-medium text-ink-300">
        Paste your own document (Real Mode)
      </label>
      <textarea
        id="custom-doc-text"
        value={customText}
        onChange={(e) => onCustomTextChange(e.target.value)}
        aria-describedby={error ? "custom-doc-error" : "custom-doc-count"}
        aria-invalid={error ? true : undefined}
        placeholder="Paste up to 10,000 characters of your own text..."
        rows={6}
        className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:border-doc-teal focus:outline-none"
      />
      <p id="custom-doc-count" className={`mt-1 text-xs ${overLimit ? "text-danger" : "text-ink-500"}`}>
        {customText.length.toLocaleString()} / {MAX_CUSTOM_DOCUMENT_LENGTH.toLocaleString()} characters
      </p>

      <label htmlFor="custom-doc-question" className="mb-1 mt-4 block text-xs font-medium text-ink-300">
        Custom question
      </label>
      <input
        id="custom-doc-question"
        value={customQuestion}
        onChange={(e) => onCustomQuestionChange(e.target.value)}
        placeholder="What do you want to ask this document?"
        className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:border-doc-teal focus:outline-none"
      />

      {error && (
        <p id="custom-doc-error" role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleUseCustom}
        className="mt-3 rounded bg-doc-teal/20 px-3 py-2 text-xs font-medium text-doc-teal hover:bg-doc-teal/30 transition-colors"
      >
        Use this document
      </button>
    </div>
  );
}
