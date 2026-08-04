/**
 * SC-006: across ten repeated runs with the same document, chunk
 * settings, and query, the retrieval ranking must be byte-for-byte
 * identical every time -- the pipeline's core teaching mechanism is
 * deterministic, not flaky. Uses SC-006's pinned fixture (2026-08-04):
 * the "coffee" document, fixed-size chunking, chunk size 60, overlap 15,
 * and its first listed sample query.
 */
import { report, type CheckFailure } from "./lib/report";
import { sampleDocs, chunkText } from "../../src/concepts/rag/lib/sampleDocs";
import { embed, cosineSimilarity } from "../../src/concepts/rag/lib/mockEmbedding";

const doc = sampleDocs.find((d) => d.id === "coffee");
if (!doc) {
  report("check:determinism", [{ location: "fixture", message: '"coffee" sample document not found' }]);
}

const FIXTURE = {
  chunkSize: 60,
  overlap: 15,
  query: doc!.sampleQueries[0],
};

function runOnce(): string {
  const chunks = chunkText(doc!.text, FIXTURE.chunkSize, FIXTURE.overlap);
  const queryEmbedding = embed(FIXTURE.query);
  const ranked = chunks
    .map((c) => ({ chunkId: c.id, score: cosineSimilarity(embed(c.text).vector, queryEmbedding.vector) }))
    .sort((a, b) => b.score - a.score);
  return JSON.stringify(ranked);
}

const RUNS = 10;
const baseline = runOnce();
const failures: CheckFailure[] = [];

for (let i = 1; i < RUNS; i++) {
  const output = runOnce();
  if (output !== baseline) {
    failures.push({
      location: `run ${i + 1}`,
      message: `diverged from run 1's output. Run 1: ${baseline}. Run ${i + 1}: ${output}`,
    });
    break;
  }
}

report("check:determinism", failures);
