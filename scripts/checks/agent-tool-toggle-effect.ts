/**
 * SC-002 / FR-004: disabling the tool a question would otherwise use
 * must visibly change the agent's step sequence, and the disabled tool
 * must never be called. Verified against a live run of the real engine
 * (not a stored expectation) -- module-scoped, same style as
 * agent-determinism.ts.
 */
import { report, type CheckFailure } from "./lib/report";
import { SAMPLE_QUESTIONS } from "../../src/concepts/agents-tool-use/lib/sampleQuestions";
import { DEFAULT_TOOLBOX } from "../../src/concepts/agents-tool-use/lib/tools";
import { runSingleToolCall } from "../../src/concepts/agents-tool-use/lib/strategies";

const failures: CheckFailure[] = [];

const division = SAMPLE_QUESTIONS.find((q) => q.id === "division");
if (!division) {
  report("check:agents-tool-use (agent-tool-toggle-effect)", [
    { location: "fixture", message: '"division" sample question not found' },
  ]);
}

const withCalculator = runSingleToolCall(division!.text, DEFAULT_TOOLBOX);
const withoutCalculator = runSingleToolCall(
  division!.text,
  DEFAULT_TOOLBOX.filter((t) => t.id !== "calculator"),
);

if (JSON.stringify(withCalculator.steps) === JSON.stringify(withoutCalculator.steps)) {
  failures.push({
    location: '"division" question, calculator enabled vs. disabled',
    message: "disabling calculator produced no observable change in the step sequence",
  });
}

const calculatorCalledWhileDisabled = withoutCalculator.steps.some(
  (s) => s.kind === "tool-call" && s.toolId === "calculator",
);
if (calculatorCalledWhileDisabled) {
  failures.push({
    location: '"division" question, calculator disabled',
    message: "a tool-call step with toolId \"calculator\" appeared even though calculator was disabled",
  });
}

report("check:agents-tool-use (agent-tool-toggle-effect)", failures);
