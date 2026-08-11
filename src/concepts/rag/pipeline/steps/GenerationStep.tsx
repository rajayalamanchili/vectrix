"use client";

import { useEffect, useState } from "react";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { ErrorBanner } from "../../realMode/ErrorBanner";
import type { GenerationParams, RealModeError, RealModeSession } from "../../realMode/types";
import type { RetrievedChunk } from "./RetrievalStep";
import { createTrackedProvider } from "../../costLedger/trackedProvider";
import { useCostGate } from "../../costLedger/useCostGate";
import { CostWarningBanner } from "../../costLedger/CostWarningBanner";
import { sumLedgerUsd, type CostLedgerEntry, type SessionCostLedger } from "../../costLedger/types";

/** FR-016 canonical call type for this step's one real call. */
const STAGE = "final-generate";

const DEFAULT_TEMPERATURE = 0.3;

/**
 * Placeholder "generation" -- deliberately not a real LLM call, so the
 * playground works with zero API keys and zero server cost. To wire up
 * a real model: replace this function's body with a call to your
 * provider of choice, passing `prompt` through unchanged. Everything
 * upstream (retrieval, prompt assembly) is already provider-agnostic.
 */
function mockGenerate(query: string, chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No context was retrieved, so there's nothing grounded to answer from.";
  }
  const lead = chunks[0].chunk.text.split(/(?<=[.!?])\s/)[0];
  return `Based on chunk #${chunks[0].chunk.id.replace("chunk-", "")} (highest similarity, ${chunks[0].score.toFixed(
    2,
  )}): ${lead} ${
    chunks.length > 1
      ? `This is supported by ${chunks.length - 1} additional retrieved chunk${chunks.length > 2 ? "s" : ""}.`
      : ""
  }`;
}

