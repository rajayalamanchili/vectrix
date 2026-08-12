"use client";

import { useState } from "react";
import { AgentWalkthrough } from "./walkthrough/AgentWalkthrough";

const TABS = [{ id: "walkthrough", label: "Walkthrough" }] as const;

/** Tab chrome mirroring RagConcept.tsx's TABS pattern (plan.md). Compare
 * Strategies is added as a second tab in a later phase (US3). */
export function AgentsToolUseConcept() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("walkthrough");

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

      {tab === "walkthrough" && <AgentWalkthrough />}
    </div>
  );
}
