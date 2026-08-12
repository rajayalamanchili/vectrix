/**
 * SC-003 (widened 2026-08-11 `/speckit-clarify`): identical
 * (question, enabled tools, strategy) MUST always produce a byte-for-
 * byte identical `AgentRun`, across both the final-answer path and the
 * multi-step loop's "gave-up" path -- not just the final-answer path
 * alone. Module-scoped (imports only from
 * src/concepts/agents-tool-use/...), deliberately not folded into RAG's
 * own determinism.ts -- see tech-stack.md's "Agent determinism /
 * tool-toggle-effect checks" decision.
 */
import { report, type CheckFailure } from "./lib/report";
import { SAMPLE_QUESTIONS } from "../../src/concepts/agents-tool-use/lib/sampleQuestions";
import { DEFAULT_TOOLBOX } from "../../src/concepts/agents-tool-use/lib/tools";
import { runSingleToolCall, runMultiStepLoop } from "../../src/concepts/agents-tool-use/lib/strategies";
import type { AgentRun } from "../../src/concepts/agents-tool-use/lib/types";

const RUNS = 10;

function findSampleQuestion(id: string): string {
  const q = SAMPLE_QUESTIONS.find((s) => s.id === id);
  if (!q) throw new Error(`sample question "${id}" not found`);
  return q.text;
}

const FIXTURES: { name: string; run: () => AgentRun }[] = [
  {
    name: 'single-tool-call, "division" (final-answer path)',
    run: () => runSingleToolCall(findSampleQuestion("division"), DEFAULT_TOOLBOX),
  },
  {
    name: 'multi-step-loop, "no-fit" (gave-up path)',
    run: () => runMultiStepLoop(findSampleQuestion("no-fit"), DEFAULT_TOOLBOX),
  },
];

const failures: CheckFailure[] = [];

for (const fixture of FIXTURES) {
  const baseline = JSON.stringify(fixture.run());
  for (let i = 1; i < RUNS; i++) {
    const output = JSON.stringify(fixture.run());
    if (output !== baseline) {
      failures.push({
        location: `${fixture.name}, run ${i + 1}`,
        message: `diverged from run 1's output. Run 1: ${baseline}. Run ${i + 1}: ${output}`,
      });
      break;
    }
  }
}

report("check:agents-tool-use (agent-determinism)", failures);
