"use client";

import { FAILURE_PRESETS, type FailurePreset } from "./failurePresets";

/**
 * US3: a named-failure preset selector plus an always-visible
 * "Reset to defaults" control (FR-010), reachable from any pipeline
 * step because it's rendered in `PipelineWalkthrough.tsx`'s chrome
 * above `StepperNav`, not inside any one step. Loading a preset shows
 * its `explanation` as visible text (FR-009), not only as a title
 * tooltip, so it's discoverable without hovering.
 */
export function FailurePresetPicker({
  activePresetId,
  onSelectPreset,
  onReset,
}: {
  activePresetId: string | null;
  onSelectPreset: (preset: FailurePreset) => void;
  onReset: () => void;
}) {
  const activePreset = FAILURE_PRESETS.find((p) => p.id === activePresetId) ?? null;

  return (
    <div className="rounded-md border border-chart-line/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-500">Try a known failure:</span>
        {FAILURE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={preset.id === activePresetId}
            onClick={() => onSelectPreset(preset)}
            className={`rounded border px-3 py-1.5 text-xs font-medium underline-offset-4 transition-colors ${
              preset.id === activePresetId
                ? "border-danger text-danger underline"
                : "border-danger/40 text-danger hover:bg-danger/10"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded border border-chart-line px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
        >
          Reset to defaults
        </button>
      </div>
      {activePreset && (
        <p role="status" className="mt-2 text-xs text-ink-300">
          {activePreset.explanation}
        </p>
      )}
    </div>
  );
}
