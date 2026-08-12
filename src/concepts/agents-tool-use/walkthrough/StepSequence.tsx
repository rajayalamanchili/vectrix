import type { AgentStep, AgentStepKind } from "../lib/types";

/**
 * Renders one AgentRun's full step list at once -- no click-through
 * stepper (spec.md's 2026-08-11 Clarification: the whole computed
 * sequence renders together after a run finishes). Shared by both the
 * Walkthrough (US1/US2) and Compare Strategies (US3) views so there is
 * exactly one rendering of what a step looks like.
 */

const KIND_LABEL: Record<AgentStepKind, string> = {
  reasoning: "Reasoning",
  "tool-call": "Tool Call",
  observation: "Observation",
  "final-answer": "Final Answer",
  "gave-up": "Gave Up",
};

const KIND_CLASSES: Record<AgentStepKind, string> = {
  reasoning: "border-chart-line text-ink-300",
  "tool-call": "border-query-amber/40 text-query-amber",
  observation: "border-doc-teal/40 text-doc-teal",
  "final-answer": "border-success/40 text-success",
  "gave-up": "border-danger/40 text-danger",
};

export function StepSequence({ steps }: { steps: AgentStep[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step) => (
        <li
          key={step.id}
          data-step-kind={step.kind}
          className={`rounded-md border p-3 text-sm leading-relaxed ${KIND_CLASSES[step.kind]}`}
        >
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider">
            {KIND_LABEL[step.kind]}
            {step.toolId ? ` -- ${step.toolId}` : ""}
          </span>
          <span className="text-ink-100">{step.content}</span>
        </li>
      ))}
    </ol>
  );
}
