/**
 * SC-001 (003-parameter-exploration): the 9-point chunk-size sweep over
 * the "coffee" sample document and its first sample query must show a
 * clearly flat sub-range (chunk sizes 70-85) and a clearly
 * meaningful-change sub-range (chunk sizes 45-60), per spec.md's own
 * cited deltas (~0.003 flat, ~0.09 meaningful). Previously only
 * confirmed via an ad hoc script against the live pipeline (research.md
 * item 4's Phase 0 audit); this makes that numeric claim a committed,
 * re-runnable fact rather than a one-time historical run. Pure function,
 * no browser -- same style as determinism.ts/failure-presets.ts.
 */
import { report, type CheckFailure } from "./lib/report";
import { sampleDocs } from "../../src/concepts/rag/lib/sampleDocs";
import { runSimulatedSweep } from "../../src/concepts/rag/sweep/runSweep";

const FLAT_DELTA_MAX = 0.01;
const MEANINGFUL_DELTA_MIN = 0.05;

const doc = sampleDocs.find((d) => d.id === "coffee");
const failures: CheckFailure[] = [];

if (!doc) {
  report("check:sweep-shape", [{ location: "fixture", message: '"coffee" sample document not found' }]);
}

const query = doc!.sampleQueries[0];
const points = runSimulatedSweep(doc!, 15, "fixed", query);
const scoreAt = (chunkSize: number): number => {
  const point = points.find((p) => p.chunkSize === chunkSize);
  if (!point || point.topOneScore === null) {
    throw new Error(`no top-1 score for chunk size ${chunkSize}`);
  }
  return point.topOneScore;
};

const flatDelta = Math.abs(scoreAt(85) - scoreAt(70));
if (flatDelta >= FLAT_DELTA_MAX) {
  failures.push({
    location: "chunk sizes 70-85",
    message: `expected a flat sub-range (delta < ${FLAT_DELTA_MAX}), got delta ${flatDelta.toFixed(4)}`,
  });
}

const meaningfulDelta = Math.abs(scoreAt(60) - scoreAt(45));
if (meaningfulDelta < MEANINGFUL_DELTA_MIN) {
  failures.push({
    location: "chunk sizes 45-60",
    message: `expected a meaningful-change sub-range (delta >= ${MEANINGFUL_DELTA_MIN}), got delta ${meaningfulDelta.toFixed(4)}`,
  });
}

report("check:sweep-shape", failures);
