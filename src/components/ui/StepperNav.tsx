export interface StepDef {
  label: string;
}

export function StepperNav({
  steps,
  activeIndex,
  onSelect,
}: {
  steps: StepDef[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-stretch gap-0 overflow-hidden rounded-lg border border-chart-line">
      {steps.map((step, i) => {
        const state = i === activeIndex ? "active" : i < activeIndex ? "done" : "pending";
        return (
          <li key={step.label} className="flex-1 min-w-[120px]">
            <button
              onClick={() => onSelect(i)}
              className={`w-full h-full px-3 py-2.5 text-left transition-colors border-r border-chart-line last:border-r-0
                ${state === "active" ? "bg-doc-teal/15" : "bg-chart-bg-raised hover:bg-chart-line/40"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[11px] rounded-full w-5 h-5 flex items-center justify-center shrink-0
                    ${
                      state === "done"
                        ? "bg-doc-teal text-chart-bg"
                        : state === "active"
                          ? "border border-doc-teal text-doc-teal"
                          : "border border-ink-700 text-ink-500"
                    }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span
                  className={`text-xs font-medium leading-tight ${
                    state === "pending" ? "text-ink-500" : "text-ink-100"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
