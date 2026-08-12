/**
 * Tool selection and the three shipped agent strategies (FR-001,
 * FR-002, FR-005, FR-006, FR-008) -- see
 * contracts/tool-engine-contract.md. Every function here is a pure
 * function of its explicit arguments only (Constitution Principle V);
 * `single-tool-call` is the literal engine the Walkthrough view (US1/US2)
 * calls, not a separate implementation (research.md).
 */
import type { AgentRun, AgentStep, AgentStrategy, Tool, ToolMatch } from "./types";

export function selectTool(question: string, enabledTools: Tool[]): { tool: Tool; match: ToolMatch } | null {
  for (const tool of enabledTools) {
    const match = tool.match(question);
    if (match) return { tool, match };
  }
  return null;
}

function bestEffortDirectAnswer(question: string): string {
  return `Without a tool to verify this, my best-effort answer is: I don't have enough information to answer "${question}" confidently -- this simulated agent only reasons from a small, fixed toolset, not general knowledge.`;
}

export function runDirectAnswer(question: string): AgentRun {
  const steps: AgentStep[] = [
    {
      id: "reasoning-0",
      kind: "reasoning",
      content: "Answering directly, without consulting any tool (this strategy never calls one).",
    },
    { id: "final-answer-0", kind: "final-answer", content: bestEffortDirectAnswer(question) },
  ];
  return { question, enabledToolIds: [], strategyId: "direct-answer", steps, outcome: "final-answer" };
}

export function runSingleToolCall(question: string, enabledTools: Tool[]): AgentRun {
  const selected = selectTool(question, enabledTools);
  const enabledToolIds = enabledTools.map((t) => t.id);
  if (!selected) {
    const steps: AgentStep[] = [
      {
        id: "reasoning-0",
        kind: "reasoning",
        content: "No enabled tool is a good match for this question. Answering directly.",
      },
      { id: "final-answer-0", kind: "final-answer", content: bestEffortDirectAnswer(question) },
    ];
    return { question, enabledToolIds, strategyId: "single-tool-call", steps, outcome: "final-answer" };
  }
  const { tool, match } = selected;
  const steps: AgentStep[] = [
    {
      id: "reasoning-0",
      kind: "reasoning",
      content: `This question matches ${tool.name} because ${match.reason}. Selecting ${tool.name}.`,
    },
    { id: "tool-call-0", kind: "tool-call", toolId: tool.id, content: `Calling ${tool.name}.` },
    { id: "observation-0", kind: "observation", toolId: tool.id, content: match.result },
    { id: "final-answer-0", kind: "final-answer", content: `Based on ${tool.name}'s result: ${match.result}` },
  ];
  return { question, enabledToolIds, strategyId: "single-tool-call", steps, outcome: "final-answer" };
}

export const MAX_ITERATIONS = 3;

export function runMultiStepLoop(question: string, enabledTools: Tool[]): AgentRun {
  const steps: AgentStep[] = [];
  const enabledToolIds = enabledTools.map((t) => t.id);
  const tried = new Set<string>();
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const remaining = enabledTools.filter((t) => !tried.has(t.id));
    const selected = selectTool(question, remaining);
    if (!selected) {
      steps.push({
        id: `reasoning-${i}`,
        kind: "reasoning",
        content: `No enabled tool matches this question yet. Re-examining the question for a better fit (attempt ${i + 1} of ${MAX_ITERATIONS}).`,
      });
      continue;
    }
    const { tool, match } = selected;
    tried.add(tool.id);
    steps.push({
      id: `reasoning-${i}`,
      kind: "reasoning",
      content: `This question matches ${tool.name} because ${match.reason}. Selecting ${tool.name}.`,
    });
    steps.push({ id: `tool-call-${i}`, kind: "tool-call", toolId: tool.id, content: `Calling ${tool.name}.` });
    steps.push({ id: `observation-${i}`, kind: "observation", toolId: tool.id, content: match.result });
    steps.push({
      id: `verify-${i}`,
      kind: "reasoning",
      content: `Double-checking ${tool.name}'s result against the question before finalizing... confirmed.`,
    });
    steps.push({ id: "final-answer-0", kind: "final-answer", content: `Based on ${tool.name}'s result: ${match.result}` });
    return { question, enabledToolIds, strategyId: "multi-step-loop", steps, outcome: "final-answer" };
  }
  steps.push({
    id: "gave-up-0",
    kind: "gave-up",
    content: `Reached the maximum of ${MAX_ITERATIONS} reasoning attempts without finding a good tool match -- giving up rather than guessing.`,
  });
  return { question, enabledToolIds, strategyId: "multi-step-loop", steps, outcome: "gave-up" };
}

export const STRATEGIES: AgentStrategy[] = [
  {
    id: "direct-answer",
    name: "Direct Answer",
    problem: "For questions that don't obviously need a tool, answer immediately without the overhead of tool selection.",
    tradeoff: "Fast, but never grounded in a verifiable result.",
    run: (question) => runDirectAnswer(question),
  },
  {
    id: "single-tool-call",
    name: "Single Tool Call",
    problem: "Reasons about whether a tool fits, calls at most one, and answers from its result.",
    tradeoff: "Grounded when a tool fits; falls back to an unverified guess when none does.",
    run: (question, tools) => runSingleToolCall(question, tools),
  },
  {
    id: "multi-step-loop",
    name: "Multi-Step Reasoning Loop",
    problem: "Re-examines the question across multiple attempts and double-checks a tool's result before finalizing, instead of settling for the first read.",
    tradeoff: "Tries harder before giving up -- costs more steps, and can fail outright (gave up) instead of guessing.",
    run: (question, tools) => runMultiStepLoop(question, tools),
  },
];
