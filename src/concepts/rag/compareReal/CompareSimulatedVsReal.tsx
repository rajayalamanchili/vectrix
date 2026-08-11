"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { sampleDocs, chunkText, type SampleDoc } from "../lib/sampleDocs";
import { embed } from "../lib/mockEmbedding";
import { StarChart, type StarPoint } from "@/components/charts/StarChart";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { ErrorBanner } from "../realMode/ErrorBanner";
import { CustomDocumentInput } from "../realMode/CustomDocumentInput";
import { projectTo2D } from "../realMode/pca";
import {
  rankChunks,
  averageVectors,
  reciprocalRankFusion,
  buildHypothesisPrompt,
  buildQueryVariantPrompt,
} from "../realMode/variantExecution";
import { callsPerConfiguration } from "../realMode/callEstimate";
import { ragVariants } from "../variants/variantData";
import { createTrackedProvider } from "../costLedger/trackedProvider";
import { useCostGate } from "../costLedger/useCostGate";
import { CostWarningBanner } from "../costLedger/CostWarningBanner";
import { costEstimateUsd } from "../costLedger/costEstimate";
import { openaiPricing } from "../costLedger/pricing";
import { sumLedgerUsd, type CostLedgerEntry, type SessionCostLedger } from "../costLedger/types";
import type { RetrievedChunk } from "../pipeline/steps/RetrievalStep";
import type { ConfigurationId, GenerationParams, RealModeError, RealModeSession } from "../realMode/types";
import type { ChunkRankPair, RealHalfStatus } from "./types";

/** Same fixed defaults VariantsComparison.tsx already uses (contracts/comparison-contract.md). */
const CHUNK_SIZE = 60;
const CHUNK_OVERLAP = 15;

const EXECUTABLE_CONFIG_IDS: ConfigurationId[] = ["naive", "hyde", "fusion"];

/** contracts/comparison-contract.md's merge function. */
function pairRanks(simulated: RetrievedChunk[], real: RetrievedChunk[] | null): ChunkRankPair[] {
  const allChunkIds = new Set([...simulated.map((r) => r.chunk.id), ...(real ?? []).map((r) => r.chunk.id)]);
  return Array.from(allChunkIds).map((chunkId) => ({
    chunkId,
    simulatedRank: simulated.findIndex((r) => r.chunk.id === chunkId) + 1 || null,
    realRank: real ? real.findIndex((r) => r.chunk.id === chunkId) + 1 || null : null,
  }));
}

interface RunState {
  status: "idle" | "running" | "done" | "error";
  ranking: RetrievedChunk[] | null;
  corpusVectors: number[][] | null;
  /** A "queryish" vector for the 2D chart's beacon only -- never used for scoring (research.md's per-configuration ranking mechanics own that). */
  beaconVector: number[] | null;
  error: RealModeError | null;
  /** True once this run replaces a prior done/error result for the same (doc, query, configuration) -- drives the Edge Cases "results may differ" note. */
  rerun: boolean;
}
const emptyRunState = (): RunState => ({
  status: "idle",
  ranking: null,
  corpusVectors: null,
  beaconVector: null,
  error: null,
  rerun: false,
});