export function GenerationStep({
  query,
  results,
  realMode,
  onRealModeChange,
  params,
  onParamsChange,
  costLedger,
  onCostLedgerAppend,
}: {
  query: string;
  results: RetrievedChunk[];
  realMode?: RealModeSession;
  onRealModeChange?: (next: RealModeSession) => void;
  params?: GenerationParams;
  onParamsChange?: (next: GenerationParams) => void;
  /** 004-real-mode-depth US2: session-wide cost/call ledger (FR-005, FR-007). */
  costLedger?: SessionCostLedger;
  onCostLedgerAppend?: (entry: CostLedgerEntry) => void;
}) {
  const contextBlock = results.map((r, i) => `[${i + 1}] ${r.chunk.text}`).join("\n\n");
  const prompt = `You are a helpful assistant. Answer the question using ONLY the context below. If the context doesn't contain the answer, say so.

Context:
${contextBlock || "(no context retrieved)"}

Question: ${query || "(no query yet)"}`;

  const temperature = params?.temperature ?? DEFAULT_TEMPERATURE;
  const isReal = Boolean(realMode?.active && realMode.apiKey);

  const [realAnswer, setRealAnswer] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Only this step's own call type -- an embedding failure surfaced
  // elsewhere must not make this step show a stale banner.
  const stageError = realMode?.error?.stage === STAGE ? realMode.error : null;

  // FR-007: re-evaluated fresh per distinct call (research.md's
  // warning-threshold decision), keyed on exactly the inputs that would
  // trigger a new generate call.
  const callKey = JSON.stringify([prompt, temperature, retryToken]);
  const costGate = useCostGate(costLedger, callKey);
  const blocked = isReal && costGate.blocked;

  // Derived, not a separate boolean: "in flight" is exactly "real mode is
  // on, we don't have an answer yet, the last attempt didn't error, and
  // it isn't waiting on the cost-warning gate."
  const loading = isReal && realAnswer === null && !stageError && !blocked;

  useEffect(() => {
    if (!isReal || !realMode || !realMode.apiKey || blocked) {
      return;
    }
    let cancelled = false;
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );
    provider
      .generate(prompt, { temperature })
      .then((text) => {
        if (cancelled) return;
        setRealAnswer(text);
        if (realMode.error?.stage === STAGE) {
          onRealModeChange?.({ ...realMode, error: null });
        }
      })
      .catch((err: RealModeError) => {
        if (cancelled) return;
        setRealAnswer(null);
        onRealModeChange?.({ ...realMode, error: { ...err, stage: STAGE } });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, prompt, temperature, retryToken, blocked]);

  const answer = isReal ? realAnswer : mockGenerate(query, results);

  // A failed real call must never fall back to showing the simulated
  // answer while the caption still claims "real" -- the same FR-007
  // guarantee EmbeddingStep/RetrievalStep already make.
  const showUnavailable = isReal && realAnswer === null && Boolean(stageError);

  function handleFallback() {
    if (!realMode) return;
    onRealModeChange?.({ ...realMode, active: false, error: null });
  }

  function handleRetry() {
    if (realMode) onRealModeChange?.({ ...realMode, error: null });
    setRetryToken((t) => t + 1);
  }

  // Manually forces a fresh call at the current temperature, distinct
  // from Retry's error-recovery path -- SC-007 requires re-running
  // generation at a fixed temperature to directly observe whether the
  // output stays stable or varies, which changing the slider itself
  // can't demonstrate for two runs at the *same* value.
  function handleRegenerate() {
    setRealAnswer(null);
    setRetryToken((t) => t + 1);
  }

  function handleTemperatureChange(v: number) {
    onParamsChange?.({
      temperature: v,
      fusionN: params?.fusionN ?? 3,
      hydeCount: params?.hydeCount ?? 1,
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <Panel className="p-5">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-doc-teal">
            Assembled prompt sent to the model
          </div>
          <pre
            tabIndex={0}
            className="max-h-[260px] overflow-y-auto whitespace-pre-wrap rounded bg-chart-bg p-3 font-mono text-[11px] leading-relaxed text-ink-300"
          >
            {prompt}
          </pre>
        </Panel>

        {isReal && (
          <Panel className="p-5">
            <Slider
              label="Temperature"
              value={temperature}
              min={0}
              max={1}
              step={0.1}
              onChange={handleTemperatureChange}
              tone="query"
            />
            <p className="mt-2 text-xs text-ink-500">
              Higher values let the model&apos;s wording vary more across
              repeated runs of the same prompt; lower values keep it more
              consistent. Even at the lowest setting, the response is{" "}
              <em>very consistent, not guaranteed identical</em> -- providers
              aren&apos;t perfectly deterministic even at temperature 0.
            </p>
          </Panel>
        )}

        <Panel className="p-5 border-query-amber/30">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-query-amber">
            {isReal ? "Real answer" : "Simulated answer"}
          </div>
          {blocked ? (
            <CostWarningBanner
              totalUsd={sumLedgerUsd(costLedger ?? { entries: [], warningThresholdUsd: 0, pendingResetPrompt: false })}
              thresholdUsd={costLedger?.warningThresholdUsd ?? 0}
              onProceedAnyway={costGate.proceed}
            />
          ) : loading ? (
            <p role="status" className="text-xs italic text-ink-500">
              Generating via {realMode?.provider.label}...
            </p>
          ) : showUnavailable ? (
            <p role="status" className="text-xs italic text-ink-500">
              No real answer available -- see the error below.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-ink-100" data-generated-answer="true">
              {answer}
            </p>
          )}
          {isReal ? (
            <p className="mt-3 text-xs text-ink-500 italic" data-real-disclosure="true">
              Real answer via {realMode?.provider.label} ({realMode?.provider.chatModel}) -- this is
              the model&apos;s actual response to the prompt above, not a simulation.
            </p>
          ) : (
            <p className="mt-3 text-xs text-ink-500 italic" data-simulated-disclosure="true">
              Simulated, not a real model call -- see the code comment in
              GenerationStep.tsx for the one-function swap to a real API.
            </p>
          )}
          {isReal && !loading && !showUnavailable && !stageError && !blocked && (
            <button
              onClick={handleRegenerate}
              className="mt-3 rounded border border-chart-line px-3 py-1.5 text-xs font-medium text-ink-300 hover:text-ink-100 transition-colors"
            >
              Regenerate at this temperature
            </button>
          )}
          {stageError && (
            <div className="mt-3">
              <ErrorBanner
                error={stageError}
                onRetry={handleRetry}
                onFallbackToSimulated={handleFallback}
              />
            </div>
          )}
        </Panel>
      </div>

      <Marginalia eyebrow="Step 5 -- Augmented generation">
        <p>
          This is the &quot;generation&quot; half of RAG: the retrieved
          chunks get stitched into the prompt as context, and the model is
          instructed to answer only from what&apos;s there -- not from its
          own memorized (and possibly outdated or wrong) knowledge.
        </p>
        <p className="mt-3">
          The instruction &quot;if the context doesn&apos;t contain the
          answer, say so&quot; is doing real work: without it, models will
          often answer confidently from their own training data even when
          the retrieved context is unrelated.
        </p>
      </Marginalia>
    </div>
  );
}
