"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { ErrorBanner } from "../realMode/ErrorBanner";
import {
  averageVectors,
  buildHypothesisPrompt,
  buildQueryVariantPrompt,
  rankChunks,
  reciprocalRankFusion,
} from "../realMode/variantExecution";
import { evalCallEstimate } from "../realMode/callEstimate";
import { ragVariants } from "./variantData";
import { createTrackedProvider } from "../costLedger/trackedProvider";
import { useCostGate } from "../costLedger/useCostGate";
import { CostWarningBanner } from "../costLedger/CostWarningBanner";
import { costEstimateUsd } from "../costLedger/costEstimate";
import { openaiPricing } from "../costLedger/pricing";
import { sumLedgerUsd, type CostLedgerEntry, type SessionCostLedger } from "../costLedger/types";
import type { Chunk } from "../lib/sampleDocs";
import type { RealModeProvider } from "../realMode/types";
import type {
  ConfigurationId,
  EvalPair,
  GenerationParams,
  RealModeError,
  RealModeSession,
} from "../realMode/types";

/** FR-011: up to 10 pairs per document, to keep an evaluation run's real API cost bounded. */
const MAX_EVAL_PAIRS = 10;

/** The full `ConfigurationId` domain -- recall@K is shown for all three, satisfying FR-011's "naive RAG and at least one executable variant, side by side." */
const EVAL_CONFIG_IDS: ConfigurationId[] = ["naive", "hyde", "fusion"];

interface ConfigEvalState {
  corpusVectors: number[][] | null;
  /** Populated incrementally, one pair at a time -- already-scored pairs survive a mid-run failure/retry (FR-011). */
  scorePerPair: { evalPairId: string; hit: boolean }[];
  status: "idle" | "running" | "error" | "done";
}
const emptyConfigEvalState = (): ConfigEvalState => ({ corpusVectors: null, scorePerPair: [], status: "idle" });
const emptyConfigStates = (): Record<ConfigurationId, ConfigEvalState> => ({
  naive: emptyConfigEvalState(),
  hyde: emptyConfigEvalState(),
  fusion: emptyConfigEvalState(),
});

/**
 * Runs one configuration's real retrieval for a single EvalPair's question
 * and reports whether the expected chunk landed in the top-K -- the
 * recall@K decision (research.md): "run that configuration's real
 * retrieval for `question` and score 1 if `expectedChunkId` appears
 * anywhere in the top-K results, else 0." Only the retrieval mechanics run
 * (no final-generate call) -- scoring needs a ranking, not a generated
 * answer.
 */
async function scorePair(
  provider: RealModeProvider,
  configId: ConfigurationId,
  question: string,
  expectedChunkId: string,
  corpusVectors: number[][],
  chunks: Chunk[],
  topK: number,
  params: { temperature: number; hydeCount: number; fusionN: number },
): Promise<boolean> {
  let retrieval: { chunk: { id: string } }[];
  if (configId === "naive") {
    const [queryVector] = await provider.embedBatch([question]);
    retrieval = rankChunks(chunks, corpusVectors, queryVector, topK);
  } else if (configId === "hyde") {
    const hypothesisTexts: string[] = [];
    for (let i = 0; i < params.hydeCount; i++) {
      hypothesisTexts.push(await provider.generate(buildHypothesisPrompt(question), { temperature: params.temperature }));
    }
    const hypothesisVectors = await provider.embedBatch(hypothesisTexts);
    const avg = averageVectors(hypothesisVectors);
    retrieval = rankChunks(chunks, corpusVectors, avg, topK);
  } else {
    const raw = await provider.generate(buildQueryVariantPrompt(question, params.fusionN), { temperature: params.temperature });
    const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    const queryTexts = Array.from({ length: params.fusionN }, (_, i) => lines[i] ?? question);
    const perVariantRankings = [];
    for (const text of queryTexts) {
      const [vector] = await provider.embedBatch([text]);
      perVariantRankings.push(rankChunks(chunks, corpusVectors, vector, topK));
    }
    retrieval = reciprocalRankFusion(perVariantRankings).slice(0, topK);
  }
  return retrieval.some((r) => r.chunk.id === expectedChunkId);
}

