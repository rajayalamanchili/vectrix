/**
 * Three curated, deliberately-broken configurations (US3,
 * contracts/failure-preset-contract.md, data-model.md's `FailurePreset`
 * interface) -- each one a real parameter combination that reproduces a
 * named failure against the "coffee" sample document, kept honest by
 * `scripts/checks/failure-presets.ts` (SC-004) running each entry
 * through the live chunk/embed/rank pipeline rather than trusting a
 * stored expectation.
 */
import type { ChunkingStrategy } from "../lib/sampleDocs";

export interface FailurePreset {
  id: string;
  label: string;
  docId: string;
  chunkSize: number;
  overlap: number;
  chunkingStrategy: ChunkingStrategy;
  similarityThreshold: number;
  topK: number;
  query: string;
  explanation: string;
  expectedFailure: { type: "empty-results" } | { type: "fact-split"; factSubstring: string };
}

/** The full espresso-extraction sentence from the "coffee" doc -- names grams and seconds together, the shared "fact" both chunk-size presets below can split apart. */
const ESPRESSO_FACT =
  "Espresso is brewed under high pressure through a fine, compact grind, extracting about 36 to 40 grams of liquid from 18 grams of coffee in 25 to 30 seconds.";

export const FAILURE_PRESETS: FailurePreset[] = [
  {
    id: "threshold-too-strict",
    label: "Threshold too strict",
    docId: "coffee",
    chunkSize: 60,
    overlap: 15,
    chunkingStrategy: "fixed",
    similarityThreshold: 0.9,
    topK: 3,
    query: "How long should espresso extraction take?",
    explanation:
      "The minimum similarity score is set to 0.9 -- higher than any chunk's actual match score for this question -- so every chunk is filtered out before ranking, leaving zero results.",
    expectedFailure: { type: "empty-results" },
  },
  {
    id: "chunk-too-large",
    label: "Chunk too large",
    docId: "coffee",
    chunkSize: 120,
    overlap: 0,
    chunkingStrategy: "fixed",
    similarityThreshold: 0,
    topK: 3,
    query: "How long should espresso extraction take?",
    explanation:
      "Chunk size 120 with no overlap puts a chunk boundary right in the middle of the espresso-extraction sentence, splitting the grams/seconds fact across two separate chunks instead of keeping it in one.",
    expectedFailure: { type: "fact-split", factSubstring: ESPRESSO_FACT },
  },
  {
    id: "chunk-too-small",
    label: "Chunk too small",
    docId: "coffee",
    chunkSize: 20,
    overlap: 15,
    chunkingStrategy: "fixed",
    similarityThreshold: 0,
    topK: 3,
    query: "How long should espresso extraction take?",
    explanation:
      "Chunk size 20 is smaller than the espresso-extraction sentence itself, so the grams/seconds fact is split across multiple chunks and no single chunk contains the complete answer.",
    expectedFailure: { type: "fact-split", factSubstring: ESPRESSO_FACT },
  },
];
