/**
 * The one shipped, wired-in, end-to-end-tested `ProviderConfig` this
 * milestone (research.md's provider decision). Adding or swapping a
 * provider is authoring another value of this shape and pointing
 * `RealModeSession.provider` at it -- not writing new adapter code, for
 * any provider that speaks the OpenAI-compatible REST shape that
 * openaiCompatibleProvider.ts implements.
 */
import type { ProviderConfig } from "./types";

export const openaiProviderConfig: ProviderConfig = {
  id: "openai",
  label: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  embeddingsModel: "text-embedding-3-small",
  chatModel: "gpt-4o-mini",
  keyFormatPattern: /^sk-/,
};
