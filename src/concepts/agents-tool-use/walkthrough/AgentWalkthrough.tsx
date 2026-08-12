"use client";

import { useMemo, useState } from "react";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { SAMPLE_QUESTIONS } from "../lib/sampleQuestions";
import { DEFAULT_TOOLBOX } from "../lib/tools";
import { runSingleToolCall } from "../lib/strategies";
import { StepSequence } from "./StepSequence";

/**
 * US1: sample-question chips + a custom-question input, both driving the
 * same `activeQuestion` state so there is exactly one question-selection
 * code path (mirrors RetrievalStep.tsx's sample-query/custom-query
 * pattern). Every render derives its step sequence fresh from
 * `activeQuestion` via `runSingleToolCall` -- there is no separate
 * "current run" state to explicitly reset, so switching questions
 * (Edge Cases, spec.md) invalidates the previous run by construction.
 */
export function AgentWalkthrough() {
  const [activeQuestion, setActiveQuestion] = useState(SAMPLE_QUESTIONS[0].text);

  const run = useMemo(() => runSingleToolCall(activeQuestion, DEFAULT_TOOLBOX), [activeQuestion]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <Panel className="p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                data-question-chip={q.id}
                onClick={() => setActiveQuestion(q.text)}
                aria-pressed={q.text === activeQuestion}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  q.text === activeQuestion
                    ? "border-query-amber bg-query-amber/15 text-query-amber"
                    : "border-chart-line text-ink-500 hover:text-ink-300"
                }`}
              >
                {q.text}
              </button>
            ))}
          </div>
          <input
            data-primary-focus="true"
            value={activeQuestion}
            onChange={(e) => setActiveQuestion(e.target.value)}
            placeholder="Or type your own question..."
            className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:border-query-amber"
          />

          <div className="mt-5" data-simulated-disclosure="true">
            <p className="text-xs italic text-ink-500">
              Tool selection here is a simplified simulation: a small set
              of rule-based matchers, checked in a fixed order, not a real
              model reasoning about the question.
            </p>
          </div>

          <div className="mt-5">
            <StepSequence steps={run.steps} />
          </div>
        </Panel>
      </div>

      <Marginalia eyebrow="Agent Walkthrough">
        <p>
          Pick a question -- or type your own -- and watch the agent
          decide whether it needs a tool, which one, what that tool
          returns, and how that result shapes the final answer.
        </p>
      </Marginalia>
    </div>
  );
}
