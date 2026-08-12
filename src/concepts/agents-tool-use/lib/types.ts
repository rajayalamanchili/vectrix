/**
 * Agents & Tool Use's data shapes, all client-side/in-memory (no
 * persistence layer -- this module has no backend, same as every prior
 * milestone). See specs/005-agents-tool-use/data-model.md for the full
 * field-by-field rationale; this file is the type-level source of truth
 * it describes.
 */

/** What a `Tool.match` returns when it recognizes a question as belonging to its domain. */
export interface ToolMatch {
  /** Plain-language reason shown in the reasoning step, e.g. "the question contains a two-number arithmetic expression". */
  reason: string;
  /** The tool's genuinely computed result -- never fabricated (spec.md Assumptions). */
  result: string;
}

export interface Tool {
  /** "calculator" | "unit-converter" | "knowledge-lookup". */
  id: string;
  /** Learner-facing name. */
  name: string;
  /** Plain-language capability description (FR-003). */
  description: string;
  /** Pure, deterministic: returns a match (with a genuinely computed result) or null. No partial-credit score -- see research.md. */
  match: (question: string) => ToolMatch | null;
}

export type AgentStepKind = "reasoning" | "tool-call" | "observation" | "final-answer" | "gave-up";

export interface AgentStep {
  /** Stable within one AgentRun, e.g. `${kind}-${index}`. */
  id: string;
  kind: AgentStepKind;
  /** Present only on "tool-call" / "observation" steps. */
  toolId?: string;
  /** The learner-facing text for this step. */
  content: string;
}

export type AgentRunOutcome = "final-answer" | "gave-up";

export interface AgentRun {
  question: string;
  /** Snapshot of which tools were enabled for this run (FR-004). */
  enabledToolIds: string[];
  strategyId: AgentStrategyId;
  steps: AgentStep[];
  outcome: AgentRunOutcome;
}

export type AgentStrategyId = "direct-answer" | "single-tool-call" | "multi-step-loop";

export interface AgentStrategy {
  id: AgentStrategyId;
  /** e.g. "Single Tool Call". */
  name: string;
  /** Plain-language: the problem this strategy addresses. */
  problem: string;
  /** Plain-language: its cost/limitation. */
  tradeoff: string;
  run: (question: string, enabledTools: Tool[]) => AgentRun;
}
