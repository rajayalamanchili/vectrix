"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StepperNav } from "@/components/ui/StepperNav";
import type { ChunkingStrategy, SampleDoc } from "../lib/sampleDocs";
import type { GenerationParams, RealModeSession } from "../realMode/types";
import { DocumentStep } from "./steps/DocumentStep";
import { ChunkingStep } from "./steps/ChunkingStep";
import { EmbeddingStep } from "./steps/EmbeddingStep";
import { RetrievalStep, type RetrievedChunk } from "./steps/RetrievalStep";
import { GenerationStep } from "./steps/GenerationStep";
import { parsePermalinkParams } from "../permalink/permalinkParams";
import { PermalinkButton } from "../permalink/PermalinkButton";
import { FailurePresetPicker } from "../failurePresets/FailurePresetPicker";
import type { FailurePreset } from "../failurePresets/failurePresets";

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
  generationParams,
  onGenerationParamsChange,
  topK,
  onTopKChange,
}: {
  realMode?: RealModeSession;
  onRealModeChange?: (next: RealModeSession) => void;
  generationParams?: GenerationParams;
  onGenerationParamsChange?: (next: GenerationParams) => void;
  /** Lifted to RagConcept.tsx (US6/FR-011) so EvalPanel's recall@K scoring reuses this exact value. */
  topK: number;
  onTopKChange: (k: number) => void;
}) {
  // 003-parameter-exploration US2: a permalink's parameters are read
  // synchronously during the very first render (contracts/permalink-
  // contract.md's "on mount only" requirement) via each field's own
  // useState lazy initializer -- not an effect calling local setState,
  // which `react-hooks/set-state-in-effect` correctly flags as the
  // wrong tool for "initialize state once from an external source read
  // during render" (React's own guidance: derive during render, don't
  // synchronize in an effect). `initialParsed` itself is captured once
  // via the same lazy-initializer trick, since `useSearchParams()`'s
  // value is available on this very first render already.
  const searchParams = useSearchParams();
  const [initialParsed] = useState(() => parsePermalinkParams(searchParams));

  // EmbeddingStep/RetrievalStep read realMode starting in US2; GenerationStep
  // (US4) reads both realMode and generationParams for its own real-execution path.
  const [stepIndex, setStepIndex] = useState(0);
  const [docId, setDocId] = useState(() => initialParsed.docId ?? "coffee");
  const [chunkSize, setChunkSize] = useState(() => initialParsed.chunkSize ?? 60);
  const [overlap, setOverlap] = useState(() => initialParsed.overlap ?? 15);
  const [chunkingStrategy, setChunkingStrategy] = useState<ChunkingStrategy>(
    () => initialParsed.chunkingStrategy ?? "fixed",
  );
  const [query, setQuery] = useState(() => initialParsed.query ?? "");
  const [similarityThreshold, setSimilarityThreshold] = useState(() => initialParsed.similarityThreshold ?? 0);
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

  // 003-parameter-exploration US2: a document named by a permalink that
  // no longer matches any shipped sampleDocs id (Edge Cases) -- shown as
  // a dismissible banner rather than silently substituting a document.
  const [docNotFoundMessage, setDocNotFoundMessage] = useState<string | null>(
    () => initialParsed.docNotFound ?? null,
  );

  // 003-parameter-exploration US3: which failure preset (if any) is
  // currently loaded, so its explanation can stay visible alongside the
  // picker (FR-009) -- null for the default state, a swept state, or a
  // permalink-loaded state, none of which are a preset.
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // The remaining permalink fields (`mode`, `topK`, and the Real-Mode
  // generation params) are owned by the parent (RagConcept.tsx), not
  // this component -- applying them means calling the parent's own
  // setters, which is exactly the "update an external system" case an
  // effect is for (as opposed to the local fields above, which are
  // derived during render instead). Runs once on mount only, per
  // contracts/permalink-contract.md.
  useEffect(() => {
    if (initialParsed.topK !== undefined) onTopKChange(initialParsed.topK);

    if (initialParsed.mode !== undefined && realMode && onRealModeChange) {
      onRealModeChange({ ...realMode, active: initialParsed.mode === "real" });
    }
    if (
      (initialParsed.temperature !== undefined ||
        initialParsed.fusionN !== undefined ||
        initialParsed.hydeCount !== undefined) &&
      generationParams &&
      onGenerationParamsChange
    ) {
      onGenerationParamsChange({
        temperature: initialParsed.temperature ?? generationParams.temperature,
        fusionN: initialParsed.fusionN ?? generationParams.fusionN,
        hydeCount: initialParsed.hydeCount ?? generationParams.hydeCount,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 003-parameter-exploration US1: clicking a sweep point jumps the
  // pipeline to that exact chunk size -- the same "lighter invalidation,
  // no stepper reset" precedent as handleChunkingStrategy above
  // (contracts/sweep-contract.md's caller contract).
  function handleSweepJump(size: number) {
    setChunkSize(size);
    setResults([]);
  }

  // 003-parameter-exploration US3: loading a failure preset applies
  // every field in one update (mirroring handleDocSelect's existing
  // all-at-once reset pattern above) and jumps straight to Retrieval so
  // the failure is immediately visible (data-model.md's FailurePreset
  // caller contract).
  function handleSelectPreset(preset: FailurePreset) {
    setDocId(preset.docId);
    setCustomMode("sample");
    setChunkSize(preset.chunkSize);
    setOverlap(preset.overlap);
    setChunkingStrategy(preset.chunkingStrategy);
    setSimilarityThreshold(preset.similarityThreshold);
    onTopKChange(preset.topK);
    setQuery(preset.query);
    setResults([]);
    setDocNotFoundMessage(null);
    setActivePresetId(preset.id);
    goTo(3);
  }

  // FR-010: reachable from any state (default, preset-loaded, swept, or
  // permalink-loaded) and restores exactly this component's own initial
  // useState values (data-model.md) -- not itself a FailurePreset value.
  function handleResetToDefaults() {
    setDocId("coffee");
    setCustomMode("sample");
    setCustomText("");
    setCustomQuestion("");
    setChunkSize(60);
    setOverlap(15);
    setChunkingStrategy("fixed");
    setSimilarityThreshold(0);
    setQuery("");
    setResults([]);
    setDocNotFoundMessage(null);
    setActivePresetId(null);
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
      {docNotFoundMessage && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-ink-100">
          <p>
            The document &quot;{docNotFoundMessage}&quot; from this link no longer exists -- showing the default
            document instead.
          </p>
          <button
            type="button"
            onClick={() => setDocNotFoundMessage(null)}
            className="shrink-0 rounded border border-chart-line px-2 py-1 text-xs text-ink-300 hover:text-ink-100 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {realMode && generationParams && (
        <PermalinkButton
          state={{
            realMode,
            generationParams,
            docId,
            customMode,
            chunkSize,
            overlap,
            chunkingStrategy,
            similarityThreshold,
            topK,
            query,
          }}
        />
      )}

      <FailurePresetPicker
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onReset={handleResetToDefaults}
      />

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
            onTopK={onTopKChange}
            similarityThreshold={similarityThreshold}
            onSimilarityThreshold={setSimilarityThreshold}
            onResults={(r) => {
              setResults(r);
              goTo(4);
            }}
            realMode={realMode}
            onRealModeChange={onRealModeChange}
            customDoc={customDoc}
            onSweepJump={handleSweepJump}
          />
        )}
        {stepIndex === 4 && (
          <GenerationStep
            query={query}
            results={results}
            realMode={realMode}
            onRealModeChange={onRealModeChange}
            params={generationParams}
            onParamsChange={onGenerationParamsChange}
          />
        )}
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
