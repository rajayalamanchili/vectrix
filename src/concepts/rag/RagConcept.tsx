"use client";

import { useState } from "react";
import { PipelineWalkthrough } from "./pipeline/PipelineWalkthrough";
import { VariantsComparison } from "./variants/VariantsComparison";

const TABS = [
  { id: "pipeline", label: "Pipeline Walkthrough" },
  { id: "variants", label: "Compare Variants" },
] as const;

export function RagConcept() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pipeline");

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

      {tab === "pipeline" && <PipelineWalkthrough />}
      {tab === "variants" && <VariantsComparison />}
    </div>
  );
}
