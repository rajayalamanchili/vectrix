/**
 * Pure, dependency-free helpers for HyDE/RAG-Fusion's real execution math
 * (US5, research.md's "HyDE multi-hypothesis vs. RAG-Fusion multi-variant
 * retrieval mechanics" decision). No network/React code here -- these are
 * the same kind of hand-rolled-math module as `pca.ts`/`mockEmbedding.ts`.
 */
import type { RetrievedChunk } from "../pipeline/steps/RetrievalStep";

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
