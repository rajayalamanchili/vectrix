/**
 * SC-004: each shipped failure preset must still reproduce its labeled
 * failure against the *live* chunk/embed/rank pipeline, not a stored
 * expected value -- a chunking-algorithm change that silently defuses a
 * preset must be caught here, not discovered later by a learner. See
 * contracts/failure-preset-contract.md.
 */
import { report, type CheckFailure } from "./lib/report";
import { FAILURE_PRESETS } from "../../src/concepts/rag/failurePresets/failurePresets";
import { sampleDocs, chunkText, chunkTextBySentence } from "../../src/concepts/rag/lib/sampleDocs";
import { embed, cosineSimilarity } from "../../src/concepts/rag/lib/mockEmbedding";

const failures: CheckFailure[] = [];

for (const preset of FAILURE_PRESETS) {
  const doc = sampleDocs.find((d) => d.id === preset.docId);
  if (!doc) {
    failures.push({ location: preset.id, message: `sample document "${preset.docId}" not found` });
    continue;
  }

  const chunks =
    preset.chunkingStrategy === "sentence"
      ? chunkTextBySentence(doc.text, preset.chunkSize, preset.overlap)
      : chunkText(doc.text, preset.chunkSize, preset.overlap);

  if (preset.expectedFailure.type === "empty-results") {
    const queryVector = embed(preset.query).vector;
    const surviving = chunks.filter((c) => cosineSimilarity(embed(c.text).vector, queryVector) >= preset.similarityThreshold);
    if (surviving.length !== 0) {
      failures.push({
        location: preset.id,
        message: `expected zero results at threshold ${preset.similarityThreshold}, but ${surviving.length} chunk(s) survived`,
      });
    }
  } else {
    const { factSubstring } = preset.expectedFailure;
    const normalizedDoc = doc.text.replace(/\s+/g, " ").trim();
    if (!normalizedDoc.includes(factSubstring)) {
      failures.push({
        location: preset.id,
        message: `factSubstring is not present in the source document at all -- preset fixture is stale`,
      });
      continue;
    }
    const intactChunk = chunks.find((c) => c.text.includes(factSubstring));
    if (intactChunk) {
      failures.push({
        location: preset.id,
        message: `expected the fact to be split across chunks, but chunk "${intactChunk.id}" contains it intact`,
      });
    }
  }
}

report("check:failure-presets", failures);
