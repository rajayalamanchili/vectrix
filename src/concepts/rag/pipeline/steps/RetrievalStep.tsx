"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleDocs, chunkText, type Chunk } from "../../lib/sampleDocs";
import { embed, cosineSimilarity } from "../../lib/mockEmbedding";
import { StarChart, type StarPoint } from "@/components/charts/StarChart";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
}

export function RetrievalStep({
  docId,
  chunkSize,
  overlap,
  query,
  onQuery,
  topK,
  onTopK,
  onResults,
}: {
  docId: string;
  chunkSize: number;
  overlap: number;
  query: string;
  onQuery: (q: string) => void;
  topK: number;
  onTopK: (k: number) => void;
  onResults: (r: RetrievedChunk[]) => void;
}) {
  const doc = sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];
  const chunks = useMemo(() => chunkText(doc.text, chunkSize, overlap), [doc, chunkSize, overlap]);
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

  const chunkEmbeddings = useMemo(() => chunks.map((c) => ({ c, e: embed(c.text) })), [chunks]);
  const queryEmbedding = useMemo(() => embed(activeQuery), [activeQuery]);

  const ranked: RetrievedChunk[] = useMemo(() => {
    const scored = chunkEmbeddings.map(({ c, e }) => ({
      chunk: c,
      score: cosineSimilarity(e.vector, queryEmbedding.vector),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [chunkEmbeddings, queryEmbedding]);

  const topResults = ranked.slice(0, topK);

  function runQuery(q: string) {
    setActiveQuery(q);
    onQuery(q);
  }

  const points: StarPoint[] = chunkEmbeddings.map(({ c, e }, i) => {
    const isTop = topResults.some((r) => r.chunk.id === c.id);
    const score = ranked.find((r) => r.chunk.id === c.id)?.score;
    return { id: c.id, x: e.x, y: e.y, label: `#${i}`, score: isTop ? score : undefined, highlighted: isTop };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <Panel className="p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {doc.sampleQueries.map((q) => (
              <button
                key={q}
                onClick={() => runQuery(q)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
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
            value={activeQuery}
            onChange={(e) => runQuery(e.target.value)}
            placeholder="Or type your own question..."
            className="w-full rounded border border-chart-line bg-chart-bg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:border-query-amber focus:outline-none"
          />
          <div className="mt-4 max-w-xs">
            <Slider label="Top-K retrieved" value={topK} min={1} max={5} onChange={onTopK} tone="query" />
          </div>
          <div className="mt-4">
            <StarChart points={points} beacon={{ x: queryEmbedding.x, y: queryEmbedding.y, label: "query" }} />
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-query-amber">
            Retrieved, ranked by similarity
          </div>
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
        <button
          onClick={() => onResults(topResults)}
          className="mt-4 w-full rounded bg-query-amber/20 px-3 py-2 text-xs font-medium text-query-amber hover:bg-query-amber/30 transition-colors"
        >
          Use these results in the next step →
        </button>
      </Marginalia>
    </div>
  );
}
