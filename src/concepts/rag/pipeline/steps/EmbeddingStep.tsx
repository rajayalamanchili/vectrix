"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleDocs, chunkText, chunkTextBySentence, type ChunkingStrategy, type SampleDoc } from "../../lib/sampleDocs";
import { embed } from "../../lib/mockEmbedding";
import { StarChart, type StarPoint } from "@/components/charts/StarChart";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { ErrorBanner } from "../../realMode/ErrorBanner";
import { createOpenAICompatibleProvider } from "../../realMode/openaiCompatibleProvider";
import { projectTo2D } from "../../realMode/pca";
import type { RealEmbeddingResult, RealModeError, RealModeSession } from "../../realMode/types";

/** FR-016 canonical call type for this step's one real call. */
const STAGE = "corpus-embed";

export function EmbeddingStep({
  docId,
  chunkSize,
  overlap,
  chunkingStrategy,
  realMode,
  onRealModeChange,
  customDoc,
}: {
  docId: string;
  chunkSize: number;
  overlap: number;
  chunkingStrategy: ChunkingStrategy;
  realMode?: RealModeSession;
  onRealModeChange?: (next: RealModeSession) => void;
  /** US3: when non-null, the learner's pasted document replaces the sample lookup by `docId` entirely (FR-005). */
  customDoc?: SampleDoc | null;
}) {
  const doc = customDoc ?? sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];
  const chunks = useMemo(
    () =>
      chunkingStrategy === "sentence"
        ? chunkTextBySentence(doc.text, chunkSize, overlap)
        : chunkText(doc.text, chunkSize, overlap),
    [doc, chunkSize, overlap, chunkingStrategy],
  );

  const isReal = Boolean(realMode?.active && realMode.apiKey);
  const [realResults, setRealResults] = useState<RealEmbeddingResult[] | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Only this step's own call type -- a query-embed/generation failure
  // surfaced elsewhere must not make this step show a stale banner.
  const stageError = realMode?.error?.stage === STAGE ? realMode.error : null;
  // Derived, not a separate boolean: "in flight" is exactly "real mode is
  // on, we don't have a result yet, and the last attempt didn't error."
  const loading = isReal && !realResults && !stageError;

  useEffect(() => {
    if (!isReal || !realMode || !realMode.apiKey) {
      return;
    }
    let cancelled = false;
    const provider = createOpenAICompatibleProvider(realMode.provider, realMode.apiKey);
    provider
      .embedBatch(chunks.map((c) => c.text))
      .then((vectors) => {
        if (cancelled) return;
        const projected = projectTo2D(vectors);
        const results: RealEmbeddingResult[] = chunks.map((c, i) => ({
          id: c.id,
          vector: vectors[i],
          x: projected[i].x,
          y: projected[i].y,
          projectionMethod: "pca",
        }));
        setRealResults(results);
        if (realMode.error?.stage === STAGE) {
          onRealModeChange?.({ ...realMode, error: null });
        }
      })
      .catch((err: RealModeError) => {
        if (cancelled) return;
        setRealResults(null);
        onRealModeChange?.({ ...realMode, error: { ...err, stage: STAGE } });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, docId, customDoc, chunkSize, overlap, chunkingStrategy, retryToken]);

  const simulatedPoints: StarPoint[] = useMemo(
    () =>
      chunks.map((c, i) => {
        const { x, y } = embed(c.text);
        return { id: c.id, x, y, label: `#${i}` };
      }),
    [chunks],
  );

  const points: StarPoint[] =
    isReal && realResults
      ? realResults.map((r, i) => ({ id: r.id, x: r.x, y: r.y, label: `#${i}` }))
      : simulatedPoints;

  // A failed real call must never fall back to showing the simulated
  // chart while the caption still claims "real" -- that's exactly the
  // FR-007 violation ("never silently substituting simulated output
  // while implying it is real"). Show nothing until either a real result
  // or a mode switch resolves it.
  const showUnavailable = isReal && !realResults && Boolean(stageError);

  function handleFallback() {
    if (!realMode) return;
    onRealModeChange?.({ ...realMode, active: false, error: null });
  }

  function handleRetry() {
    if (realMode) onRealModeChange?.({ ...realMode, error: null });
    setRetryToken((t) => t + 1);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <Panel className="p-5">
        {loading ? (
          <p role="status" className="p-6 text-xs italic text-ink-500">
            Embedding {chunks.length} chunk{chunks.length === 1 ? "" : "s"} via{" "}
            {realMode?.provider.label}...
          </p>
        ) : showUnavailable ? (
          <p role="status" className="p-6 text-xs italic text-ink-500">
            No real embeddings available -- see the error below.
          </p>
        ) : (
          <StarChart points={points} showCourseLines={false} />
        )}
      </Panel>

      <Marginalia eyebrow="Step 3 -- Embedding">
        <p>
          Every chunk becomes a point in a high-dimensional meaning space
          -- similar chunks land near each other. This chart projects that
          down to 2D so you can see it directly.
        </p>
        {isReal ? (
          <p className="mt-3 text-ink-500" data-real-disclosure="true">
            <em>
              Real embeddings via {realMode?.provider.label} (
              {realMode?.provider.embeddingsModel}), projected to 2D with
              PCA -- this geometry reflects the provider&apos;s actual
              embedding space, not a simulation.
            </em>
          </p>
        ) : (
          <p className="mt-3 text-ink-500" data-simulated-disclosure="true">
            <em>
              Simplified for teaching: this uses a lightweight word-overlap
              projection, not a real embedding model, so the geometry is
              illustrative rather than semantically precise. Swap in a real
              embeddings API and the rest of the pipeline is unchanged.
            </em>
          </p>
        )}
        <p className="mt-3">
          Move to the next step and type a question -- watch where it
          lands relative to these chunks.
        </p>
        {stageError && (
          <div className="mt-3">
            <ErrorBanner
              error={stageError}
              onRetry={handleRetry}
              onFallbackToSimulated={handleFallback}
            />
          </div>
        )}
      </Marginalia>
    </div>
  );
}
