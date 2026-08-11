/**
 * Real Mode sweep call-count formula (FR-003, research.md): one
 * corpus-embed call per sweep point (each point re-chunks at a
 * different size) plus one shared query-embed call, reused across all
 * points since the query text doesn't change during a chunk-size sweep.
 * Same pure-formula style as realMode/callEstimate.ts.
 */
export function sweepCallEstimate(pointCount: number): number {
  return pointCount + 1;
}
