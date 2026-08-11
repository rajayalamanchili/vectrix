# Contract: Tool Matching & Agent Strategy Engine (FR-001 through FR-006, FR-008, FR-009)

**Status**: New, this plan. Pure functions, no React, no I/O -- everything
here is directly unit-testable and is exactly what
`scripts/checks/agent-determinism.ts` and
`scripts/checks/agent-tool-toggle-effect.ts` exercise.

## Toolbox (`lib/tools.ts`)

```ts
import type { Tool } from "./types";

export const CALCULATOR: Tool = {
  id: "calculator",
  name: "Calculator",
  description: "Evaluates a two-number arithmetic expression (+, -, x, ÷) found in the question.",
  match(question) {
    const m = question.match(/(-?\d+(?:\.\d+)?)\s*([+\-x×*/÷])\s*(-?\d+(?:\.\d+)?)/i);
    if (!m) return null;
    const [, aStr, opRaw, bStr] = m;
    const a = Number(aStr), b = Number(bStr);
    const op = opRaw === "x" || opRaw === "×" || opRaw === "*" ? "*" : opRaw === "÷" ? "/" : opRaw;
    const result = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b;
    return {
      reason: "the question contains a two-number arithmetic expression",
      result: `${aStr} ${opRaw} ${bStr} = ${result}`,
    };
  },
};

export const UNIT_CONVERTER: Tool = {
  id: "unit-converter",
  name: "Unit Converter",
  description: "Converts a number between two recognized units (kilometers/miles, kilograms/pounds, Celsius/Fahrenheit).",
  match(question) {
    const m = question.match(
      /(-?\d+(?:\.\d+)?)\s*(kilometers?|km|miles?|mi|kilograms?|kg|pounds?|lbs?|celsius|°?c|fahrenheit|°?f)\s+(?:to|in)\s+(kilometers?|km|miles?|mi|kilograms?|kg|pounds?|lbs?|celsius|°?c|fahrenheit|°?f)/i,
    );
    if (!m) return null;
    // convert(value, fromUnit, toUnit) -- real math via a small fixed
    // conversion table (km<->mi *0.621371, kg<->lb *2.20462, C<->F
    // *9/5+32), normalizing unit aliases (km/kilometers, lb/lbs/pounds, ...) first.
    const converted = convert(Number(m[1]), m[2], m[3]);
    return {
      reason: "the question asks to convert a number between two recognized units",
      result: `${m[1]} ${m[2]} is approximately ${converted} ${m[3]}`,
    };
  },
};

export const KNOWLEDGE_LOOKUP: Tool = {
  id: "knowledge-lookup",
  name: "Knowledge Lookup",
  description: "Looks up an answer from a small, fixed set of general-knowledge facts.",
  match(question) {
    const q = question.toLowerCase();
    const hit = FACTS.find(({ phrase }) => q.includes(phrase));
    if (!hit) return null;
    return {
      reason: `the question matches a known fact: "${hit.phrase}"`,
      result: hit.answer,
    };
  },
};

// Fixed declaration order == tie-break order (research.md).
export const DEFAULT_TOOLBOX: Tool[] = [CALCULATOR, UNIT_CONVERTER, KNOWLEDGE_LOOKUP];
```

- `FACTS` is a small, fixed array of `{ phrase: string; answer: string
  }` (e.g. `"capital of france"` -> `"Paris"`), shipped in `lib/tools.ts`
  alongside `KNOWLEDGE_LOOKUP` -- the "small, fixed, shipped fact set"
  spec.md's Assumptions require.
- Every `Tool.match` is a pure function of its `question` string only --
  no closure over mutable state, no randomness, no wall-clock read.

## Tool selection (`lib/strategies.ts`)

```ts
function selectTool(question: string, enabledTools: Tool[]): { tool: Tool; match: ToolMatch } | null {
  for (const tool of enabledTools) {          // enabledTools is always DEFAULT_TOOLBOX filtered/reordered to fixed declaration order
    const match = tool.match(question);
    if (match) return { tool, match };         // first match in fixed order wins ties (research.md)
  }
  return null;
}
```

- `enabledTools` passed in is always a subset of `DEFAULT_TOOLBOX`, in
  `DEFAULT_TOOLBOX`'s original order -- callers filter, never reorder,
  so tie-break order is stable regardless of which tools are enabled
  (FR-004).

## `direct-answer` strategy

```ts
function runDirectAnswer(question: string): AgentRun {
  const steps: AgentStep[] = [
    { id: "reasoning-0", kind: "reasoning", content: "Answering directly, without consulting any tool (this strategy never calls one)." },
    { id: "final-answer-0", kind: "final-answer", content: bestEffortDirectAnswer(question) },
  ];
  return { question, enabledToolIds: [], strategyId: "direct-answer", steps, outcome: "final-answer" };
}
```

- `enabledToolIds` is always `[]` here -- this strategy structurally
  ignores the toolbox (its whole teaching point, per FR-008's
  "trade-off" field: fast, but never grounded in a verifiable tool
  result).
- `bestEffortDirectAnswer` returns an honestly-hedged templated string
  (e.g. `"Without a tool to verify this, my best-effort answer is: ..."`)
  -- never a fabricated confident answer (Constitution Principle II).

## `single-tool-call` strategy (also the Walkthrough view's engine, US1/US2)

