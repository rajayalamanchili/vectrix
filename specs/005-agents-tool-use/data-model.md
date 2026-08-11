# Data Model: Agents & Tool Use Concept Module

**Feature**: `005-agents-tool-use` | **Date**: 2026-08-11

All types are client-side/in-memory, no persistence layer -- consistent
with every prior milestone (no backend exists in this project). Every
value here is a pure function of (question, enabled tools[, strategy]),
per Constitution Principle V -- no field is ever populated from
`Math.random()`, `Date.now()`, or any other unseeded source.

## Tool / ToolMatch (FR-003, FR-004)

```ts
// src/concepts/agents-tool-use/lib/types.ts
export interface ToolMatch {
  /** Plain-language reason shown in the reasoning step, e.g. "the question contains a two-number arithmetic expression". */
  reason: string;
  /** The tool's genuinely computed result -- never fabricated (spec.md Assumptions). */
  result: string;
}

export interface Tool {
  id: string;               // "calculator" | "unit-converter" | "knowledge-lookup"
  name: string;              // learner-facing name
  description: string;       // plain-language capability description (FR-003)
  /** Pure, deterministic: returns a match (with a genuinely computed result) or null. No partial-credit score -- see research.md. */
  match: (question: string) => ToolMatch | null;
}
```

- `match` never throws and never depends on anything but its `question`
  argument -- required for SC-003's byte-for-byte 10-run determinism
  check.
- The shipped toolbox (`lib/tools.ts`) is a fixed, ordered array of
  exactly 3 `Tool`s (research.md's "Toolbox" decision); their
  declaration order is also the tie-break order used by tool selection.

## AgentStep / AgentRun (FR-001, FR-002, FR-005, FR-006)

```ts
// src/concepts/agents-tool-use/lib/types.ts
export type AgentStepKind = "reasoning" | "tool-call" | "observation" | "final-answer" | "gave-up";

export interface AgentStep {
  id: string;             // stable within one AgentRun, e.g. `${kind}-${index}`
  kind: AgentStepKind;
  toolId?: string;         // present only on "tool-call" / "observation" steps
  content: string;         // the learner-facing text for this step
}

export type AgentRunOutcome = "final-answer" | "gave-up";

export interface AgentRun {
  question: string;
  enabledToolIds: string[];   // snapshot of which tools were enabled for this run (FR-004)
  strategyId: AgentStrategyId;
  steps: AgentStep[];
  outcome: AgentRunOutcome;
}
```

- `steps` is always non-empty (FR-001, US1 Acceptance Scenario 4 -- "never
  a blank or broken state") -- every strategy's `run()` produces at
  least one `reasoning` step and ends in either a `final-answer` step or
  a `gave-up` step.
- `outcome === "gave-up"` is possible only for `multi-step-loop`
  (research.md); `direct-answer` and `single-tool-call` always end
  `"final-answer"` by construction (they never loop, so they can never
  reach the iteration cap).
- Two `AgentRun`s produced from identical `(question, enabledToolIds,
  strategyId)` MUST be deep-equal, including every step's `content` --
  this identity is exactly what `scripts/checks/agent-determinism.ts`
  (SC-003) verifies across 10 runs, and what
  `scripts/checks/agent-tool-toggle-effect.ts` (SC-002) verifies
  *changes* when `enabledToolIds` changes.

## AgentStrategy (FR-008, User Story 3)

```ts
// src/concepts/agents-tool-use/lib/types.ts
export type AgentStrategyId = "direct-answer" | "single-tool-call" | "multi-step-loop";

export interface AgentStrategy {
  id: AgentStrategyId;
  name: string;              // e.g. "Single Tool Call"
  problem: string;            // plain-language: the problem this strategy addresses
  tradeoff: string;           // plain-language: its cost/limitation
  run: (question: string, enabledTools: Tool[]) => AgentRun;
}
```

- Exactly 3 shipped `AgentStrategy` values (FR-008's minimum), exported
  as a fixed-order array, `STRATEGIES`, from `lib/strategies.ts`.
- `single-tool-call` is the same function the Walkthrough view (US1/US2)
  calls directly -- not a separate implementation (research.md's "one of
  which *is* the main walkthrough" decision). This is what guarantees
  Compare Strategies (US3) can never silently drift from what the
  Walkthrough actually demonstrates.
- `MAX_ITERATIONS = 3` (`lib/strategies.ts`) is the fixed cap FR-006
  requires; only `multi-step-loop`'s internal loop ever approaches it --
  see research.md's "multi-step loop" decision for exactly when a run
  reaches `"gave-up"`.

## Sample Questions (FR-007)

```ts
// src/concepts/agents-tool-use/lib/sampleQuestions.ts
export interface SampleQuestion {
  id: string;
  text: string;
  /** Which tool this question is curated to demonstrate, or null for the no-tool-fits case. Documentation only -- never read by the matching engine itself. */
  expectedToolId: string | null;
}

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  { id: "division", text: "What is 128 divided by 4?", expectedToolId: "calculator" },
  { id: "distance", text: "Convert 5 kilometers to miles", expectedToolId: "unit-converter" },
  { id: "capital", text: "What is the capital of France?", expectedToolId: "knowledge-lookup" },
  { id: "no-fit", text: "What's the weather like on Mars today?", expectedToolId: null },
];
```

- 4 shipped questions satisfy FR-007's "at least 3... including at least
  one no tool fits well." A learner's custom question (free-text input,
  FR-007's second half) is run through the exact same `Tool.match`/
  `AgentStrategy.run` pipeline -- there is no separate "custom question"
  code path.
- `expectedToolId` is a documentation/test-fixture aid only (used by
  `agent-tool-toggle-effect.ts` to know which tool to disable for its
  assertion) -- the runtime engine derives tool selection purely from
  `Tool.match`, never from this field.
