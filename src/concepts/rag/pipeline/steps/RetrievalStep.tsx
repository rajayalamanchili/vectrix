"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sampleDocs, chunkText, chunkTextBySentence, type Chunk, type ChunkingStrategy, type SampleDoc } from "../../lib/sampleDocs";
import { embed, cosineSimilarity } from "../../lib/mockEmbedding";
import { StarChart, type StarPoint } from "@/components/charts/StarChart";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { ErrorBanner } from "../../realMode/ErrorBanner";
import { projectTo2D } from "../../realMode/pca";
import type { RealModeError, RealModeSession } from "../../realMode/types";
import { createTrackedProvider } from "../../costLedger/trackedProvider";
import { useCostGate } from "../../costLedger/useCostGate";
import { CostWarningBanner } from "../../costLedger/CostWarningBanner";
import { openaiPricing } from "../../costLedger/pricing";
import { sumLedgerUsd, type CostLedgerEntry, type SessionCostLedger } from "../../costLedger/types";
import {
  runSimulatedSweep,
  chunkTextsForSweepPoint,
  topOneScoreFromVectors,
  generateSweepChunkSizes,
  clampOverlapForChunkSize,
  type SweepPoint,
  type SweepState,
} from "../../sweep/runSweep";
import { sweepCallEstimate } from "../../sweep/sweepCallEstimate";
import { SweepCurve } from "../../sweep/SweepCurve";

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
}

/** FR-016 canonical call types this step issues, retried independently of one another. */
const CORPUS_STAGE = "corpus-embed";
const QUERY_STAGE = "query-embed";

