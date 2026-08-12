"use client";

import { useMemo, useState } from "react";
import { ragVariants } from "./variantData";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Slider } from "@/components/ui/Slider";
import { FlowDiagram } from "@/components/charts/FlowDiagram";
import { sampleDocs, chunkText, type SampleDoc } from "../lib/sampleDocs";
import { ErrorBanner } from "../realMode/ErrorBanner";
import { CustomDocumentInput } from "../realMode/CustomDocumentInput";
import { EvalPanel } from "./EvalPanel";
import {
  averageVectors,
  reciprocalRankFusion,
  rankChunks,
  buildHypothesisPrompt,
  buildQueryVariantPrompt,
} from "../realMode/variantExecution";
import { hydeCallCount, fusionCallCount, naiveCallCount } from "../realMode/callEstimate";
import { createTrackedProvider } from "../costLedger/trackedProvider";
import { isOverBudget, useCostGate } from "../costLedger/useCostGate";
import { CostWarningBanner } from "../costLedger/CostWarningBanner";
import { costEstimateUsd } from "../costLedger/costEstimate";
import { openaiPricing } from "../costLedger/pricing";
import { sumLedgerUsd, type CostLedgerEntry, type SessionCostLedger } from "../costLedger/types";
import type { RetrievedChunk } from "../pipeline/steps/RetrievalStep";
import type { ConfigurationId, GenerationParams, RealModeError, RealModeSession } from "../realMode/types";

/** FR-009: only these three variants genuinely execute in Real Mode this milestone. */
const EXECUTABLE_VARIANT_IDS: ConfigurationId[] = ["naive", "hyde", "fusion"];
function isExecutableId(id: string): id is ConfigurationId {
  return (EXECUTABLE_VARIANT_IDS as string[]).includes(id);
}

/** No Top-K/chunking controls exist in Compare Variants (Milestone 1 scope) -- fixed defaults, matching Pipeline Walkthrough's own defaults. */
const CHUNK_SIZE = 60;
const CHUNK_OVERLAP = 15;
const RESULT_TOP_K = 3;

function buildPrompt(query: string, results: RetrievedChunk[]): string {
  const contextBlock = results.map((r, i) => `[${i + 1}] ${r.chunk.text}`).join("\n\n");
  return `You are a helpful assistant. Answer the question using ONLY the context below. If the context doesn't contain the answer, say so.

Context:
${contextBlock || "(no context retrieved)"}

Question: ${query || "(no query yet)"}`;
}

type RunStatus = "idle" | "running" | "error" | "done";

interface NaiveRunState {
  status: RunStatus;
  corpusVectors: number[][] | null;
  queryVector: number[] | null;
  retrieval: RetrievedChunk[] | null;
  finalAnswer: string | null;
  error: RealModeError | null;
}
const emptyNaiveState = (): NaiveRunState => ({
  status: "idle",
  corpusVectors: null,
  queryVector: null,
  retrieval: null,
  finalAnswer: null,
  error: null,
});

interface HydeRunState {
  status: RunStatus;
  corpusVectors: number[][] | null;
  hypothesisTexts: string[];
  hypothesisVectors: number[][] | null;
  averagedRetrieval: RetrievedChunk[] | null;
  finalAnswer: string | null;
  error: RealModeError | null;
}
const emptyHydeState = (): HydeRunState => ({
  status: "idle",
  corpusVectors: null,
  hypothesisTexts: [],
  hypothesisVectors: null,
  averagedRetrieval: null,
  finalAnswer: null,
  error: null,
});

interface FusionVariant {
  text: string;
  vector: number[];
  retrieval: RetrievedChunk[];
}
interface FusionRunState {
  status: RunStatus;
  corpusVectors: number[][] | null;
  queryTexts: string[] | null;
  variants: FusionVariant[];
  fusedRetrieval: RetrievedChunk[] | null;
  finalAnswer: string | null;
  error: RealModeError | null;
}
const emptyFusionState = (): FusionRunState => ({
  status: "idle",
  corpusVectors: null,
  queryTexts: null,
  variants: [],
  fusedRetrieval: null,
  finalAnswer: null,
  error: null,
});

