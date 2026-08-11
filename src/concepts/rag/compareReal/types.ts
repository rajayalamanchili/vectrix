/**
 * US1 (004-real-mode-depth): Compare Simulated vs Real's own data shapes.
 * See specs/004-real-mode-depth/data-model.md and
 * contracts/comparison-contract.md.
 */
import type { ConfigurationId, RealModeError } from "../realMode/types";
import type { RetrievedChunk } from "../pipeline/steps/RetrievalStep";

export interface ChunkRankPair {
  chunkId: string;
  /** 1-based rank, or null if the chunk didn't clear Top-K/threshold on this side, or this side hasn't run yet. */
  simulatedRank: number | null;
  realRank: number | null;
}

export type RealHalfStatus = "needs-key" | "awaiting-confirmation" | "running" | "done" | "error";

export interface ComparisonResult {
  configurationId: ConfigurationId;
  docId: string;
  query: string;

  /** Always the naive-RAG simulated ranking, regardless of configurationId (research.md). */
  simulatedRanking: RetrievedChunk[];
  /** true whenever configurationId !== "naive" -- drives the disclosure caveat (FR-004, check:disclosure). */
  simulatedIsApproximation: boolean;

  realRanking: RetrievedChunk[] | null;
  realStatus: RealHalfStatus;
  realError: RealModeError | null;
  /** Real-side call count, shown pre-execution per FR-003 (spec.md 002 FR-010's pattern). */
  realCallEstimate: number;

  /** Merged by chunk id, in Simulated rank order -- what FR-002's side-by-side table renders. */
  pairs: ChunkRankPair[];
}
