"use client";

import { useState } from "react";
import { PipelineWalkthrough } from "./pipeline/PipelineWalkthrough";
import { VariantsComparison } from "./variants/VariantsComparison";
import { RealModeToggle } from "./realMode/RealModeToggle";
import { openaiProviderConfig } from "./realMode/providerConfigs";
import type { GenerationParams, RealModeSession } from "./realMode/types";

const TABS = [
  { id: "pipeline", label: "Pipeline Walkthrough" },
  { id: "variants", label: "Compare Variants" },
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

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-chart-line">
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
        />
      )}
      {tab === "variants" && (
        <VariantsComparison
          realMode={realMode}
          onRealModeChange={setRealMode}
          generationParams={generationParams}
          onGenerationParamsChange={setGenerationParams}
        />
      )}
    </div>
  );
}
