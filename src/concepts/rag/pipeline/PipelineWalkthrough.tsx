"use client";

import { useState } from "react";
import { StepperNav } from "@/components/ui/StepperNav";
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

export function PipelineWalkthrough() {
  const [stepIndex, setStepIndex] = useState(0);
  const [docId, setDocId] = useState("coffee");
  const [chunkSize, setChunkSize] = useState(60);
  const [overlap, setOverlap] = useState(15);
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(3);
  const [results, setResults] = useState<RetrievedChunk[]>([]);

  function goTo(i: number) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
  }

  return (
    <div className="space-y-6">
      <StepperNav steps={STEPS} activeIndex={stepIndex} onSelect={goTo} />

      {stepIndex === 0 && <DocumentStep docId={docId} onSelect={setDocId} />}
      {stepIndex === 1 && (
        <ChunkingStep
          docId={docId}
          chunkSize={chunkSize}
          overlap={overlap}
          onChunkSize={setChunkSize}
          onOverlap={setOverlap}
        />
      )}
      {stepIndex === 2 && <EmbeddingStep docId={docId} chunkSize={chunkSize} overlap={overlap} />}
      {stepIndex === 3 && (
        <RetrievalStep
          docId={docId}
          chunkSize={chunkSize}
          overlap={overlap}
          query={query}
          onQuery={setQuery}
          topK={topK}
          onTopK={setTopK}
          onResults={(r) => {
            setResults(r);
            goTo(4);
          }}
        />
      )}
      {stepIndex === 4 && <GenerationStep query={query} results={results} />}

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