```ts
function runSingleToolCall(question: string, enabledTools: Tool[]): AgentRun {
  const selected = selectTool(question, enabledTools);
  const steps: AgentStep[] = [];
  if (!selected) {
    steps.push({ id: "reasoning-0", kind: "reasoning", content: "No enabled tool is a good match for this question. Answering directly." });
    steps.push({ id: "final-answer-0", kind: "final-answer", content: bestEffortDirectAnswer(question) });
    return { question, enabledToolIds: enabledTools.map((t) => t.id), strategyId: "single-tool-call", steps, outcome: "final-answer" };
  }
  const { tool, match } = selected;
  steps.push({ id: "reasoning-0", kind: "reasoning", content: `This question matches ${tool.name} because ${match.reason}. Selecting ${tool.name}.` });
  steps.push({ id: "tool-call-0", kind: "tool-call", toolId: tool.id, content: `Calling ${tool.name}.` });
  steps.push({ id: "observation-0", kind: "observation", toolId: tool.id, content: match.result });
  steps.push({ id: "final-answer-0", kind: "final-answer", content: `Based on ${tool.name}'s result: ${match.result}` });
  return { question, enabledToolIds: enabledTools.map((t) => t.id), strategyId: "single-tool-call", steps, outcome: "final-answer" };
}
```

- Directly implements US1's four acceptance scenarios: a clean tool
  match (reasoning + tool-call + observation + final-answer), a no-fit
  question (reasoning + final-answer, "no tool needed" shown as plainly
  as a tool-call, FR-005), and -- because `enabledTools` is a parameter,
  not a closure over fixed state -- disabling a tool and re-running
  (US2) naturally produces a different `selected` result with no special
  casing.
- Never produces `"gave-up"` -- structurally impossible, since it never
  loops.

## `multi-step-loop` strategy

```ts
export const MAX_ITERATIONS = 3;

function runMultiStepLoop(question: string, enabledTools: Tool[]): AgentRun {
  const steps: AgentStep[] = [];
  const tried = new Set<string>();
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const remaining = enabledTools.filter((t) => !tried.has(t.id));
    const selected = selectTool(question, remaining);
    if (!selected) {
      steps.push({ id: `reasoning-${i}`, kind: "reasoning", content: `No enabled tool matches this question yet. Re-examining the question for a better fit (attempt ${i + 1} of ${MAX_ITERATIONS}).` });
      continue; // no tool call made this iteration -- doesn't count toward `tried`
    }
    const { tool, match } = selected;
    tried.add(tool.id);
    steps.push({ id: `reasoning-${i}`, kind: "reasoning", content: `This question matches ${tool.name} because ${match.reason}. Selecting ${tool.name}.` });
    steps.push({ id: `tool-call-${i}`, kind: "tool-call", toolId: tool.id, content: `Calling ${tool.name}.` });
    steps.push({ id: `observation-${i}`, kind: "observation", toolId: tool.id, content: match.result });
    steps.push({ id: `verify-${i}`, kind: "reasoning", content: `Double-checking ${tool.name}'s result against the question before finalizing... confirmed.` });
    steps.push({ id: "final-answer-0", kind: "final-answer", content: `Based on ${tool.name}'s result: ${match.result}` });
    return { question, enabledToolIds: enabledTools.map((t) => t.id), strategyId: "multi-step-loop", steps, outcome: "final-answer" };
  }
  steps.push({ id: "gave-up-0", kind: "gave-up", content: `Reached the maximum of ${MAX_ITERATIONS} reasoning attempts without finding a good tool match -- giving up rather than guessing.` });
  return { question, enabledToolIds: enabledTools.map((t) => t.id), strategyId: "multi-step-loop", steps, outcome: "gave-up" };
}
```

- When a tool matches on the first attempt, this produces exactly one
  more step than `single-tool-call` for the identical question (the
  `verify-0` step) -- always the *same* final answer, strictly more
  steps (US3 Acceptance Scenario 2).
- When no tool ever matches, this is the only strategy that can end in
  `"gave-up"` rather than a direct answer -- reachable by the shipped
  `"no-fit"` sample question with the default (all-enabled) toolbox
  (research.md).
- The loop is guaranteed to terminate within `MAX_ITERATIONS` -- each
  iteration either matches a tool (returns immediately) or exhausts one
  more candidate from `remaining` conceptually (bounded by
  `enabledTools.length <= 3 <= MAX_ITERATIONS`), so it never needs a
  higher cap to behave correctly against the shipped toolbox.

## `STRATEGIES` (Compare Strategies view, US3, FR-008)

```ts
export const STRATEGIES: AgentStrategy[] = [
  { id: "direct-answer", name: "Direct Answer", problem: "...", tradeoff: "Fast, but never grounded in a verifiable result.", run: runDirectAnswer },
  { id: "single-tool-call", name: "Single Tool Call", problem: "...", tradeoff: "Grounded when a tool fits; falls back to an unverified guess when none does.", run: (q, tools) => runSingleToolCall(q, tools) },
  { id: "multi-step-loop", name: "Multi-Step Reasoning Loop", problem: "...", tradeoff: "Tries harder before giving up -- costs more steps, and can fail outright (gave up) instead of guessing.", run: runMultiStepLoop },
];
```

- Compare Strategies always calls every `STRATEGIES[i].run(question,
  DEFAULT_TOOLBOX)` -- the full, default-enabled toolbox, independent of
  whatever tool-toggle state the Walkthrough view last left (spec.md
  Assumptions).
