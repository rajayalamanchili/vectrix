"use client";

import { useEffect, useRef, useState } from "react";
import { StepperNav } from "@/components/ui/StepperNav";
import type { ChunkingStrategy } from "../lib/sampleDocs";
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

export function PipelineWalkthrough() {
  const [stepIndex, setStepIndex] = useState(0);
  const [docId, setDocId] = useState("coffee");
  const [chunkSize, setChunkSize] = useState(60);
  const [overlap, setOverlap] = useState(15);
  const [chunkingStrategy, setChunkingStrategy] = useState<ChunkingStrategy>("fixed");
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(3);
  const [similarityThreshold, setSimilarityThreshold] = useState(0);
  const [results, setResults] = useState<RetrievedChunk[]>([]);

  const stepContentRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  function goTo(i: number) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
  }

  // Switching the active document or the chunking strategy both invalidate
  // any previously computed chunk set, so Generation must never display a
  // prompt built from chunks that no longer exist (spec.md Edge Cases):
  // reset query/results and return to the Document step right in the
  // event handler, rather than reacting after the fact in an effect.
  function handleDocSelect(id: string) {
    setDocId(id);
    setQuery("");
    setResults([]);
    setStepIndex(0);
  }

  function handleChunkingStrategy(s: ChunkingStrategy) {
    setChunkingStrategy(s);
    setQuery("");
    setResults([]);
    setStepIndex(0);
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
      container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      container;
    target.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  return (
    <div className="space-y-6">
      <StepperNav steps={STEPS} activeIndex={stepIndex} onSelect={goTo} />

      <div ref={stepContentRef} tabIndex={-1}>
        {stepIndex === 0 && <DocumentStep docId={docId} onSelect={handleDocSelect} />}
        {stepIndex === 1 && (
          <ChunkingStep
            docId={docId}
            chunkSize={chunkSize}
            overlap={overlap}
            chunkingStrategy={chunkingStrategy}
            onChunkSize={setChunkSize}
            onOverlap={setOverlap}
            onChunkingStrategy={handleChunkingStrategy}
          />
        )}
        {stepIndex === 2 && (
          <EmbeddingStep
            docId={docId}
            chunkSize={chunkSize}
            overlap={overlap}
            chunkingStrategy={chunkingStrategy}
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
