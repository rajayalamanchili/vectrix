/**
 * Hand-rolled 2-component PCA (power iteration over the covariance
 * matrix of one run's batch of real embedding vectors), mirroring
 * mockEmbedding.ts's dependency-free, hand-rolled-math style rather than
 * adding a dimensionality-reduction library (research.md's projection
 * decision; tech-stack.md).
 *
 * Deterministic given its inputs: a fixed starting vector (the first
 * standard basis vector) and a fixed iteration count, never a random
 * init -- so identical embedding vectors always produce an identical 2D
 * layout, even though the vectors themselves come from a live API
 * response that isn't guaranteed byte-identical run-to-run.
 */

const ITERATIONS = 100;

function meanVector(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const mean = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) mean[i] += v[i] / vectors.length;
  }
  return mean;
}

function centerVectors(vectors: number[][], mean: number[]): number[][] {
  return vectors.map((v) => v.map((x, i) => x - mean[i]));
}

/** Computes (X^T X / n) * v without materializing the covariance matrix. */
function covarianceTimesVector(centered: number[][], v: number[]): number[] {
  const n = centered.length;
  const dim = v.length;
  const xv = centered.map((row) => row.reduce((s, x, i) => s + x * v[i], 0));
  const result = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    let s = 0;
    for (let r = 0; r < n; r++) s += centered[r][i] * xv[r];
    result[i] = s / n;
  }
  return result;
}

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (norm === 0) return v;
  return v.map((x) => x / norm);
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

/** Fixed deterministic start vector: the first standard basis vector. */
function startVector(dim: number): number[] {
  const v = new Array(dim).fill(0);
  v[0] = 1;
  return v;
}

/** `deflateAgainst`, if given, removes that (already-unit) component before each normalization -- used to find the second principal component orthogonal to the first. */
function powerIteration(centered: number[][], dim: number, deflateAgainst?: number[]): number[] {
  let v = startVector(dim);
  for (let iter = 0; iter < ITERATIONS; iter++) {
    let next = covarianceTimesVector(centered, v);
    if (deflateAgainst) {
      const proj = dot(next, deflateAgainst);
      next = next.map((x, i) => x - proj * deflateAgainst[i]);
    }
    v = normalize(next);
  }
  return v;
}

/** Projects a batch of equal-length vectors onto their first two principal components. */
export function projectTo2D(vectors: number[][]): { x: number; y: number }[] {
  if (vectors.length === 0) return [];

  const mean = meanVector(vectors);
  const centered = centerVectors(vectors, mean);
  const dim = mean.length;

  const pc1 = powerIteration(centered, dim);
  const pc2 = powerIteration(centered, dim, pc1);

  return centered.map((v) => ({ x: dot(v, pc1), y: dot(v, pc2) }));
}
