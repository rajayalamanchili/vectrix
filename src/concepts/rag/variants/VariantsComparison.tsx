"use client";

import { useState } from "react";
import { ragVariants } from "./variantData";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { FlowDiagram } from "@/components/charts/FlowDiagram";

export function VariantsComparison() {
  const [selected, setSelected] = useState<string[]>([]);
  const [browsing, setBrowsing] = useState(false);

  function toggle(id: string) {
    setBrowsing(false);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const compareMode = selected.length === 2 && !browsing;
  const compareVariants = compareMode
    ? selected.map((id) => ragVariants.find((v) => v.id === id)!)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        {!compareMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ragVariants.map((v) => (
              <button
                key={v.id}
                onClick={() => toggle(v.id)}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  selected.includes(v.id)
                    ? "border-query-amber bg-query-amber/10"
                    : "border-chart-line bg-chart-bg-raised hover:border-ink-500"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <h2 className="font-display text-base text-ink-100">{v.name}</h2>
                  {v.id !== "naive" && <Badge tone="query">variant</Badge>}
                  {v.id === "naive" && <Badge tone="neutral">baseline</Badge>}
                </div>
                <p className="text-xs text-ink-300 mb-3">{v.oneLiner}</p>
                <FlowDiagram flow={v.flow} />
              </button>
            ))}
          </div>
        )}

        {compareMode && (
          <div className="space-y-4">
            <button
              onClick={() => setBrowsing(true)}
              className="text-xs text-ink-500 hover:text-ink-300"
            >
              ← Back to all variants
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compareVariants.map((v) => (
                <Panel key={v.id} className="p-4">
                  <h2 className="font-display text-lg text-ink-100 mb-2">{v.name}</h2>
                  <FlowDiagram flow={v.flow} />
                  <div className="mt-4 space-y-3 text-xs leading-relaxed">
                    <div>
                      <div className="text-doc-teal font-mono uppercase text-[10px] mb-1">
                        Problem it addresses
                      </div>
                      <p className="text-ink-300">{v.problem}</p>
                    </div>
                    <div>
                      <div className="text-doc-teal font-mono uppercase text-[10px] mb-1">
                        How it works
                      </div>
                      <p className="text-ink-300">{v.howItWorks}</p>
                    </div>
                    <div>
                      <div className="text-query-amber font-mono uppercase text-[10px] mb-1">
                        Trade-off
                      </div>
                      <p className="text-ink-300">{v.tradeoff}</p>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        )}
      </div>

      <Marginalia eyebrow="Compare variants">
        <p>
          Every variant here fixes a specific failure mode of naive RAG --
          none of them are strictly &quot;better,&quot; each trades
          latency, cost, or engineering complexity for a specific
          capability.
        </p>
        <p className="mt-3">
          Amber stages in each flow are exactly what that variant adds or
          changes relative to the naive baseline -- everything else stays
          the same pipeline.
        </p>
        <p className="mt-3">
          Select any two cards to compare them side by side.
        </p>
      </Marginalia>
    </div>
  );
}