export function CompareSimulatedVsReal({
  realMode,
  onRealModeChange,
  generationParams,
  topK,
  initialConfigurationId,
  costLedger,
  onCostLedgerAppend,
  onLedgerResetPrompt,
}: {
  realMode?: RealModeSession;
  onRealModeChange?: (next: RealModeSession) => void;
  generationParams?: GenerationParams;
  topK: number;
  /** Test/check-only seam (scripts/checks/simulated-disclosure.ts): lets a static render exercise the non-naive approximation-caveat branch without simulating a click. Defaults to "naive" for every real caller. */
  initialConfigurationId?: ConfigurationId;
  /** 004-real-mode-depth US2: session-wide cost/call ledger (FR-005, FR-006, FR-007). */
  costLedger?: SessionCostLedger;
  onCostLedgerAppend?: (entry: CostLedgerEntry) => void;
  onLedgerResetPrompt?: () => void;
}) {
  // Independent document/query state (research.md) -- mirrors
  // VariantsComparison.tsx's own precedent, not shared with Pipeline
  // Walkthrough or Compare Variants.
  const [docId, setDocId] = useState("coffee");
  const [customMode, setCustomMode] = useState<"sample" | "custom">("sample");
  const [customText, setCustomText] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [configurationId, setConfigurationId] = useState<ConfigurationId>(initialConfigurationId ?? "naive");
  const [runState, setRunState] = useState<RunState>(emptyRunState());
  const [draftKey, setDraftKey] = useState("");
  const [keyAttempted, setKeyAttempted] = useState(false);
  const runTokenRef = useRef(0);

  const customDoc: SampleDoc | null = useMemo(
    () =>
      customMode === "custom"
        ? { id: "custom", title: "Custom document", text: customText, sampleQueries: customQuestion ? [customQuestion] : [] }
        : null,
    [customMode, customText, customQuestion],
  );
  const doc = customDoc ?? sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];
  const [query, setQuery] = useState(doc.sampleQueries[0] ?? "");
  const chunks = useMemo(() => chunkText(doc.text, CHUNK_SIZE, CHUNK_OVERLAP), [doc]);

  const temperature = generationParams?.temperature ?? 0.3;
  const hydeCount = generationParams?.hydeCount ?? 1;
  const fusionN = generationParams?.fusionN ?? 3;

  function resetRealHalf() {
    runTokenRef.current += 1;
    setRunState(emptyRunState());
  }

  function handleDocSelect(id: string) {
    setDocId(id);
    const newDoc = sampleDocs.find((d) => d.id === id) ?? sampleDocs[0];
    setQuery(newDoc.sampleQueries[0] ?? "");
    resetRealHalf();
    onLedgerResetPrompt?.();
  }
  function handleUseCustomDocument() {
    setCustomMode("custom");
    setQuery(customQuestion);
    resetRealHalf();
    onLedgerResetPrompt?.();
  }
  function handleRevertToSample() {
    setCustomMode("sample");
    setCustomText("");
    setCustomQuestion("");
    const newDoc = sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];
    setQuery(newDoc.sampleQueries[0] ?? "");
    resetRealHalf();
    onLedgerResetPrompt?.();
  }
  function handleConfigSelect(id: ConfigurationId) {
    // research.md's "Configuration selector during an in-flight Real
    // half" decision -- guard the state change itself, not just the
    // button's visual/aria-disabled state, so a stray Enter/Space can't
    // orphan an in-flight result either.
    if (runState.status === "running") return;
    setConfigurationId(id);
    resetRealHalf();
  }

  // Simulated half: computed synchronously, always the naive-RAG ranking
  // regardless of configurationId (research.md's "Simulated half for
  // HyDE/RAG-Fusion configurations" decision). Never blocks on network,
  // never shows a loading state -- Constitution Principle V.
  const simulatedRanking = useMemo(() => {
    const queryVector = embed(query).vector;
    const corpusVectors = chunks.map((c) => embed(c.text).vector);
    return rankChunks(chunks, corpusVectors, queryVector, topK);
  }, [chunks, query, topK]);
  const simulatedIsApproximation = configurationId !== "naive";

  const simulatedQueryEmbedding = useMemo(() => embed(query), [query]);
  const simulatedPoints: StarPoint[] = useMemo(
    () =>
      chunks.map((c, i) => {
        const { x, y } = embed(c.text);
        const isTop = simulatedRanking.some((r) => r.chunk.id === c.id);
        const score = simulatedRanking.find((r) => r.chunk.id === c.id)?.score;
        return { id: c.id, x, y, label: `#${i}`, score: isTop ? score : undefined, highlighted: isTop };
      }),
    [chunks, simulatedRanking],
  );

  const hasKey = Boolean(realMode?.apiKey);
  const realStatus: RealHalfStatus = !hasKey
    ? "needs-key"
    : runState.status === "idle"
      ? "awaiting-confirmation"
      : runState.status;
  // This view's Real half never issues a final-answer generate call --
  // it compares retrieval rankings only (contracts/comparison-
  // contract.md's Non-goals), unlike VariantsComparison's runNaive/
  // runHyde/runFusion which each end with one. Its true call count and
  // cost are therefore exactly one generate call fewer than
  // callsPerConfiguration()/costEstimateUsd() assume for every
  // configuration.
  const realCallEstimate = callsPerConfiguration(configurationId, { hydeCount, fusionN }) - 1;
  const realCostEstimateUsd =
    costEstimateUsd(configurationId, { hydeCount, fusionN }, openaiPricing) - openaiPricing.generateCallUsd;

  // FR-007: re-evaluated fresh per distinct run (research.md's
  // warning-threshold decision), keyed on exactly what this run would
  // execute against.
  const runCallKey = JSON.stringify([docId, customMode, customText, query, configurationId]);
  const runCostGate = useCostGate(costLedger, runCallKey);

  const realProjection = useMemo(() => {
    if (!runState.corpusVectors || !runState.beaconVector) return null;
    const projected = projectTo2D([...runState.corpusVectors, runState.beaconVector]);
    return {
      chunkPoints: projected.slice(0, runState.corpusVectors.length),
      queryPoint: projected[projected.length - 1],
    };
  }, [runState.corpusVectors, runState.beaconVector]);

  const realPoints: StarPoint[] = useMemo(() => {
    if (!realProjection || !runState.ranking) return [];
    return chunks.map((c, i) => {
      const isTop = runState.ranking!.some((r) => r.chunk.id === c.id);
      const score = runState.ranking!.find((r) => r.chunk.id === c.id)?.score;
      const coords = realProjection.chunkPoints[i];
      return { id: c.id, x: coords.x, y: coords.y, label: `#${i}`, score: isTop ? score : undefined, highlighted: isTop };
    });
  }, [chunks, realProjection, runState.ranking]);

  async function runReal() {
    if (!realMode?.apiKey) return;
    const wasRerun = runState.status === "done" || runState.status === "error";
    const token = ++runTokenRef.current;
    setRunState({ ...emptyRunState(), status: "running", rerun: wasRerun });
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );

    try {
      const corpusVectors = await provider.embedBatch(chunks.map((c) => c.text));
      if (token !== runTokenRef.current) return;

      let ranking: RetrievedChunk[];
      let beaconVector: number[];

      if (configurationId === "naive") {
        const [queryVector] = await provider.embedBatch([query]);
        if (token !== runTokenRef.current) return;
        ranking = rankChunks(chunks, corpusVectors, queryVector, topK);
        beaconVector = queryVector;
      } else if (configurationId === "hyde") {
        const hypothesisTexts: string[] = [];
        for (let i = 0; i < hydeCount; i++) {
          const text = await provider.generate(buildHypothesisPrompt(query), { temperature });
          if (token !== runTokenRef.current) return;
          hypothesisTexts.push(text);
        }
        const hypothesisVectors = await provider.embedBatch(hypothesisTexts);
        if (token !== runTokenRef.current) return;
        const avg = averageVectors(hypothesisVectors);
        ranking = rankChunks(chunks, corpusVectors, avg, topK);
        beaconVector = avg;
      } else {
        const raw = await provider.generate(buildQueryVariantPrompt(query, fusionN), { temperature });
        if (token !== runTokenRef.current) return;
        const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
        const queryTexts = Array.from({ length: fusionN }, (_, i) => lines[i] ?? query);
        const variantVectors: number[][] = [];
        const variantRankings: RetrievedChunk[][] = [];
        for (const text of queryTexts) {
          const [vector] = await provider.embedBatch([text]);
          if (token !== runTokenRef.current) return;
          variantVectors.push(vector);
          variantRankings.push(rankChunks(chunks, corpusVectors, vector, topK));
        }
        ranking = reciprocalRankFusion(variantRankings).slice(0, topK);
        beaconVector = averageVectors(variantVectors);
      }

      setRunState({ status: "done", ranking, corpusVectors, beaconVector, error: null, rerun: wasRerun });
    } catch (err) {
      if (token !== runTokenRef.current) return;
      setRunState({ ...emptyRunState(), status: "error", error: err as RealModeError, rerun: wasRerun });
    }
  }

  function handleFallback() {
    if (!realMode) return;
    onRealModeChange?.({ ...realMode, active: false, error: null });
  }

  function handleKeySubmit(e: FormEvent) {
    e.preventDefault();
    setKeyAttempted(true);
    if (!realMode || !realMode.provider.keyFormatPattern.test(draftKey)) return;
    onRealModeChange?.({ ...realMode, active: true, apiKey: draftKey, error: null });
  }

  const pairs = useMemo(() => pairRanks(simulatedRanking, runState.ranking), [simulatedRanking, runState.ranking]);
  const chunkTextById = useMemo(() => new Map(chunks.map((c) => [c.id, c.text])), [chunks]);

  const configName = (id: ConfigurationId) => ragVariants.find((v) => v.id === id)!.name;
  const showFormatError = keyAttempted && realMode && !realMode.provider.keyFormatPattern.test(draftKey);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <Panel className="p-5">
          {customMode === "sample" && (
            <div className="mb-4 flex flex-wrap gap-2">
              {sampleDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDocSelect(d.id)}
                  aria-pressed={d.id === docId}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    d.id === docId
                      ? "border-doc-teal bg-doc-teal/15 text-doc-teal"
                      : "border-chart-line text-ink-500 hover:text-ink-300"
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>
          )}
          <CustomDocumentInput
            mode={customMode}
            customText={customText}
            customQuestion={customQuestion}
            onCustomTextChange={setCustomText}
            onCustomQuestionChange={setCustomQuestion}
            onUseCustom={handleUseCustomDocument}
            onRevertToSample={handleRevertToSample}
          />
          {customMode === "sample" && (
            <div className="mt-4">
              <div className="mb-1.5 flex flex-wrap gap-2">
                {doc.sampleQueries.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      q === query
                        ? "border-query-amber bg-query-amber/15 text-query-amber"
                        : "border-chart-line text-ink-500 hover:text-ink-300"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Or type your own question..."
                aria-label="Question to run against the selected document"
                className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:border-query-amber"
              />
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-doc-teal">Configuration</div>
          <div className="flex flex-wrap gap-2">
            {EXECUTABLE_CONFIG_IDS.map((id) => (
              <button
                key={id}
                onClick={() => handleConfigSelect(id)}
                aria-pressed={configurationId === id}
                aria-disabled={runState.status === "running"}
                aria-describedby={runState.status === "running" ? "compare-real-config-locked" : undefined}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  configurationId === id
                    ? "border-query-amber bg-query-amber/15 text-query-amber"
                    : "border-chart-line text-ink-500 hover:text-ink-300"
                } ${runState.status === "running" ? "opacity-50" : ""}`}
              >
                {configName(id)}
              </button>
            ))}
          </div>
          {runState.status === "running" && (
            <p id="compare-real-config-locked" className="mt-2 text-xs italic text-ink-500">
              Waiting for the current Real Mode call to finish before switching configurations.
            </p>
          )}
        </Panel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-doc-teal">Simulated</span>
            </div>
            <StarChart
              points={simulatedPoints}
              beacon={{ x: simulatedQueryEmbedding.x, y: simulatedQueryEmbedding.y, label: "query" }}
            />
            <ol className="mt-3 space-y-1.5">
              {simulatedRanking.map((r, i) => (
                <li key={r.chunk.id} className="flex gap-3 rounded bg-query-amber/10 px-3 py-2 text-xs">
                  <span className="font-mono text-query-amber shrink-0">
                    {i + 1}. {r.score.toFixed(3)}
                  </span>
                  <span className="text-ink-100 leading-relaxed">{r.chunk.text}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs italic text-ink-500" data-simulated-disclosure="true">
              Simulated Mode: deterministic bag-of-words embedding, not a real model -- always naive
              RAG&apos;s ranking, regardless of the configuration selected above.
              {simulatedIsApproximation && (
                <>
                  {" "}
                  Simulated Mode approximates {configName(configurationId)} as plain retrieval here,
                  since it has no model to generate hypotheses or reworded queries.
                </>
              )}
            </p>
          </Panel>

          <Panel className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-doc-teal">Real</span>
            </div>

            {/* Real Mode's own toggle/key form (RagConcept.tsx's chrome,
                shared by every tab) already shows its key-entry prompt
                once `realMode.active` is true -- rendering a second,
                independent form here at the same time would duplicate an
                accessible-name-identical input on the page. Only render
                this view's own inline prompt (FR-004a) while that global
                prompt genuinely isn't visible yet, i.e. Real Mode was
                never turned on at all; once it is, point at the
                already-visible one instead. */}
            {realStatus === "needs-key" && realMode && !realMode.active && (
              <div className="rounded-lg border border-chart-line bg-chart-bg-raised p-4">
                <div data-key-disclaimer="true" className="space-y-2 text-xs leading-relaxed text-ink-300">
                  <p>
                    <strong className="text-ink-100">Where your key goes:</strong> Sent directly from
                    this browser to {realMode.provider.label}&apos;s API -- never to any server this
                    project runs.
                  </p>
                  <p>
                    <strong className="text-ink-100">Use at your own risk:</strong> Held in memory for
                    this browser tab only; closing or refreshing clears it immediately.
                  </p>
                </div>
                <form onSubmit={handleKeySubmit} className="mt-4 space-y-2">
                  <label htmlFor="compare-real-key-input" className="block text-xs font-medium text-ink-300">
                    {realMode.provider.label} API key
                  </label>
                  <input
                    id="compare-real-key-input"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={draftKey}
                    onChange={(e) => setDraftKey(e.target.value)}
                    aria-describedby={showFormatError ? "compare-real-key-error" : undefined}
                    aria-invalid={showFormatError ? true : undefined}
                    className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 focus:border-doc-teal focus:outline-none"
                  />
                  {showFormatError && (
                    <p id="compare-real-key-error" className="text-xs text-danger">
                      That doesn&apos;t look like a valid {realMode.provider.label} API key.
                    </p>
                  )}
                  <button
                    type="submit"
                    className="rounded bg-doc-teal/20 px-3 py-1.5 text-xs font-medium text-doc-teal hover:bg-doc-teal/30 transition-colors"
                  >
                    Activate Real Mode
                  </button>
                </form>
              </div>
            )}
            {realStatus === "needs-key" && realMode && realMode.active && (
              <p className="text-xs italic text-ink-500">
                Enter your {realMode.provider.label} API key above to activate the Real half.
              </p>
            )}

            {realStatus === "awaiting-confirmation" && runCostGate.blocked && (
              <CostWarningBanner
                totalUsd={sumLedgerUsd(costLedger ?? { entries: [], warningThresholdUsd: 0, pendingResetPrompt: false })}
                thresholdUsd={costLedger?.warningThresholdUsd ?? 0}
                onProceedAnyway={() => {
                  runCostGate.proceed();
                  void runReal();
                }}
              />
            )}
            {realStatus === "awaiting-confirmation" && !runCostGate.blocked && (
              <div>
                <p className="mb-3 text-xs text-ink-500">
                  Estimated calls for this run: <span className="font-mono">{realCallEstimate}</span> (~$
                  <span className="font-mono">{realCostEstimateUsd.toFixed(5)}</span>, {openaiPricing.label})
                </p>
                <button
                  onClick={() => void runReal()}
                  disabled={!query}
                  className="rounded bg-query-amber/20 px-3 py-2 text-xs font-medium text-query-amber transition-colors hover:bg-query-amber/30 disabled:opacity-30"
                >
                  Run {configName(configurationId)} for real →
                </button>
              </div>
            )}

            {realStatus === "running" && (
              <p role="status" className="p-6 text-xs italic text-ink-500">
                Running {configName(configurationId)} via {realMode?.provider.label}...
              </p>
            )}

            {realStatus === "done" && runState.ranking && (
              <>
                <StarChart points={realPoints} beacon={realProjection ? { x: realProjection.queryPoint.x, y: realProjection.queryPoint.y, label: "query" } : undefined} />
                <ol className="mt-3 space-y-1.5">
                  {runState.ranking.map((r, i) => (
                    <li key={r.chunk.id} className="flex gap-3 rounded bg-query-amber/10 px-3 py-2 text-xs">
                      <span className="font-mono text-query-amber shrink-0">
                        {i + 1}. {r.score.toFixed(3)}
                      </span>
                      <span className="text-ink-100 leading-relaxed">{r.chunk.text}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs italic text-ink-500" data-real-disclosure="true">
                  Real {configName(configurationId)} execution via {realMode?.provider.label} -- not a
                  simulation.
                </p>
                <button
                  onClick={() => {
                    // FR-007: a re-run is a new real call -- route back
                    // through the "awaiting-confirmation" gate rather
                    // than firing directly, so a since-crossed threshold
                    // is caught here too, not just on the first run.
                    if (runCostGate.blocked) {
                      resetRealHalf();
                    } else {
                      void runReal();
                    }
                  }}
                  className="mt-3 rounded border border-chart-line px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
                >
                  Run again
                </button>
              </>
            )}

            {realStatus === "error" && runState.error && (
              <ErrorBanner error={runState.error} onRetry={() => void runReal()} onFallbackToSimulated={handleFallback} />
            )}
          </Panel>
        </div>

        <Panel className="p-4">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-query-amber">
            Chunk ranks -- Simulated vs Real
          </h2>
          {runState.rerun && runState.status === "done" && (
            <p className="mb-2 text-xs italic text-ink-500">
              Real Mode re-ran; results may differ from the last run.
            </p>
          )}
          <table aria-label="Chunk ranks, simulated compared to real" className="w-full text-xs">
            <thead>
              <tr className="text-left text-ink-500">
                <th className="pb-1.5 pr-3 font-mono text-[10px] uppercase tracking-wider">Chunk</th>
                <th className="pb-1.5 pr-3 font-mono text-[10px] uppercase tracking-wider">Simulated rank</th>
                <th className="pb-1.5 font-mono text-[10px] uppercase tracking-wider">Real rank</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.chunkId} className="border-t border-chart-line">
                  <td className="py-1.5 pr-3 text-ink-100">{(chunkTextById.get(p.chunkId) ?? "").slice(0, 60)}…</td>
                  <td className="py-1.5 pr-3 font-mono text-ink-300">{p.simulatedRank ?? "—"}</td>
                  <td className="py-1.5 font-mono text-ink-300">{p.realRank ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Marginalia eyebrow="Compare Simulated vs Real">
        <p>
          Simulated Mode&apos;s deterministic ranking, side by side with what the same document and
          question actually retrieve from a live model -- the gap between them is the whole point of
          this view.
        </p>
        <p className="mt-3">
          HyDE and RAG-Fusion have no simulated equivalent -- there&apos;s no model in Simulated Mode
          to generate a hypothesis or reworded queries, so the Simulated side always shows naive RAG&apos;s
          ranking as an honest approximation, never a fabricated one.
        </p>
        <p className="mt-3">
          Close agreement between the two sides is just as meaningful a result as wide divergence --
          neither is styled differently here.
        </p>
      </Marginalia>
    </div>
  );
}