export function RetrievalStep({
  docId,
  chunkSize,
  overlap,
  chunkingStrategy,
  query,
  onQuery,
  topK,
  onTopK,
  similarityThreshold,
  onSimilarityThreshold,
  onResults,
  realMode,
  onRealModeChange,
  customDoc,
  onSweepJump,
  costLedger,
  onCostLedgerAppend,
}: {
  docId: string;
  chunkSize: number;
  overlap: number;
  chunkingStrategy: ChunkingStrategy;
  query: string;
  onQuery: (q: string) => void;
  topK: number;
  onTopK: (k: number) => void;
  similarityThreshold: number;
  onSimilarityThreshold: (v: number) => void;
  onResults: (r: RetrievedChunk[]) => void;
  realMode?: RealModeSession;
  onRealModeChange?: (next: RealModeSession) => void;
  /** US3: when non-null, the learner's pasted document replaces the sample lookup by `docId` entirely (FR-005). */
  customDoc?: SampleDoc | null;
  /** 003-parameter-exploration US1: jumps the pipeline to a sweep point's exact chunk size (contracts/sweep-contract.md). */
  onSweepJump: (chunkSize: number) => void;
  /** 004-real-mode-depth US2: session-wide cost/call ledger (FR-005, FR-007). */
  costLedger?: SessionCostLedger;
  onCostLedgerAppend?: (entry: CostLedgerEntry) => void;
}) {
  const doc = customDoc ?? sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];
  const chunks = useMemo(
    () =>
      chunkingStrategy === "sentence"
        ? chunkTextBySentence(doc.text, chunkSize, overlap)
        : chunkText(doc.text, chunkSize, overlap),
    [doc, chunkSize, overlap, chunkingStrategy],
  );
  const [activeQuery, setActiveQuery] = useState(query || doc.sampleQueries[0]);

  // The step seeds a sensible default query locally so the chart isn't
  // empty on first render -- but the parent (and therefore the
  // Generation step) only knows about a query once it's been explicitly
  // set. Sync the default up once so "Question:" in Step 5 is never
  // blank if the user never touched the query field.
  useEffect(() => {
    if (!query) {
      onQuery(activeQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReal = Boolean(realMode?.active && realMode.apiKey);

  // Real Mode: corpus and query embeddings are two independent calls
  // (FR-016's corpus-embed/query-embed), fetched and retried
  // independently so a query-embed failure doesn't re-incur a fresh
  // corpus-embed call (and vice versa).
  const [realCorpusVectors, setRealCorpusVectors] = useState<number[][] | null>(null);
  const [realQueryVector, setRealQueryVector] = useState<number[] | null>(null);
  const [corpusRetryToken, setCorpusRetryToken] = useState(0);
  const [queryRetryToken, setQueryRetryToken] = useState(0);

  const corpusStageError = realMode?.error?.stage === CORPUS_STAGE ? realMode.error : null;
  const queryStageError = realMode?.error?.stage === QUERY_STAGE ? realMode.error : null;

  // FR-007: re-evaluated fresh per distinct call (keyed on exactly the
  // inputs that would trigger a new embed call) -- crossing the
  // threshold blocks that one call until the learner explicitly clicks
  // "Proceed anyway" for it (research.md's warning-threshold decision).
  const corpusCallKey = JSON.stringify([docId, customDoc?.text, chunkSize, overlap, chunkingStrategy, corpusRetryToken]);
  const corpusCostGate = useCostGate(costLedger, corpusCallKey);
  const queryCallKey = JSON.stringify([activeQuery, queryRetryToken]);
  const queryCostGate = useCostGate(costLedger, queryCallKey);
  const corpusBlocked = isReal && corpusCostGate.blocked;
  const queryBlocked = isReal && queryCostGate.blocked;

  // Derived, not separate booleans: "in flight" is exactly "real mode is
  // on, we don't have that call's result yet, it didn't just error, and
  // it isn't waiting on the cost-warning gate."
  const corpusLoading = isReal && !realCorpusVectors && !corpusStageError && !corpusBlocked;
  const queryLoading = isReal && !realQueryVector && !queryStageError && !queryBlocked;

  useEffect(() => {
    if (!isReal || !realMode || !realMode.apiKey || corpusBlocked) {
      return;
    }
    let cancelled = false;
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );
    provider
      .embedBatch(chunks.map((c) => c.text))
      .then((vectors) => {
        if (cancelled) return;
        setRealCorpusVectors(vectors);
        if (realMode.error?.stage === CORPUS_STAGE) {
          onRealModeChange?.({ ...realMode, error: null });
        }
      })
      .catch((err: RealModeError) => {
        if (cancelled) return;
        setRealCorpusVectors(null);
        onRealModeChange?.({ ...realMode, error: { ...err, stage: CORPUS_STAGE } });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, docId, customDoc, chunkSize, overlap, chunkingStrategy, corpusRetryToken, corpusBlocked]);

  useEffect(() => {
    if (!isReal || !realMode || !realMode.apiKey || queryBlocked) {
      return;
    }
    let cancelled = false;
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );
    provider
      .embedBatch([activeQuery])
      .then(([vector]) => {
        if (cancelled) return;
        setRealQueryVector(vector);
        if (realMode.error?.stage === QUERY_STAGE) {
          onRealModeChange?.({ ...realMode, error: null });
        }
      })
      .catch((err: RealModeError) => {
        if (cancelled) return;
        setRealQueryVector(null);
        onRealModeChange?.({ ...realMode, error: { ...err, stage: QUERY_STAGE } });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, activeQuery, queryRetryToken, queryBlocked]);

  // Corpus and query MUST be projected together in one PCA call so they
  // land in the same 2D coordinate system -- projecting them separately
  // would produce two unrelated spaces with no meaningful relationship.
  const realProjection = useMemo(() => {
    if (!realCorpusVectors || !realQueryVector) return null;
    const projected = projectTo2D([...realCorpusVectors, realQueryVector]);
    return {
      chunkPoints: projected.slice(0, realCorpusVectors.length),
      queryPoint: projected[projected.length - 1],
    };
  }, [realCorpusVectors, realQueryVector]);

  const chunkEmbeddings = useMemo(() => chunks.map((c) => ({ c, e: embed(c.text) })), [chunks]);
  const simulatedQueryEmbedding = useMemo(() => embed(activeQuery), [activeQuery]);

  // A failed or in-flight real call must never fall back to scoring
  // against the simulated vectors -- that would show a ranked list (and
  // chart) built from simulated data while the disclosure below still
  // claims "real" (FR-007: never silently substitute simulated output
  // while implying it's real). `chunkVectors`/`queryVector` are only
  // non-null once there's data honest to show for the active mode.
  const chunkVectors: number[][] | null =
    isReal ? realCorpusVectors : chunkEmbeddings.map(({ e }) => e.vector);
  const queryVector: number[] | null = isReal ? realQueryVector : simulatedQueryEmbedding.vector;
  const dataReady = chunkVectors !== null && queryVector !== null;

  const ranked: RetrievedChunk[] = useMemo(() => {
    if (!chunkVectors || !queryVector) return [];
    const scored = chunks.map((c, i) => ({
      chunk: c,
      score: cosineSimilarity(chunkVectors[i], queryVector),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [chunks, chunkVectors, queryVector]);

  // FR-013: filter by threshold BEFORE slicing to Top-K, so raising the
  // threshold can surface a lower-ranked chunk (by removing a
  // higher-ranked one that no longer qualifies) and can empty the
  // retrieved set independent of the Top-K value.
  const filtered = useMemo(
    () => ranked.filter((r) => r.score >= similarityThreshold),
    [ranked, similarityThreshold],
  );
  const topResults = filtered.slice(0, topK);

  function runQuery(q: string) {
    setActiveQuery(q);
    onQuery(q);
  }

  // Loading vs. genuinely unavailable (errored, nothing to retry
  // automatically) vs. cost-blocked (FR-007's warning gate) -- all
  // distinct from "ready," which covers Simulated Mode (always ready)
  // and Real Mode once both calls succeed.
  const retrievalStatus: "loading" | "unavailable" | "cost-blocked" | "ready" = dataReady
    ? "ready"
    : corpusBlocked || queryBlocked
      ? "cost-blocked"
      : corpusStageError || queryStageError
        ? "unavailable"
        : "loading";

  const points: StarPoint[] = chunks.map((c, i) => {
    const isTop = topResults.some((r) => r.chunk.id === c.id);
    const score = ranked.find((r) => r.chunk.id === c.id)?.score;
    const coords =
      isReal && realProjection
        ? realProjection.chunkPoints[i]
        : { x: chunkEmbeddings[i].e.x, y: chunkEmbeddings[i].e.y };
    return { id: c.id, x: coords.x, y: coords.y, label: `#${i}`, score: isTop ? score : undefined, highlighted: isTop };
  });
  const beaconCoords =
    isReal && realProjection
      ? realProjection.queryPoint
      : { x: simulatedQueryEmbedding.x, y: simulatedQueryEmbedding.y };

  function handleFallback() {
    if (!realMode) return;
    onRealModeChange?.({ ...realMode, active: false, error: null });
  }

  function handleRetryCorpus() {
    if (realMode) onRealModeChange?.({ ...realMode, error: null });
    setCorpusRetryToken((t) => t + 1);
  }

  function handleRetryQuery() {
    if (realMode) onRealModeChange?.({ ...realMode, error: null });
    setQueryRetryToken((t) => t + 1);
  }

  // 003-parameter-exploration US1: chunk-size sweep. `sweepTokenRef`
  // implements the cancel-and-replace decision (research.md) -- every
  // async per-point call closes over the token active when it started
  // and discards its result if a newer sweep has since begun, the same
  // pattern this file already uses for corpus/query embed retries.
  const [sweep, setSweep] = useState<SweepState>({ status: "idle", token: 0, points: [] });
  const sweepTokenRef = useRef(0);

  function initialSweepPoints(): SweepPoint[] {
    return generateSweepChunkSizes().map((size) => ({
      chunkSize: size,
      clampedOverlap: clampOverlapForChunkSize(overlap, size),
      status: "pending" as const,
      topOneScore: null,
    }));
  }

  // A document or question change invalidates any sweep computed for
  // the previous one -- a stale curve would silently mismatch what's
  // now on screen. A chunkSize jump from clicking a sweep point does
  // NOT reset it: the curve stays as a navigable summary of where the
  // learner currently is (Acceptance Scenario 2).
  useEffect(() => {
    sweepTokenRef.current += 1;
    setSweep({ status: "idle", token: sweepTokenRef.current, points: [] });
  }, [doc, activeQuery]);

  function handleStartSweepClick() {
    const token = sweepTokenRef.current + 1;
    sweepTokenRef.current = token;
    if (isReal) {
      setSweep({ status: "awaiting-confirmation", token, points: initialSweepPoints() });
    } else {
      setSweep({ status: "done", token, points: runSimulatedSweep(doc, overlap, chunkingStrategy, activeQuery) });
    }
  }

  const sweepCallKey = JSON.stringify([doc.id, activeQuery, overlap, chunkingStrategy, sweep.token]);
  const sweepCostGate = useCostGate(costLedger, sweepCallKey);

  async function handleConfirmRealSweep() {
    if (!realMode?.apiKey) return;
    const token = sweepTokenRef.current;
    setSweep((s) => ({ ...s, status: "running" }));
    const provider = createTrackedProvider(
      { provider: realMode.provider, apiKey: realMode.apiKey },
      (entry) => onCostLedgerAppend?.(entry),
    );

    let queryVector: number[];
    try {
      [queryVector] = await provider.embedBatch([activeQuery]);
    } catch {
      if (sweepTokenRef.current !== token) return;
      setSweep((s) => ({
        ...s,
        status: "done",
        points: s.points.map((p) => ({ ...p, status: "error" as const, errorMessage: "Failed to embed the query" })),
      }));
      return;
    }
    if (sweepTokenRef.current !== token) return;

    for (const size of generateSweepChunkSizes()) {
      if (sweepTokenRef.current !== token) return;
      setSweep((s) => ({
        ...s,
        points: s.points.map((p) => (p.chunkSize === size ? { ...p, status: "loading" as const } : p)),
      }));
      try {
        const texts = chunkTextsForSweepPoint(doc, size, overlap, chunkingStrategy);
        const vectors = await provider.embedBatch(texts);
        if (sweepTokenRef.current !== token) return;
        const score = topOneScoreFromVectors(vectors, queryVector);
        setSweep((s) => ({
          ...s,
          points: s.points.map((p) => (p.chunkSize === size ? { ...p, status: "done" as const, topOneScore: score } : p)),
        }));
      } catch (err) {
        if (sweepTokenRef.current !== token) return;
        setSweep((s) => ({
          ...s,
          points: s.points.map((p) =>
            p.chunkSize === size
              ? { ...p, status: "error" as const, errorMessage: (err as RealModeError).message ?? "Failed to embed this chunk size" }
              : p,
          ),
        }));
      }
    }
    if (sweepTokenRef.current === token) {
      setSweep((s) => ({ ...s, status: "done" }));
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <Panel className="p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {doc.sampleQueries.map((q) => (
              <button
                key={q}
                onClick={() => runQuery(q)}
                className={`min-h-11 inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors ${
                  q === activeQuery
                    ? "border-query-amber bg-query-amber/15 text-query-amber"
                    : "border-chart-line text-ink-500 hover:text-ink-300"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <input
            data-primary-focus="true"
            value={activeQuery}
            onChange={(e) => runQuery(e.target.value)}
            placeholder="Or type your own question..."
            className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:border-query-amber"
          />
          <div className="mt-4 grid grid-cols-2 gap-4 max-w-md">
            <Slider label="Top-K retrieved" value={topK} min={1} max={5} onChange={onTopK} tone="query" />
            <Slider
              label="Minimum similarity score"
              value={similarityThreshold}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => onSimilarityThreshold(Math.round(v * 100) / 100)}
              tone="query"
            />
          </div>
          <div className="mt-4">
            {retrievalStatus === "cost-blocked" ? (
              <div className="space-y-2">
                {corpusBlocked && (
                  <CostWarningBanner
                    totalUsd={sumLedgerUsd(costLedger ?? { entries: [], warningThresholdUsd: 0, pendingResetPrompt: false })}
                    thresholdUsd={costLedger?.warningThresholdUsd ?? 0}
                    onProceedAnyway={corpusCostGate.proceed}
                  />
                )}
                {queryBlocked && (
                  <CostWarningBanner
                    totalUsd={sumLedgerUsd(costLedger ?? { entries: [], warningThresholdUsd: 0, pendingResetPrompt: false })}
                    thresholdUsd={costLedger?.warningThresholdUsd ?? 0}
                    onProceedAnyway={queryCostGate.proceed}
                  />
                )}
              </div>
            ) : retrievalStatus === "loading" ? (
              <p role="status" className="p-6 text-xs italic text-ink-500">
                {corpusLoading
                  ? `Embedding corpus via ${realMode?.provider.label}...`
                  : queryLoading
                    ? `Embedding query via ${realMode?.provider.label}...`
                    : "Waiting on embeddings..."}
              </p>
            ) : retrievalStatus === "unavailable" ? (
              <p role="status" className="p-6 text-xs italic text-ink-500">
                No real embeddings available -- see the error below.
              </p>
            ) : (
              <StarChart points={points} beacon={{ x: beaconCoords.x, y: beaconCoords.y, label: "query" }} />
            )}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-query-amber">
            Retrieved, ranked by similarity
          </h2>
          {retrievalStatus === "cost-blocked" ? (
            <p role="status" className="text-xs text-ink-500 italic">
              Waiting on the cost warning above to be confirmed before ranking.
            </p>
          ) : retrievalStatus === "loading" ? (
            <p role="status" className="text-xs text-ink-500 italic">
              Waiting on real embeddings before ranking...
            </p>
          ) : retrievalStatus === "unavailable" ? (
            <p role="status" className="text-xs text-ink-500 italic">
              No real embeddings available -- see the error below.
            </p>
          ) : topResults.length === 0 ? (
            <p role="status" className="text-xs text-ink-500 italic">
              No chunks meet the current similarity threshold -- try lowering
              it. This is a real, reachable &quot;no good match&quot; state,
              not an error.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {topResults.map((r, i) => (
                <li key={r.chunk.id} className="flex gap-3 rounded bg-query-amber/10 px-3 py-2 text-xs">
                  <span className="font-mono text-query-amber shrink-0">
                    {i + 1}. {r.score.toFixed(3)}
                  </span>
                  <span className="text-ink-100 leading-relaxed">{r.chunk.text}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel className="p-4">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-query-amber">
            Chunk-size sensitivity sweep
          </h2>
          {sweep.status === "idle" && (
            <button
              type="button"
              onClick={handleStartSweepClick}
              disabled={!activeQuery}
              className="rounded border border-doc-teal/40 px-3 py-1.5 text-xs font-medium text-doc-teal transition-colors hover:bg-doc-teal/10 disabled:opacity-30"
            >
              Sweep chunk size (9 points)
            </button>
          )}
          {sweep.status === "awaiting-confirmation" && sweepCostGate.blocked && (
            <CostWarningBanner
              totalUsd={sumLedgerUsd(costLedger ?? { entries: [], warningThresholdUsd: 0, pendingResetPrompt: false })}
              thresholdUsd={costLedger?.warningThresholdUsd ?? 0}
              onProceedAnyway={sweepCostGate.proceed}
            />
          )}
          {sweep.status === "awaiting-confirmation" && !sweepCostGate.blocked && (
            <div>
              <p className="mb-2 text-xs text-ink-500">
                Estimated calls for this sweep:{" "}
                <span className="font-mono">{sweepCallEstimate(generateSweepChunkSizes().length)}</span> (~$
                <span className="font-mono">
                  {(sweepCallEstimate(generateSweepChunkSizes().length) * openaiPricing.embedCallUsd).toFixed(5)}
                </span>
                , {openaiPricing.label})
              </p>
              <button
                type="button"
                onClick={() => void handleConfirmRealSweep()}
                className="rounded bg-query-amber/20 px-3 py-2 text-xs font-medium text-query-amber transition-colors hover:bg-query-amber/30"
              >
                Start sweep
              </button>
            </div>
          )}
          {(sweep.status === "running" || sweep.status === "done") && (
            <>
              <SweepCurve points={sweep.points} onPointActivate={onSweepJump} />
              <button
                type="button"
                onClick={handleStartSweepClick}
                disabled={sweep.status === "running"}
                className="mt-3 rounded border border-chart-line px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100 disabled:opacity-30"
              >
                Run sweep again
              </button>
            </>
          )}
        </Panel>
      </div>

      <Marginalia eyebrow="Step 4 -- Retrieval">
        <p>
          The question gets embedded into the same space, then the K
          nearest chunks by cosine similarity are pulled out -- that&apos;s
          the &quot;retrieval&quot; in Retrieval-Augmented Generation.
        </p>
        <p className="mt-3">
          Try raising Top-K: notice similarity scores drop off fast after
          the first couple of chunks -- pulling in too many just adds
          noise to what the model has to read.
        </p>
        <p className="mt-3">
          The minimum similarity score is a separate filter: raise it high
          enough and even a Top-K of 5 can return nothing -- &quot;no good
          match&quot; is something retrieval should be able to say out
          loud, not paper over with a low-quality chunk.
        </p>
        {isReal && (
          <p className="mt-3 text-ink-500" data-real-disclosure="true">
            <em>
              Real query embedding via {realMode?.provider.label} (
              {realMode?.provider.embeddingsModel}), projected with PCA
              into the same space as the corpus chunks above.
            </em>
          </p>
        )}
        {corpusStageError && (
          <div className="mt-3">
            <ErrorBanner
              error={corpusStageError}
              onRetry={handleRetryCorpus}
              onFallbackToSimulated={handleFallback}
            />
          </div>
        )}
        {queryStageError && (
          <div className="mt-3">
            <ErrorBanner
              error={queryStageError}
              onRetry={handleRetryQuery}
              onFallbackToSimulated={handleFallback}
            />
          </div>
        )}
        <button
          onClick={() => onResults(topResults)}
          disabled={retrievalStatus !== "ready"}
          className="mt-4 w-full rounded bg-query-amber/20 px-3 py-2 text-xs font-medium text-query-amber transition-colors hover:bg-query-amber/30 disabled:opacity-30"
        >
          Use these results in the next step →
        </button>
      </Marginalia>
    </div>
  );
}
