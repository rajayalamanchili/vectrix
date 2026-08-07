"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StepperNav } from "@/components/ui/StepperNav";
import type { ChunkingStrategy, SampleDoc } from "../lib/sampleDocs";
import type { RealModeSession } from "../realMode/types";
import { DocumentStep } from "./steps/DocumentStep";
import { ChunkingStep } from "./steps/ChunkingStep";
import { EmbeddingStep } from "./steps/EmbeddingStep";
import { RetrievalStep, type RetrievedChunk } from "./steps/RetrievalStep";
import { GenerationStep } from "./steps/GenerationStep";

const STEPS = [
  { label: "Document" },
  { label: "Chunking" },
  { label: "Embedding" },
  { label: "Retrieval" },
  { label: "Generation" },
];

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function PipelineWalkthrough({
  realMode,
  onRealModeChange,
}: {
  realMode?: RealModeSession;
  onRealModeChange?: (next: RealModeSession) => void;
}) {
  // EmbeddingStep/RetrievalStep read realMode starting in US2; GenerationStep
  // (US4) starts reading it as it's given its own real-execution path.
  const [stepIndex, setStepIndex] = useState(0);
  const [docId, setDocId] = useState("coffee");
  const [chunkSize, setChunkSize] = useState(60);
  const [overlap, setOverlap] = useState(15);
  const [chunkingStrategy, setChunkingStrategy] = useState<ChunkingStrategy>("fixed");
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(3);
  const [similarityThreshold, setSimilarityThreshold] = useState(0);
  const [results, setResults] = useState<RetrievedChunk[]>([]);

  // US3: independent CustomDocumentInput state (data-model.md), owned by
  // this view specifically -- Compare Variants gets its own separate
  // instance later (research.md's independent-state decision), not this
  // one shared across tabs.
  const [customMode, setCustomMode] = useState<"sample" | "custom">("sample");
  const [customText, setCustomText] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");

  const customDoc: SampleDoc | null = useMemo(
    () =>
      customMode === "custom"
        ? {
            id: "custom",
            title: "Custom document",
            text: customText,
            sampleQueries: customQuestion ? [customQuestion] : [],
          }
        : null,
    [customMode, customText, customQuestion],
  );

  const stepContentRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  function goTo(i: number) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
  }

  // Switching the active document invalidates the query and any computed
  // chunk-based state, so Generation must never display a prompt built
  // from a different document's chunks (spec.md Edge Cases): reset
  // query/results and return to the Document step right in the event
  // handler, rather than reacting after the fact in an effect.
  function handleDocSelect(id: string) {
    setDocId(id);
    setQuery("");
    setResults([]);
    setStepIndex(0);
  }

  // Switching to a custom document is the same class of invalidation as
  // switching sample documents (handleDocSelect above): downstream
  // query/results must not survive a document swap (US3 Acceptance
  // Scenario 1; spec.md 001 Edge Cases' existing precedent).
  function handleUseCustomDocument() {
    setCustomMode("custom");
    setQuery("");
    setResults([]);
    setStepIndex(0);
  }

  // Symmetric counterpart (US3 Acceptance Scenario 3): reverting clears
  // the custom text/question entirely -- docId itself was never touched
  // while custom mode was active, so the previously-selected sample
  // document's own question set is restored for free.
  function handleRevertToSample() {
    setCustomMode("sample");
    setCustomText("");
    setCustomQuestion("");
    setQuery("");
    setResults([]);
    setStepIndex(0);
  }

  // A chunking-strategy switch is a lighter invalidation than a document
  // switch (spec.md Edge Cases): Retrieval re-runs against the new chunk
  // set automatically (it derives its own ranking from chunkSize/overlap/
  // chunkingStrategy props), so only the previously-copied `results`
  // snapshot used by Generation needs clearing -- the query text and
  // stepper position must NOT reset, so the learner stays on the
  // Chunking step and sees the new boundaries directly.
  function handleChunkingStrategy(s: ChunkingStrategy) {
    setChunkingStrategy(s);
    setResults([]);
  }

  // Move keyboard focus to the newly active step's first interactive
  // control whenever the step changes -- a stepper jump, Back/Next, or the
  // handlers above resetting back to the Document step. On the Document
  // step specifically, focus the chip for the currently selected document
  // (not necessarily the first chip), so a document-switch reset lands
  // focus on the newly active document, not an arbitrary one.
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const container = stepContentRef.current;
    if (!container) return;
    const target =
      container.querySelector<HTMLElement>(`[data-doc-chip="${docId}"]`) ??
      container.querySelector<HTMLElement>("[data-primary-focus]") ??
      container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      container;
    target.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  return (
    <div className="space-y-6">
      <StepperNav steps={STEPS} activeIndex={stepIndex} onSelect={goTo} />

      <div ref={stepContentRef} tabIndex={-1}>
        {stepIndex === 0 && (
          <DocumentStep
            docId={docId}
            onSelect={handleDocSelect}
            realMode={realMode}
            customDocument={{
              mode: customMode,
              customText,
              customQuestion,
              onCustomTextChange: setCustomText,
              onCustomQuestionChange: setCustomQuestion,
              onUseCustom: handleUseCustomDocument,
              onRevertToSample: handleRevertToSample,
            }}
          />
        )}
        {stepIndex === 1 && (
          <ChunkingStep
            docId={docId}
            chunkSize={chunkSize}
            overlap={overlap}
            chunkingStrategy={chunkingStrategy}
            onChunkSize={setChunkSize}
            onOverlap={setOverlap}
            onChunkingStrategy={handleChunkingStrategy}
            customDoc={customDoc}
          />
        )}
        {stepIndex === 2 && (
          <EmbeddingStep
            docId={docId}
            chunkSize={chunkSize}
            overlap={overlap}
            chunkingStrategy={chunkingStrategy}
            realMode={realMode}
            onRealModeChange={onRealModeChange}
            customDoc={customDoc}
          />
        )}
        {stepIndex === 3 && (
          <RetrievalStep
            docId={docId}
            chunkSize={chunkSize}
            overlap={overlap}
            chunkingStrategy={chunkingStrategy}
            query={query}
            onQuery={setQuery}
            topK={topK}
            onTopK={setTopK}
            similarityThreshold={similarityThreshold}
            onSimilarityThreshold={setSimilarityThreshold}
            onResults={(r) => {
              setResults(r);
              goTo(4);
            }}
            realMode={realMode}
            onRealModeChange={onRealModeChange}
            customDoc={customDoc}
          />
        )}
        {stepIndex === 4 && <GenerationStep query={query} results={results} />}
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0}
          className="rounded border border-chart-line px-4 py-2 text-sm text-ink-300 disabled:opacity-30 hover:border-ink-500 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => goTo(stepIndex + 1)}
          disabled={stepIndex === STEPS.length - 1}
          className="rounded bg-doc-teal/20 px-4 py-2 text-sm font-medium text-doc-teal disabled:opacity-30 hover:bg-doc-teal/30 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
