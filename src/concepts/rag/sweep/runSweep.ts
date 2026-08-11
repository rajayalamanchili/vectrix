/**
 * Chunk-size sweep: a fixed, non-learner-adjustable range of 9 chunk
 * sizes (spec.md FR-001), each re-chunked/re-embedded/re-ranked to
 * produce a top-1 similarity score. Simulated Mode runs this
 * synchronously; Real Mode's sequential per-point execution lives in
 * RetrievalStep.tsx (contracts/sweep-contract.md).
 */
import { chunkText, chunkTextBySentence, type ChunkingStrategy, type SampleDoc } from "../lib/sampleDocs";
import { embed, cosineSimilarity } from "../lib/mockEmbedding";

export interface SweepPoint {
  chunkSize: number;
  clampedOverlap: number;
  status: "pending" | "loading" | "done" | "error";
  topOneScore: number | null;
  errorMessage?: string;
}

export interface SweepState {
  status: "idle" | "awaiting-confirmation" | "running" | "done";
  token: number;
  points: SweepPoint[];
}

/** Linearly interpolates 9 points across the existing chunk-size slider's [20, 120] bounds, rounded to its own step of 5 (research.md). */
export function generateSweepChunkSizes(): number[] {
  const min = 20;
  const max = 120;
  const count = 9;
  const step = 5;
  const sizes: number[] = [];
  for (let i = 0; i < count; i++) {
    const raw = min + (i * (max - min)) / (count - 1);
    sizes.push(Math.round(raw / step) * step);
  }
  return sizes;
}

/** Per-point overlap clamp, mirroring ChunkingStep.tsx's own slider-max formula (Math.min(40, chunkSize - 5)). */
export function clampOverlapForChunkSize(overlap: number, chunkSize: number): number {
  return Math.min(overlap, chunkSize - 5);
}

function chunkAtSize(
  doc: SampleDoc,
  chunkSize: number,
  overlap: number,
  chunkingStrategy: ChunkingStrategy,
) {
  return chunkingStrategy === "sentence"
    ? chunkTextBySentence(doc.text, chunkSize, overlap)
    : chunkText(doc.text, chunkSize, overlap);
}

/** Top-1 similarity score given already-embedded corpus vectors -- shared by both Simulated and Real Mode paths. */
export function topOneScoreFromVectors(corpusVectors: number[][], queryVector: number[]): number {
  if (corpusVectors.length === 0) return 0;
  let best = -Infinity;
  for (const vector of corpusVectors) {
    const score = cosineSimilarity(vector, queryVector);
    if (score > best) best = score;
  }
  return best;
}

/** Top-1 similarity score: the highest-ranked chunk's cosine similarity, before threshold/Top-K filtering (research.md). */
function topOneScore(chunkTexts: string[], queryVector: number[]): number {
  return topOneScoreFromVectors(chunkTexts.map((t) => embed(t).vector), queryVector);
}

/** Synchronous Simulated Mode sweep -- every point resolves in one pass, no loading/error states (Acceptance Scenario 5). */
export function runSimulatedSweep(
  doc: SampleDoc,
  overlap: number,
  chunkingStrategy: ChunkingStrategy,
  query: string,
): SweepPoint[] {
  const queryVector = embed(query).vector;
  return generateSweepChunkSizes().map((chunkSize) => {
    const clampedOverlap = clampOverlapForChunkSize(overlap, chunkSize);
    const chunks = chunkAtSize(doc, chunkSize, clampedOverlap, chunkingStrategy);
    return {
      chunkSize,
      clampedOverlap,
      status: "done" as const,
      topOneScore: topOneScore(chunks.map((c) => c.text), queryVector),
    };
  });
}

/** Chunks a single sweep point's document -- used by the Real Mode per-point execution path in RetrievalStep.tsx. */
export function chunkTextsForSweepPoint(
  doc: SampleDoc,
  chunkSize: number,
  overlap: number,
  chunkingStrategy: ChunkingStrategy,
): string[] {
  const clampedOverlap = clampOverlapForChunkSize(overlap, chunkSize);
  return chunkAtSize(doc, chunkSize, clampedOverlap, chunkingStrategy).map((c) => c.text);
}

/** FR-004: a curve is "flat" when its top-1 score range across all done points is below this epsilon. */
export const FLAT_CURVE_EPSILON = 0.02;

export function isFlatCurve(points: SweepPoint[]): boolean {
  const scores = points.filter((p) => p.status === "done" && p.topOneScore !== null).map((p) => p.topOneScore as number);
  if (scores.length < 2) return false;
  return Math.max(...scores) - Math.min(...scores) < FLAT_CURVE_EPSILON;
}
