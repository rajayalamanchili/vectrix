"use client";

import { useState } from "react";
import { PipelineWalkthrough } from "./pipeline/PipelineWalkthrough";
import { VariantsComparison } from "./variants/VariantsComparison";
import { CompareSimulatedVsReal } from "./compareReal/CompareSimulatedVsReal";
import { RealModeToggle } from "./realMode/RealModeToggle";
import { openaiProviderConfig } from "./realMode/providerConfigs";
import type { GenerationParams, RealModeSession } from "./realMode/types";

const TABS = [
  { id: "pipeline", label: "Pipeline Walkthrough" },
  { id: "variants", label: "Compare Variants" },
  { id: "compare-real", label: "Compare Simulated vs Real" },
] as const;

// Real Mode is inactive by default -- every downstream prop threading
// through this state therefore defaults to Simulated Mode, which is
// what makes SC-002 (002-spec)'s "Simulated Mode stays fully unaffected"
// true by construction rather than a separately-maintained code path.
const INACTIVE_REAL_MODE_SESSION: RealModeSession = {
  active: false,
  provider: openaiProviderConfig,
  apiKey: null,
  error: null,
};

const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  temperature: 0.3,
  fusionN: 3,
  hydeCount: 1,
};

export function RagConcept() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pipeline");
  const [realMode, setRealMode] = useState<RealModeSession>(INACTIVE_REAL_MODE_SESSION);
  const [generationParams, setGenerationParams] = useState<GenerationParams>(DEFAULT_GENERATION_PARAMS);
  // generationParams/setGenerationParams are lifted here (T008); the
  // temperature control threads them to GenerationStep starting in US4.
  // VariantsComparison's HyDE/RAG-Fusion N/hydeCount controls (US5) will
  // read the same state.

  // topK is lifted here (US6/FR-011, per the 2026-08-05 /speckit.clarify
  // resolution: recall@K reuses the pipeline's existing Top-K slider
  // rather than a separate eval-only parameter) so EvalPanel.tsx's
  // recall@K scoring reads and can adjust the exact same value the
  // Retrieval step's own slider controls.
  const [topK, setTopK] = useState(3);

  return (
    <div>
      {/* Ambient, page-level cue for Real Mode's on/off state (distinct
          from the toggle's own styling) so the mode is legible at a
          glance from anywhere on the page, not just when looking
          directly at the toggle -- Constitution Principle II, this
          project's own "never blur simulated vs. real" rule. */}
      <div
        aria-hidden="true"
        className={`mb-4 h-1 rounded-full transition-colors ${realMode.active ? "bg-doc-teal" : "bg-transparent"}`}
      />

      <div
        className={`mb-6 flex gap-1 border-b transition-colors ${realMode.active ? "border-doc-teal/40" : "border-chart-line"}`}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-query-amber text-ink-100"
                : "border-transparent text-ink-500 hover:text-ink-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <RealModeToggle realMode={realMode} onRealModeChange={setRealMode} />

      {tab === "pipeline" && (
        <PipelineWalkthrough
          realMode={realMode}
          onRealModeChange={setRealMode}
          generationParams={generationParams}
          onGenerationParamsChange={setGenerationParams}
          topK={topK}
          onTopKChange={setTopK}
        />
      )}
      {tab === "variants" && (
        <VariantsComparison
          realMode={realMode}
          onRealModeChange={setRealMode}
          generationParams={generationParams}
          onGenerationParamsChange={setGenerationParams}
          topK={topK}
          onTopKChange={setTopK}
        />
      )}
      {tab === "compare-real" && (
        <CompareSimulatedVsReal
          realMode={realMode}
          onRealModeChange={setRealMode}
          generationParams={generationParams}
          topK={topK}
        />
      )}
    </div>
  );
}