export function EvalPanel({
  chunks,
  topK,
  onTopKChange,
  realMode,
  onRealModeChange,
  generationParams,
  costLedger,
  onCostLedgerAppend,
}: {
  chunks: Chunk[];
  topK: number;
  onTopKChange: (k: number) => void;
  realMode?: RealModeSession;
  onRealModeChange?: (next: RealModeSession) => void;
  generationParams?: GenerationParams;
  /** 004-real-mode-depth US2: session-wide cost/call ledger (FR-005, FR-007). */
  costLedger?: SessionCostLedger;
  onCostLedgerAppend?: (entry: CostLedgerEntry) => void;
}) {
  const [evalPairs, setEvalPairs] = useState<EvalPair[]>([]);
  const [nextPairNumber, setNextPairNumber] = useState(1);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftChunkId, setDraftChunkId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [configStates, setConfigStates] = useState<Record<ConfigurationId, ConfigEvalState>>(emptyConfigStates());
  const [overallStatus, setOverallStatus] = useState<"idle" | "running" | "error" | "done">("idle");
  const [error, setError] = useState<RealModeError | null>(null);

  const temperature = generationParams?.temperature ?? 0.3;
  const hydeCount = generationParams?.hydeCount ?? 1;
  const fusionN = generationParams?.fusionN ?? 3;

  // FR-007: re-evaluated fresh per distinct evaluation run (research.md's
  // warning-threshold decision), keyed on the pair set and parameters
  // that determine this run's exact call sequence.
  const runCallKey = JSON.stringify([evalPairs.map((p) => p.id), topK, hydeCount, fusionN]);
  const runCostGate = useCostGate(costLedger, runCallKey);

  function handleAddPair() {
    if (evalPairs.length >= MAX_EVAL_PAIRS) return;
    if (draftQuestion.trim().length === 0) {
      setAddError("Enter a question before adding this pair.");
      return;
    }
    if (!draftChunkId) {
      setAddError("Select the chunk this question should retrieve.");
      return;
    }
    setAddError(null);
    setEvalPairs((prev) => [...prev, { id: `eval-${nextPairNumber}`, question: draftQuestion.trim(), expectedChunkId: draftChunkId }]);
    setNextPairNumber((n) => n + 1);
    setDraftQuestion("");
    setDraftChunkId("");
    // A newly added pair invalidates any prior run -- its recall status has never been scored.
    setConfigStates(emptyConfigStates());
    setOverallStatus("idle");
    setError(null);
  }

  function handleRemovePair(id: string) {
    setEvalPairs((prev) => prev.filter((p) => p.id !== id));
    setConfigStates(emptyConfigStates());
    setOverallStatus("idle");
    setError(null);
  }

  function handleFallback() {
    if (!realMode) return;
    onRealModeChange?.({ ...realMode, active: false, error: null });
  }

  async function runEval(startFresh: boolean) {
    if (!realMode?.apiKey || evalPairs.length === 0) return;
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );
    let states = startFresh ? emptyConfigStates() : configStates;
    setConfigStates(states);
    setError(null);
    setOverallStatus("running");

    for (const configId of EVAL_CONFIG_IDS) {
      let state = states[configId];
      if (state.status === "done") continue;

      let corpusVectors = state.corpusVectors;
      if (!corpusVectors) {
        try {
          corpusVectors = await provider.embedBatch(chunks.map((c) => c.text));
        } catch (err) {
          const failedPairId = evalPairs.find((p) => !state.scorePerPair.some((s) => s.evalPairId === p.id))?.id ?? evalPairs[0].id;
          setError({ ...(err as RealModeError), stage: `eval:${failedPairId}:${configId}` });
          setOverallStatus("error");
          return;
        }
        state = { ...state, corpusVectors };
        states = { ...states, [configId]: state };
        setConfigStates(states);
      }

      const alreadyScored = new Set(state.scorePerPair.map((s) => s.evalPairId));
      for (const pair of evalPairs) {
        if (alreadyScored.has(pair.id)) continue;
        let hit: boolean;
        try {
          hit = await scorePair(provider, configId, pair.question, pair.expectedChunkId, corpusVectors, chunks, topK, {
            temperature,
            hydeCount,
            fusionN,
          });
        } catch (err) {
          setError({ ...(err as RealModeError), stage: `eval:${pair.id}:${configId}` });
          setOverallStatus("error");
          return;
        }
        state = { ...state, scorePerPair: [...state.scorePerPair, { evalPairId: pair.id, hit }] };
        states = { ...states, [configId]: state };
        setConfigStates(states);
      }

      state = { ...state, status: "done" };
      states = { ...states, [configId]: state };
      setConfigStates(states);
    }

    setOverallStatus("done");
  }

  const estimate = evalCallEstimate(evalPairs.length, EVAL_CONFIG_IDS, { hydeCount, fusionN });
  // FR-008: same per-configuration $/call breakdown costEstimate.ts uses
  // elsewhere, summed the same way evalCallEstimate() sums call counts.
  const estimateUsd = EVAL_CONFIG_IDS.reduce(
    (sum, id) => sum + evalPairs.length * costEstimateUsd(id, { hydeCount, fusionN }, openaiPricing),
    0,
  );
  const hasAnyScored = EVAL_CONFIG_IDS.some((id) => configStates[id].scorePerPair.length > 0);

  return (
    <Panel className="p-5">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-doc-teal">
        Evaluate retrieval (recall@K)
      </div>
      <p className="mb-4 text-xs leading-relaxed text-ink-500">
        recall@{topK}: the expected chunk appears somewhere in the top {topK} retrieved results. Define up
        to {MAX_EVAL_PAIRS} (question, expected chunk) pairs, then run naive RAG, HyDE, and RAG-Fusion
        against all of them, side by side.
      </p>

      <div className="mb-4 max-w-xs">
        <Slider
          label="Top-K (shared with the pipeline's Retrieval step)"
          value={topK}
          min={1}
          max={5}
          onChange={onTopKChange}
          tone="query"
        />
      </div>

      <div className="mb-4 rounded-lg border border-chart-line bg-chart-bg p-4">
        <label htmlFor="eval-question" className="mb-1 block text-xs font-medium text-ink-300">
          Evaluation question
        </label>
        <input
          id="eval-question"
          value={draftQuestion}
          onChange={(e) => setDraftQuestion(e.target.value)}
          placeholder="A question this document should answer..."
          disabled={evalPairs.length >= MAX_EVAL_PAIRS}
          className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:border-doc-teal focus:outline-none disabled:opacity-40"
        />

        <label htmlFor="eval-expected-chunk" className="mb-1 mt-3 block text-xs font-medium text-ink-300">
          Expected chunk
        </label>
        <select
          id="eval-expected-chunk"
          value={draftChunkId}
          onChange={(e) => setDraftChunkId(e.target.value)}
          disabled={evalPairs.length >= MAX_EVAL_PAIRS}
          className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 focus:border-doc-teal focus:outline-none disabled:opacity-40"
        >
          <option value="">Select the chunk that should be retrieved...</option>
          {chunks.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}: {c.text.slice(0, 70)}…
            </option>
          ))}
        </select>

        {addError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {addError}
          </p>
        )}

        <button
          type="button"
          onClick={handleAddPair}
          disabled={evalPairs.length >= MAX_EVAL_PAIRS}
          className="mt-3 rounded border border-doc-teal/40 px-3 py-1.5 text-xs font-medium text-doc-teal transition-colors hover:bg-doc-teal/10 disabled:opacity-30"
        >
          Add pair
        </button>
        {evalPairs.length >= MAX_EVAL_PAIRS && (
          <p className="mt-2 text-xs text-ink-500">Maximum of {MAX_EVAL_PAIRS} pairs reached.</p>
        )}
      </div>

      {evalPairs.length > 0 && (
        <ol className="mb-4 space-y-1.5">
          {evalPairs.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded bg-chart-bg px-3 py-2 text-xs">
              <span className="text-ink-100">
                {p.question} <span className="text-ink-500">→ expects {p.expectedChunkId}</span>
              </span>
              <button
                type="button"
                onClick={() => handleRemovePair(p.id)}
                aria-label={`Remove evaluation pair: ${p.question}`}
                className="shrink-0 text-ink-500 transition-colors hover:text-danger"
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}

      {evalPairs.length === 0 ? (
        <p className="mb-2 text-xs italic text-ink-500">
          Add at least one (question, expected chunk) pair to run an evaluation.
        </p>
      ) : (
        <p className="mb-2 text-xs text-ink-500">
          Estimated calls for this evaluation run: <span className="font-mono">{estimate}</span> (~$
          <span className="font-mono">{estimateUsd.toFixed(5)}</span>)
        </p>
      )}
      {evalPairs.length > 0 && runCostGate.blocked ? (
        <CostWarningBanner
          totalUsd={sumLedgerUsd(costLedger ?? { entries: [], warningThresholdUsd: 0, pendingResetPrompt: false })}
          thresholdUsd={costLedger?.warningThresholdUsd ?? 0}
          onProceedAnyway={() => {
            runCostGate.proceed();
            runEval(true);
          }}
        />
      ) : (
        /* FR-011: disabled with zero pairs, per the same visible-but-inert
           pattern FR-009 uses for GraphRAG/Self-RAG/Agentic RAG's Run
           control -- stays in the DOM (and therefore check:a11y's
           disabled-control Tab-removal rule applies to it) rather than
           disappearing. */
        <button
          type="button"
          onClick={() => runEval(true)}
          disabled={evalPairs.length === 0 || overallStatus === "running"}
          className="rounded bg-query-amber/20 px-3 py-2 text-xs font-medium text-query-amber transition-colors hover:bg-query-amber/30 disabled:opacity-30"
        >
          {overallStatus === "running" ? "Running evaluation..." : "Run evaluation"}
        </button>
      )}

      {hasAnyScored && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" data-real-disclosure="true">
          {EVAL_CONFIG_IDS.map((id) => {
            const state = configStates[id];
            if (state.scorePerPair.length === 0) return null;
            const recallAtK = state.scorePerPair.filter((s) => s.hit).length / state.scorePerPair.length;
            return (
              <div key={id} className="rounded bg-chart-bg p-3">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-doc-teal">
                  {ragVariants.find((v) => v.id === id)!.name}
                </div>
                <div className="text-lg font-mono text-ink-100">{Math.round(recallAtK * 100)}%</div>
                <div className="mt-1 text-[10px] text-ink-500">
                  {state.status === "done"
                    ? `${state.scorePerPair.length}/${evalPairs.length} pairs scored`
                    : `Scoring... ${state.scorePerPair.length}/${evalPairs.length}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {hasAnyScored && (
        <p className="mt-2 text-xs italic text-ink-500" data-real-disclosure="true">
          Real retrieval via {realMode?.provider.label} -- recall@{topK}: expected chunk appears in top {topK}{" "}
          results.
        </p>
      )}

      {error && (
        <div className="mt-3">
          <ErrorBanner error={error} onRetry={() => runEval(false)} onFallbackToSimulated={handleFallback} />
        </div>
      )}
    </Panel>
  );
}
