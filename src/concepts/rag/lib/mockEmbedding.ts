/**
 * A deterministic, dependency-free "embedding" used purely to teach the
 * SHAPE of retrieval -- nearby meaning ends up nearby in space, distance
 * ranks results -- without calling a real embedding model or shipping
 * model weights to the browser.
 *
 * This is intentionally NOT a real embedding: it's a fixed random
 * projection of a small bag-of-words vector, seeded so the same text
 * always lands in the same place. It's honest about that in the UI
 * (see EmbeddingStep.tsx's caption) -- the goal is building intuition
 * for the pipeline's shape, not demonstrating real semantic embedding
 * quality. Swap this module out for a real embeddings API call later;
 * every consumer only depends on `embed()` and `cosineSimilarity()`.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "is",
  "are", "was", "were", "be", "been", "with", "as", "by", "at", "from",
  "that", "this", "it", "its", "which", "who", "will", "can", "may",
  "into", "their", "they", "you", "your", "we", "our", "has", "have",
]);

const VOCAB_DIM = 64;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Simple string hash -> [0, VOCAB_DIM) bucket, stable across runs. */
function bucket(word: string): number {
  let h = 0;
  for (let i = 0; i < word.length; i++) {
    h = (h * 31 + word.charCodeAt(i)) >>> 0;
  }
  return h % VOCAB_DIM;
}

/** Seeded pseudo-random projection matrix (VOCAB_DIM -> 2), fixed across the app. */
const PROJECTION: [number, number][] = (() => {
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1;
  };
  return Array.from({ length: VOCAB_DIM }, () => [rand(), rand()] as [number, number]);
})();

export interface EmbeddedPoint {
  x: number;
  y: number;
  vector: number[]; // the VOCAB_DIM bag-of-words vector, used for cosine similarity
}

/** Embed a piece of text into a bag-of-words vector + a 2D projection for plotting. */
export function embed(text: string): EmbeddedPoint {
  const vector = new Array(VOCAB_DIM).fill(0);
  const tokens = tokenize(text);
  for (const t of tokens) {
    vector[bucket(t)] += 1;
  }
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
  const normed = vector.map((v) => v / norm);

  let x = 0;
  let y = 0;
  for (let i = 0; i < VOCAB_DIM; i++) {
    x += normed[i] * PROJECTION[i][0];
    y += normed[i] * PROJECTION[i][1];
  }
  return { x, y, vector: normed };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
