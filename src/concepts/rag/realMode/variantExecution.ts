/**
 * Pure, dependency-free helpers for HyDE/RAG-Fusion's real execution math
 * (US5, research.md's "HyDE multi-hypothesis vs. RAG-Fusion multi-variant
 * retrieval mechanics" decision). No network/React code here -- these are
 * the same kind of hand-rolled-math module as `pca.ts`/`mockEmbedding.ts`.
 * Shared by VariantsComparison.tsx (US5's "Run for real" execution) and
 * EvalPanel.tsx (US6's recall@K scoring, which re-runs the same
 * per-configuration retrieval mechanics against each EvalPair's question).
 */
import { cosineSimilarity } from "../lib/mockEmbedding";
import type { RetrievedChunk } from "../pipeline/steps/RetrievalStep";

/** Ranks a corpus by cosine similarity to a query vector, same shape both callers use. */
export function rankChunks(
  chunks: { id: string; text: string }[],
  vectors: number[][],
  queryVector: number[],
  topK: number,
): RetrievedChunk[] {
  return chunks
    .map((c, i) => ({ chunk: c as RetrievedChunk["chunk"], score: cosineSimilarity(vectors[i], queryVector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** HyDE's hypothesis-generation prompt (FR-008's named algorithm). */
export function buildHypothesisPrompt(query: string): string {
  return `Write a plausible, concise hypothetical answer (2-4 sentences) to the following question, even if you are not certain it is correct. Do not hedge or say you don't know -- just write your best guess, as if it came from the source document.

Question: ${query}`;
}

/** RAG-Fusion's query-rewrite prompt (FR-008's named algorithm). */
export function buildQueryVariantPrompt(query: string, n: number): string {
  return `Rewrite the following question into ${n} different phrasings that preserve its meaning but vary the wording. Return exactly ${n} lines, one phrasing per line, with no numbering, bullets, or extra commentary.

Question: ${query}`;
}

/** Element-wise mean of one or more equal-length vectors (HyDE's hypothesis-averaging step). */
export function averageVectors(vectors: number[][]): number[] {
  const dim = vectors[0]?.length ?? 0;
  const sum = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  return sum.map((s) => s / vectors.length);
}

/**
 * Reciprocal Rank Fusion (RAG-Fusion's fuse step -- the method named in
 * variantData.ts's own "howItWorks" copy, so real execution can't
 * silently use a different one, per FR-008). Each chunk's fused score is
 * the sum of 1/(k + rank) across every ranked list it appears in
 * (rank is 1-based); a chunk absent from a list contributes nothing for
 * that list. k=60 is the constant from the original RRF paper and the
 * value most descriptions of the technique use by default.
 */
const RRF_K = 60;

export function reciprocalRankFusion(rankings: RetrievedChunk[][]): RetrievedChunk[] {
  const scores = new Map<string, number>();
  const chunkById = new Map<string, RetrievedChunk["chunk"]>();
  for (const ranking of rankings) {
    ranking.forEach((r, i) => {
      const rank = i + 1;
      scores.set(r.chunk.id, (scores.get(r.chunk.id) ?? 0) + 1 / (RRF_K + rank));
      chunkById.set(r.chunk.id, r.chunk);
    });
  }
  return Array.from(scores.entries())
    .map(([id, score]) => ({ chunk: chunkById.get(id)!, score }))
    .sort((a, b) => b.score - a.score);
}
