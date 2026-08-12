"use client";

import { useMemo, useState } from "react";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { SAMPLE_QUESTIONS } from "../lib/sampleQuestions";
import { DEFAULT_TOOLBOX } from "../lib/tools";
import { STRATEGIES } from "../lib/strategies";
import { StepSequence } from "../walkthrough/StepSequence";

/**
 * US3: the same question run through all three shipped strategies at
 * once, always against the full `DEFAULT_TOOLBOX` -- independent of
 * whatever the Walkthrough's tool toggles (US2) currently have disabled
 * (spec.md Assumptions), so a strategy's own step count/outcome is what
 * differs here, not a toolbox difference. Each panel carries its own
 * `data-simulated-disclosure="true"` marker (research.md's "Disclosure
 * marker granularity" decision) rather than one shared for the view.
 */
export function StrategyComparison() {
  const [activeQuestion, setActiveQuestion] = useState(SAMPLE_QUESTIONS[0].text);

  const runs = useMemo(
    () => STRATEGIES.map((strategy) => ({ strategy, run: strategy.run(activeQuestion, DEFAULT_TOOLBOX) })),
    [activeQuestion],
  );

  return (
    <div className="space-y-6">
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
          value={activeQuestion}
          onChange={(e) => setActiveQuestion(e.target.value)}
          placeholder="Or type your own question..."
          className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:border-query-amber"
        />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {runs.map(({ strategy, run }) => (
          <div key={strategy.id} data-strategy-panel={strategy.id}>
            <Panel className="p-4">
              <h2 className="font-display text-base text-ink-100">{strategy.name}</h2>
              <Marginalia>
                <p>{strategy.problem}</p>
                <p className="mt-2 text-ink-500">{strategy.tradeoff}</p>
              </Marginalia>

              <div className="mt-3" data-simulated-disclosure="true">
                <p className="text-xs italic text-ink-500">
                  Tool selection here is a simplified simulation: rule-based
                  matchers checked in a fixed order, not a real model
                  reasoning about the question.
                </p>
              </div>

              <div className="mt-4">
                <StepSequence steps={run.steps} />
              </div>
            </Panel>
          </div>
        ))}
      </div>
    </div>
  );
}
