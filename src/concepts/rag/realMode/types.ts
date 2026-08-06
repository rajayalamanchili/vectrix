/**
 * Real Mode's data shapes, all client-side/in-memory (no persistence
 * layer -- see spec.md 002 Assumptions). See
 * specs/002-real-mode/data-model.md for the full field-by-field
 * rationale; this file is the type-level source of truth it describes.
 */
import type { RetrievedChunk } from "../pipeline/steps/RetrievalStep";

/** A data value, not a hardcoded vendor literal -- swapping providers is a new value, not new code. */
export interface ProviderConfig {
  id: string;
  label: string;
  baseUrl: string;
  embeddingsModel: string;
  chatModel: string;
  keyFormatPattern: RegExp;
}

/** The behavioral seam every Real Mode caller depends on -- see contracts/real-mode-provider-contract.md. */
export interface RealModeProvider {
  /** Embeds a batch of texts in one call. Returns one vector per input, same order. */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Generates one completion for `prompt`. `temperature` is passed through unchanged. */
  generate(prompt: string, opts: { temperature: number }): Promise<string>;
}

export type RealModeErrorKind = "invalid-key" | "network" | "rate-limit" | "partial-failure" | "other";

export interface RealModeError {
  kind: RealModeErrorKind;
  /** Plain-language, specific -- never a raw provider error string verbatim (FR-007). */
  message: string;
  /**
   * Which call or (pair, configuration) combination failed, e.g.
   * "corpus-embed", "generate-hypothesis-2", or
   * "eval:{evalPairId}:{configurationId}". Drives Retry's resume-not-
   * restart behavior (FR-007) -- callers set this when they catch a
   * provider-level error, since the provider itself has no concept of
   * "which step in the sequence this was."
   */
  stage: string;
}

/** Lifted state in RagConcept.tsx, shared by both views (FR-001, SC-002). */
export interface RealModeSession {
  active: boolean;
  provider: ProviderConfig;
  /** In-memory only -- never sessionStorage/localStorage (SC-006). Null until FR-003's prompt is completed. */
  apiKey: string | null;
  error: RealModeError | null;
}

/** Learner-adjustable real-generation settings (spec.md Key Entities), shared by both views. */
export interface GenerationParams {
  /** 0.0-1.0, step 0.1, default 0.3 (FR-012). */
  temperature: number;
  /** RAG-Fusion query-variant count, 2-5, step 1, default 3 (FR-013). */
  fusionN: number;
  /** HyDE hypothesis count, 1-3, step 1, default 1 (FR-014). */
  hydeCount: number;
}

/** Replaces `EmbeddedPoint` (mockEmbedding.ts) when Real Mode is active -- same `{ x, y, vector }` shape by design. */
export interface RealEmbeddingResult {
  /** Chunk id, or "query" / "hypothesis-{n}" / "variant-{n}". */
  id: string;
  /** Raw returned embedding vector, used for cosine similarity -- never truncated or altered before scoring. */
  vector: number[];
  x: number;
  y: number;
  projectionMethod: "pca";
}

export type ConfigurationId = "naive" | "hyde" | "fusion";

/** The ordered, inspectable intermediate output of one real variant run (FR-008). */
export type VariantExecutionTrace =
  | {
      variantId: "naive";
      queryEmbedding: RealEmbeddingResult;
      retrieval: RetrievedChunk[];
      callCount: number;
      finalAnswer: string;
      error?: RealModeError;
    }
  | {
      variantId: "hyde";
      /** Length = hydeCount at completion; populated one element per completed call (FR-008). */
      hypotheses: { text: string; embedding: RealEmbeddingResult }[];
      averagedRetrieval: RetrievedChunk[];
      callCount: number;
      finalAnswer: string;
      error?: RealModeError;
    }
  | {
      variantId: "fusion";
      /** Length = fusionN at completion; populated one element per completed call (FR-008). */
      queryVariants: { text: string; embedding: RealEmbeddingResult; retrieval: RetrievedChunk[] }[];
      fusedRetrieval: RetrievedChunk[];
      callCount: number;
      finalAnswer: string;
      error?: RealModeError;
    };

/** Learner-authored (question, expected chunk) pair for recall@K evaluation (US6). */
export interface EvalPair {
  id: string;
  question: string;
  /** A `Chunk.id` from the currently active document -- UI-constrained, never free text. */
  expectedChunkId: string;
}

/** Derived, not learner-authored -- one per configuration tested. */
export interface RecallResult {
  configurationId: ConfigurationId;
  /** The pipeline's current Top-K at evaluation time (FR-011). */
  k: number;
  scorePerPair: { evalPairId: string; hit: boolean }[];
  /** [0, 1]. */
  recallAtK: number;
}
