/**
 * Pre-execution call-count formulas (FR-010, FR-013, FR-014, FR-011) --
 * pure functions, shown to the learner before any real call is made so a
 * run's cost is disclosed up front, not discovered after the fact. See
 * research.md's "Call-count estimation" and "evaluation-run call-count
 * estimate" decisions.
 */
import type { ConfigurationId } from "./types";

/** Naive RAG: embed corpus, embed query, generate -- always 3. */
export function naiveCallCount(): number {
  return 3;
}

/** HyDE: M hypotheses (individually visible/retryable) + embed corpus + batch-embed hypotheses + generate. */
export function hydeCallCount(hydeCount: number): number {
  return hydeCount + 3;
}

/** RAG-Fusion: N reworded queries in one call + embed corpus + N per-variant embeds + generate. */
export function fusionCallCount(fusionN: number): number {
  return fusionN + 3;
}

export function callsPerConfiguration(
  configurationId: ConfigurationId,
  params: { hydeCount: number; fusionN: number },
): number {
  switch (configurationId) {
    case "naive":
      return naiveCallCount();
    case "hyde":
      return hydeCallCount(params.hydeCount);
    case "fusion":
      return fusionCallCount(params.fusionN);
  }
}

/**
 * An evaluation run repeats each tested configuration's own per-run call
 * count once per `EvalPair` (FR-011) -- reusing the same 3 / M+3 / N+3
 * figures above rather than a new formula (research.md).
 */
export function evalCallEstimate(
  evalPairCount: number,
  configurationsTested: ConfigurationId[],
  params: { hydeCount: number; fusionN: number },
): number {
  return configurationsTested.reduce(
    (total, id) => total + evalPairCount * callsPerConfiguration(id, params),
    0,
  );
}
