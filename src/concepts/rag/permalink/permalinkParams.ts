/**
 * Shareable permalink encoding (US2, contracts/permalink-contract.md).
 * `PermalinkSourceState`'s field list structurally excludes
 * `realMode.apiKey` and any custom-document text -- there is no field to
 * accidentally serialize (FR-006, FR-007).
 */
import type { ReadonlyURLSearchParams } from "next/navigation";
import { sampleDocs, type ChunkingStrategy } from "../lib/sampleDocs";
import type { GenerationParams, RealModeSession } from "../realMode/types";

export interface PermalinkSourceState {
  realMode: RealModeSession;
  generationParams: GenerationParams;
  docId: string;
  customMode: "sample" | "custom";
  chunkSize: number;
  overlap: number;
  chunkingStrategy: ChunkingStrategy;
  similarityThreshold: number;
  topK: number;
  query: string;
}

export interface ParsedPermalink {
  valid: boolean;
  docNotFound?: string;
  mode?: "sim" | "real";
  docId?: string;
  chunkSize?: number;
  overlap?: number;
  chunkingStrategy?: ChunkingStrategy;
  similarityThreshold?: number;
  topK?: number;
  query?: string;
  temperature?: number;
  fusionN?: number;
  hydeCount?: number;
}

export function buildPermalinkParams(state: PermalinkSourceState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("mode", state.realMode.active ? "real" : "sim");
  if (state.customMode !== "custom") {
    params.set("doc", state.docId);
  }
  params.set("cs", String(state.chunkSize));
  params.set("ov", String(state.overlap));
  params.set("strat", state.chunkingStrategy);
  params.set("th", String(state.similarityThreshold));
  params.set("k", String(state.topK));
  params.set("q", state.query);
  if (state.realMode.active) {
    params.set("temp", String(state.generationParams.temperature));
    params.set("fn", String(state.generationParams.fusionN));
    params.set("hc", String(state.generationParams.hydeCount));
  }
  return params;
}

function parseNumberInRange(raw: string | null, min: number, max: number): number | undefined {
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

export function parsePermalinkParams(params: ReadonlyURLSearchParams): ParsedPermalink {
  if (params.size === 0) {
    return { valid: false };
  }

  const result: ParsedPermalink = { valid: true };

  const mode = params.get("mode");
  if (mode === "sim" || mode === "real") {
    result.mode = mode;
  }

  const doc = params.get("doc");
  if (doc !== null) {
    if (sampleDocs.some((d) => d.id === doc)) {
      result.docId = doc;
    } else {
      result.docNotFound = doc;
    }
  }

  result.chunkSize = parseNumberInRange(params.get("cs"), 20, 120);
  result.overlap = parseNumberInRange(params.get("ov"), 0, 40);

  const strat = params.get("strat");
  if (strat === "fixed" || strat === "sentence") {
    result.chunkingStrategy = strat;
  }

  result.similarityThreshold = parseNumberInRange(params.get("th"), 0, 1);
  result.topK = parseNumberInRange(params.get("k"), 1, 5);

  const query = params.get("q");
  if (query !== null) {
    result.query = query;
  }

  result.temperature = parseNumberInRange(params.get("temp"), 0, 1);
  result.fusionN = parseNumberInRange(params.get("fn"), 2, 5);
  result.hydeCount = parseNumberInRange(params.get("hc"), 1, 3);

  return result;
}
