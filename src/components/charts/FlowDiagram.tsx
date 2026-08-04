import type { FlowStage } from "@/concepts/rag/variants/variantData";

export function FlowDiagram({ flow }: { flow: FlowStage[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {flow.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-1.5">
          <div
            className={`rounded px-2.5 py-1.5 text-[11px] leading-tight font-mono ${
              stage.changed
                ? "bg-query-amber/20 text-query-amber border border-query-amber/40"
                : "bg-doc-teal/10 text-doc-teal border border-doc-teal/20"
            }`}
          >
            {stage.label}
          </div>
          {i < flow.length - 1 && <span className="text-ink-700 text-xs">→</span>}
        </div>
      ))}
    </div>
  );
}