export function VariantsComparison({
  realMode,
  onRealModeChange,
  generationParams,
  onGenerationParamsChange,
  topK,
  onTopKChange,
  costLedger,
  onCostLedgerAppend,
  onLedgerResetPrompt,
}: {
  realMode?: RealModeSession;
  onRealModeChange?: (next: RealModeSession) => void;
  generationParams?: GenerationParams;
  onGenerationParamsChange?: (next: GenerationParams) => void;
  /** Lifted to RagConcept.tsx (US6/FR-011) -- EvalPanel's recall@K reuses this same value, not a separate eval-only K. */
  topK: number;
  onTopKChange: (k: number) => void;
  /** 004-real-mode-depth US2: session-wide cost/call ledger (FR-005, FR-006, FR-007). */
  costLedger?: SessionCostLedger;
  onCostLedgerAppend?: (entry: CostLedgerEntry) => void;
  onLedgerResetPrompt?: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [browsing, setBrowsing] = useState(false);

  // US5: independent document/query state (research.md's independent-state
  // decision) -- its own CustomDocumentInput instance, not shared with
  // Pipeline Walkthrough.
  const [docId, setDocId] = useState("coffee");
  const [customMode, setCustomMode] = useState<"sample" | "custom">("sample");
  const [customText, setCustomText] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");

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

  const [selectedConfigId, setSelectedConfigId] = useState<ConfigurationId>("naive");
  const [naiveState, setNaiveState] = useState<NaiveRunState>(emptyNaiveState());
  const [hydeState, setHydeState] = useState<HydeRunState>(emptyHydeState());
  const [fusionState, setFusionState] = useState<FusionRunState>(emptyFusionState());

  const temperature = generationParams?.temperature ?? 0.3;
  const hydeCount = generationParams?.hydeCount ?? 1;
  const fusionN = generationParams?.fusionN ?? 3;

  // FR-007: re-evaluated fresh per distinct run (research.md's
  // warning-threshold decision), keyed on the currently selected
  // configuration and document/question -- a genuinely new run re-arms
  // the gate even if the same configuration was already run once.
  const runCallKey = `${selectedConfigId}:${docId}:${customMode}:${query}`;
  const runCostGate = useCostGate(costLedger, runCallKey);

  function resetAllRunStates() {
    setNaiveState(emptyNaiveState());
    setHydeState(emptyHydeState());
    setFusionState(emptyFusionState());
  }

  // A document switch invalidates every configuration's prior results --
  // the same class of invalidation Pipeline Walkthrough already applies
  // on its own document switch (spec.md 001 Edge Cases' precedent).
  function handleDocSelect(id: string) {
    setDocId(id);
    const newDoc = sampleDocs.find((d) => d.id === id) ?? sampleDocs[0];
    setQuery(newDoc.sampleQueries[0] ?? "");
    resetAllRunStates();
    onLedgerResetPrompt?.();
  }
  function handleUseCustomDocument() {
    setCustomMode("custom");
    setQuery(customQuestion);
    resetAllRunStates();
    onLedgerResetPrompt?.();
  }
  function handleRevertToSample() {
    setCustomMode("sample");
    setCustomText("");
    setCustomQuestion("");
    const newDoc = sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];
    setQuery(newDoc.sampleQueries[0] ?? "");
    resetAllRunStates();
    onLedgerResetPrompt?.();
  }

  function toggle(id: string) {
    setBrowsing(false);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  function handleFallback() {
    if (!realMode) return;
    onRealModeChange?.({ ...realMode, active: false, error: null });
  }

  async function runNaive(startFresh: boolean) {
    if (!realMode?.apiKey) return;
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );
    let corpusVectors = startFresh ? null : naiveState.corpusVectors;
    let queryVector = startFresh ? null : naiveState.queryVector;
    let retrieval = startFresh ? null : naiveState.retrieval;

    setNaiveState((s) => ({ ...(startFresh ? emptyNaiveState() : s), status: "running", error: null }));

    try {
      if (!corpusVectors) {
        corpusVectors = await provider.embedBatch(chunks.map((c) => c.text));
        setNaiveState((s) => ({ ...s, corpusVectors }));
      }
      if (!queryVector) {
        const [v] = await provider.embedBatch([query]);
        queryVector = v;
        setNaiveState((s) => ({ ...s, queryVector }));
      }
      if (!retrieval) {
        retrieval = rankChunks(chunks, corpusVectors, queryVector, RESULT_TOP_K);
        setNaiveState((s) => ({ ...s, retrieval }));
      }
      const finalAnswer = await provider.generate(buildPrompt(query, retrieval), { temperature });
      setNaiveState((s) => ({ ...s, finalAnswer, status: "done" }));
    } catch (err) {
      const stage = !corpusVectors ? "corpus-embed" : !queryVector ? "query-embed" : "final-generate";
      setNaiveState((s) => ({ ...s, status: "error", error: { ...(err as RealModeError), stage } }));
    }
  }

  async function runHyde(startFresh: boolean) {
    if (!realMode?.apiKey) return;
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );
    let corpusVectors = startFresh ? null : hydeState.corpusVectors;
    let hypothesisTexts = startFresh ? [] : [...hydeState.hypothesisTexts];
    let hypothesisVectors = startFresh ? null : hydeState.hypothesisVectors;
    let averagedRetrieval = startFresh ? null : hydeState.averagedRetrieval;

    setHydeState((s) => ({ ...(startFresh ? emptyHydeState() : s), status: "running", error: null }));

    try {
      if (!corpusVectors) {
        corpusVectors = await provider.embedBatch(chunks.map((c) => c.text));
        setHydeState((s) => ({ ...s, corpusVectors }));
      }
      // FR-008: hypotheses generate serially, one call at a time, each
      // individually visible before retrieval runs (Acceptance Scenario 1/6).
      while (hypothesisTexts.length < hydeCount) {
        const text = await provider.generate(buildHypothesisPrompt(query), { temperature });
        hypothesisTexts = [...hypothesisTexts, text];
        setHydeState((s) => ({ ...s, hypothesisTexts }));
      }
      if (!hypothesisVectors) {
        hypothesisVectors = await provider.embedBatch(hypothesisTexts);
        setHydeState((s) => ({ ...s, hypothesisVectors }));
      }
      if (!averagedRetrieval) {
        const avg = averageVectors(hypothesisVectors);
        averagedRetrieval = rankChunks(chunks, corpusVectors, avg, RESULT_TOP_K);
        setHydeState((s) => ({ ...s, averagedRetrieval }));
      }
      const finalAnswer = await provider.generate(buildPrompt(query, averagedRetrieval), { temperature });
      setHydeState((s) => ({ ...s, finalAnswer, status: "done" }));
    } catch (err) {
      const stage = !corpusVectors
        ? "corpus-embed"
        : hypothesisTexts.length < hydeCount
          ? "hypothesis-generate"
          : !hypothesisVectors
            ? "hypothesis-embed"
            : "final-generate";
      setHydeState((s) => ({ ...s, status: "error", hypothesisTexts, error: { ...(err as RealModeError), stage } }));
    }
  }

  async function runFusion(startFresh: boolean) {
    if (!realMode?.apiKey) return;
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );
    let corpusVectors = startFresh ? null : fusionState.corpusVectors;
    let queryTexts = startFresh ? null : fusionState.queryTexts;
    let variants = startFresh ? [] : [...fusionState.variants];
    let fusedRetrieval = startFresh ? null : fusionState.fusedRetrieval;

    setFusionState((s) => ({ ...(startFresh ? emptyFusionState() : s), status: "running", error: null }));

    try {
      if (!corpusVectors) {
        corpusVectors = await provider.embedBatch(chunks.map((c) => c.text));
        setFusionState((s) => ({ ...s, corpusVectors }));
      }
      if (!queryTexts) {
        const raw = await provider.generate(buildQueryVariantPrompt(query, fusionN), { temperature });
        const lines = raw
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        queryTexts = Array.from({ length: fusionN }, (_, i) => lines[i] ?? query);
        setFusionState((s) => ({ ...s, queryTexts }));
      }
      // FR-008: each variant is embedded and retrieved independently and
      // serially, so its own per-variant ranking stays inspectable before
      // fusion happens (Acceptance Scenario 2).
      while (variants.length < queryTexts.length) {
        const text = queryTexts[variants.length];
        const [vector] = await provider.embedBatch([text]);
        const retrieval = rankChunks(chunks, corpusVectors, vector, RESULT_TOP_K);
        variants = [...variants, { text, vector, retrieval }];
        setFusionState((s) => ({ ...s, variants }));
      }
      if (!fusedRetrieval) {
        fusedRetrieval = reciprocalRankFusion(variants.map((v) => v.retrieval)).slice(0, RESULT_TOP_K);
        setFusionState((s) => ({ ...s, fusedRetrieval }));
      }
      const finalAnswer = await provider.generate(buildPrompt(query, fusedRetrieval), { temperature });
      setFusionState((s) => ({ ...s, finalAnswer, status: "done" }));
    } catch (err) {
      const stage = !corpusVectors
        ? "corpus-embed"
        : !queryTexts
          ? "variant-query-generate"
          : variants.length < queryTexts.length
            ? "variant-embed"
            : "final-generate";
      setFusionState((s) => ({ ...s, status: "error", variants, error: { ...(err as RealModeError), stage } }));
    }
  }

  function runSelected(id: ConfigurationId, startFresh: boolean) {
    if (id === "naive") void runNaive(startFresh);
    if (id === "hyde") void runHyde(startFresh);
    if (id === "fusion") void runFusion(startFresh);
  }

  /** FR-007: fires immediately if under budget; otherwise just selects
   * the configuration so the gated Run button below (which shares
   * `runCostGate`) shows the warning before this run can start. */
  function runSelectedGated(id: ConfigurationId) {
    setSelectedConfigId(id);
    if (!isOverBudget(costLedger)) {
      runSelected(id, true);
    }
  }

  const compareMode = selected.length === 2 && !browsing;
  const compareVariants = compareMode
    ? selected.map((id) => ragVariants.find((v) => v.id === id)!)
    : [];

  const isReal = Boolean(realMode?.active && realMode.apiKey);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        {isReal && (
          <Panel className="p-5">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-doc-teal">
              Run for real
            </div>
            {customMode === "sample" && (
              <div className="mb-4 flex flex-wrap gap-2">
                {sampleDocs.map((d) => (
                  <button
                    key={d.id}
                    data-doc-chip={d.id}
                    onClick={() => handleDocSelect(d.id)}
                    aria-pressed={d.id === docId}
                    className={`min-h-11 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
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
                      className={`min-h-11 inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors ${
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
        )}

        {!compareMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ragVariants.map((v) => {
              const executableId = isExecutableId(v.id) ? v.id : null;
              return (
              <div
                key={v.id}
                className={`rounded-lg border p-4 transition-colors ${
                  selected.includes(v.id)
                    ? "border-query-amber bg-query-amber/10"
                    : "border-chart-line bg-chart-bg-raised"
                }`}
              >
                <button onClick={() => toggle(v.id)} className="block w-full text-left hover:opacity-90">
                  <div className="mb-1.5 flex items-center justify-between">
                    <h2 className="font-display text-base text-ink-100">{v.name}</h2>
                    {v.id !== "naive" && <Badge tone="query">variant</Badge>}
                    {v.id === "naive" && <Badge tone="neutral">baseline</Badge>}
                  </div>
                  <p className="text-xs text-ink-300 mb-3">{v.oneLiner}</p>
                  <FlowDiagram flow={v.flow} />
                </button>
                {isReal && (
                  <div className="mt-3 border-t border-chart-line pt-3">
                    {executableId ? (
                      <button
                        onClick={() => runSelectedGated(executableId)}
                        className="rounded border border-doc-teal/40 px-3 py-1.5 text-xs font-medium text-doc-teal hover:bg-doc-teal/10 transition-colors"
                      >
                        Run for real →
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button disabled className="rounded border border-chart-line px-3 py-1.5 text-xs font-medium text-ink-700 opacity-60">
                          Run for real
                        </button>
                        <span className="text-xs italic text-ink-500">Explanatory only this milestone</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {compareMode && (
          <div className="space-y-4">
            <button
              onClick={() => setBrowsing(true)}
              className="min-h-11 inline-flex items-center text-xs text-ink-500 hover:text-ink-300"
            >
              ← Back to all variants
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compareVariants.map((v) => (
                <Panel key={v.id} className="p-4">
                  <h2 className="font-display text-lg text-ink-100 mb-2">{v.name}</h2>
                  <FlowDiagram flow={v.flow} />
                  <div className="mt-4 space-y-3 text-xs leading-relaxed">
                    <div>
                      <div className="text-doc-teal font-mono uppercase text-[10px] mb-1">
                        Problem it addresses
                      </div>
                      <p className="text-ink-300">{v.problem}</p>
                    </div>
                    <div>
                      <div className="text-doc-teal font-mono uppercase text-[10px] mb-1">
                        How it works
                      </div>
                      <p className="text-ink-300">{v.howItWorks}</p>
                    </div>
                    <div>
                      <div className="text-query-amber font-mono uppercase text-[10px] mb-1">
                        Trade-off
                      </div>
                      <p className="text-ink-300">{v.tradeoff}</p>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        )}

        {isReal && (
          <Panel className="p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {EXECUTABLE_VARIANT_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => setSelectedConfigId(id)}
                  aria-pressed={selectedConfigId === id}
                  aria-label={`Show real-execution panel for ${ragVariants.find((v) => v.id === id)!.name}`}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedConfigId === id
                      ? "border-query-amber bg-query-amber/15 text-query-amber"
                      : "border-chart-line text-ink-500 hover:text-ink-300"
                  }`}
                >
                  {ragVariants.find((v) => v.id === id)!.name}
                </button>
              ))}
            </div>

            {selectedConfigId === "hyde" && (
              <div className="mb-4 max-w-sm">
                <Slider
                  label="HyDE hypothesis count"
                  value={hydeCount}
                  min={1}
                  max={3}
                  step={1}
                  onChange={(v) =>
                    onGenerationParamsChange?.({
                      temperature,
                      fusionN,
                      hydeCount: v,
                    })
                  }
                  tone="query"
                />
                <p className="mt-1 text-xs text-ink-500">
                  Estimated calls for this run: <span className="font-mono">{hydeCallCount(hydeCount)}</span> (~$
                  <span className="font-mono">
                    {costEstimateUsd("hyde", { hydeCount, fusionN }, openaiPricing).toFixed(5)}
                  </span>
                  )
                </p>
              </div>
            )}
            {selectedConfigId === "fusion" && (
              <div className="mb-4 max-w-sm">
                <Slider
                  label="RAG-Fusion query variants (N)"
                  value={fusionN}
                  min={2}
                  max={5}
                  step={1}
                  onChange={(v) =>
                    onGenerationParamsChange?.({
                      temperature,
                      fusionN: v,
                      hydeCount,
                    })
                  }
                  tone="query"
                />
                <p className="mt-1 text-xs text-ink-500">
                  Estimated calls for this run: <span className="font-mono">{fusionCallCount(fusionN)}</span> (~$
                  <span className="font-mono">
                    {costEstimateUsd("fusion", { hydeCount, fusionN }, openaiPricing).toFixed(5)}
                  </span>
                  )
                </p>
              </div>
            )}
            {selectedConfigId === "naive" && (
              <p className="mb-4 text-xs text-ink-500">
                Estimated calls for this run: <span className="font-mono">{naiveCallCount()}</span> (~$
                <span className="font-mono">
                  {costEstimateUsd("naive", { hydeCount, fusionN }, openaiPricing).toFixed(5)}
                </span>
                )
              </p>
            )}

            {(() => {
              const state =
                selectedConfigId === "naive" ? naiveState : selectedConfigId === "hyde" ? hydeState : fusionState;
              const running = state.status === "running";
              return (
                <>
                  {runCostGate.blocked ? (
                    <CostWarningBanner
                      totalUsd={sumLedgerUsd(costLedger ?? { entries: [], warningThresholdUsd: 0, pendingResetPrompt: false })}
                      thresholdUsd={costLedger?.warningThresholdUsd ?? 0}
                      onProceedAnyway={() => {
                        runCostGate.proceed();
                        runSelected(selectedConfigId, true);
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => runSelected(selectedConfigId, true)}
                      disabled={running || !query}
                      className="rounded bg-query-amber/20 px-3 py-2 text-xs font-medium text-query-amber transition-colors hover:bg-query-amber/30 disabled:opacity-30"
                    >
                      {running ? "Running..." : `Run ${ragVariants.find((v) => v.id === selectedConfigId)!.name}`}
                    </button>
                  )}

                  {selectedConfigId === "hyde" && (
                    <div className="mt-4 space-y-3">
                      {hydeState.hypothesisTexts.length > 0 && (
                        <div>
                          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-doc-teal">
                            Hypothetical answers ({hydeState.hypothesisTexts.length}/{hydeCount})
                          </h3>
                          <ol className="space-y-1.5">
                            {hydeState.hypothesisTexts.map((t, i) => (
                              <li key={i} className="rounded bg-chart-bg px-3 py-2 text-xs leading-relaxed text-ink-100">
                                <span className="mr-2 font-mono text-doc-teal">{i + 1}.</span>
                                {t}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {hydeState.averagedRetrieval && (
                        <div>
                          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-query-amber">
                            Retrieved against the averaged hypothesis vector
                          </h3>
                          <ol className="space-y-1.5">
                            {hydeState.averagedRetrieval.map((r, i) => (
                              <li key={r.chunk.id} className="flex gap-3 rounded bg-query-amber/10 px-3 py-2 text-xs">
                                <span className="font-mono text-query-amber shrink-0">
                                  {i + 1}. {r.score.toFixed(3)}
                                </span>
                                <span className="text-ink-100 leading-relaxed">{r.chunk.text}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {hydeState.finalAnswer && (
                        <div>
                          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-doc-teal">
                            Final answer
                          </h3>
                          <p className="text-xs leading-relaxed text-ink-100" data-generated-answer="true">
                            {hydeState.finalAnswer}
                          </p>
                          <p className="mt-2 text-xs italic text-ink-500" data-real-disclosure="true">
                            Real HyDE execution via {realMode?.provider.label} -- not a simulation.
                          </p>
                        </div>
                      )}
                      {hydeState.error && (
                        <ErrorBanner
                          error={hydeState.error}
                          onRetry={() => runHyde(false)}
                          onFallbackToSimulated={handleFallback}
                        />
                      )}
                    </div>
                  )}

                  {selectedConfigId === "fusion" && (
                    <div className="mt-4 space-y-3">
                      {fusionState.variants.length > 0 && (
                        <div>
                          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-doc-teal">
                            Query variants and their own rankings ({fusionState.variants.length}/{fusionN})
                          </h3>
                          <div className="space-y-2">
                            {fusionState.variants.map((variant, i) => (
                              <div key={i} className="rounded bg-chart-bg p-2.5">
                                <p className="mb-1.5 text-xs font-medium text-ink-100">
                                  <span className="mr-2 font-mono text-doc-teal">{i + 1}.</span>
                                  {variant.text}
                                </p>
                                <ol className="space-y-1">
                                  {variant.retrieval.map((r, j) => (
                                    <li key={r.chunk.id} className="flex gap-2 text-[11px] text-ink-300">
                                      <span className="font-mono text-ink-500 shrink-0">
                                        {j + 1}. {r.score.toFixed(3)}
                                      </span>
                                      <span>{r.chunk.text.slice(0, 90)}…</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {fusionState.fusedRetrieval && (
                        <div>
                          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-query-amber">
                            Fused ranking (Reciprocal Rank Fusion)
                          </h3>
                          <p className="mb-1.5 text-[11px] italic text-ink-500">
                            Scores here are RRF scores (rank-based), not cosine
                            similarity -- expect a smaller scale than the
                            per-variant rankings above.
                          </p>
                          <ol className="space-y-1.5">
                            {fusionState.fusedRetrieval.map((r, i) => (
                              <li
                                key={r.chunk.id}
                                data-fused-rank={i + 1}
                                className="flex gap-3 rounded bg-query-amber/10 px-3 py-2 text-xs"
                              >
                                <span className="font-mono text-query-amber shrink-0">
                                  {i + 1}. {r.score.toFixed(3)}
                                </span>
                                <span className="text-ink-100 leading-relaxed">{r.chunk.text}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {fusionState.finalAnswer && (
                        <div>
                          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-doc-teal">
                            Final answer
                          </h3>
                          <p className="text-xs leading-relaxed text-ink-100" data-generated-answer="true">
                            {fusionState.finalAnswer}
                          </p>
                          <p className="mt-2 text-xs italic text-ink-500" data-real-disclosure="true">
                            Real RAG-Fusion execution via {realMode?.provider.label} -- not a simulation.
                          </p>
                        </div>
                      )}
                      {fusionState.error && (
                        <ErrorBanner
                          error={fusionState.error}
                          onRetry={() => runFusion(false)}
                          onFallbackToSimulated={handleFallback}
                        />
                      )}
                    </div>
                  )}

                  {selectedConfigId === "naive" && (
                    <div className="mt-4 space-y-3">
                      {naiveState.retrieval && (
                        <div>
                          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-query-amber">
                            Retrieved, ranked by similarity
                          </h3>
                          <ol className="space-y-1.5">
                            {naiveState.retrieval.map((r, i) => (
                              <li key={r.chunk.id} className="flex gap-3 rounded bg-query-amber/10 px-3 py-2 text-xs">
                                <span className="font-mono text-query-amber shrink-0">
                                  {i + 1}. {r.score.toFixed(3)}
                                </span>
                                <span className="text-ink-100 leading-relaxed">{r.chunk.text}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {naiveState.finalAnswer && (
                        <div>
                          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-doc-teal">
                            Final answer
                          </h3>
                          <p className="text-xs leading-relaxed text-ink-100" data-generated-answer="true">
                            {naiveState.finalAnswer}
                          </p>
                          <p className="mt-2 text-xs italic text-ink-500" data-real-disclosure="true">
                            Real naive RAG execution via {realMode?.provider.label} -- not a simulation.
                          </p>
                        </div>
                      )}
                      {naiveState.error && (
                        <ErrorBanner
                          error={naiveState.error}
                          onRetry={() => runNaive(false)}
                          onFallbackToSimulated={handleFallback}
                        />
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </Panel>
        )}

        {isReal && (
          <EvalPanel
            // Remounts (clean state reset) whenever the active document
            // changes -- an EvalPair's expectedChunkId is only meaningful
            // against the chunk list it was defined for (FR-011), the same
            // class of invalidation resetAllRunStates() already applies to
            // naive/hyde/fusion state on a document switch.
            key={`${docId}-${customMode}`}
            chunks={chunks}
            topK={topK}
            onTopKChange={onTopKChange}
            realMode={realMode}
            onRealModeChange={onRealModeChange}
            generationParams={generationParams}
            costLedger={costLedger}
            onCostLedgerAppend={onCostLedgerAppend}
          />
        )}
      </div>

      <Marginalia eyebrow="Compare variants">
        <p>
          Every variant here fixes a specific failure mode of naive RAG --
          none of them are strictly &quot;better,&quot; each trades
          latency, cost, or engineering complexity for a specific
          capability.
        </p>
        <p className="mt-3">
          Amber stages in each flow are exactly what that variant adds or
          changes relative to the naive baseline -- everything else stays
          the same pipeline.
        </p>
        <p className="mt-3">
          Select any two cards to compare them side by side.
        </p>
        {isReal && (
          <p className="mt-3">
            Real Mode is active -- pick a document/question above, then use
            &quot;Run for real&quot; on Naive RAG, HyDE, or RAG-Fusion to
            execute it against a live model. GraphRAG, Self-RAG, and
            Agentic RAG stay explanatory-only this milestone.
          </p>
        )}
      </Marginalia>
    </div>
  );
}
