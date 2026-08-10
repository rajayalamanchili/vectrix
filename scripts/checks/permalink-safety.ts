/**
 * SC-002: a permalink must never carry an API key or custom-document
 * text, no exceptions. `PermalinkSourceState`'s own field list already
 * structurally excludes both (contracts/permalink-contract.md) -- this
 * check exercises the real `buildPermalinkParams()` at runtime, against
 * a fixture shaped like a caller who accidentally passed a larger state
 * blob (one that also happens to carry `customText`/`customQuestion` as
 * extra properties TypeScript's structural typing wouldn't catch on a
 * non-literal value), to confirm the implementation itself never reads
 * or serializes them -- not just that the type forbids them at the call
 * site.
 */
import { report, type CheckFailure } from "./lib/report";
import { buildPermalinkParams, type PermalinkSourceState } from "../../src/concepts/rag/permalink/permalinkParams";
import { openaiProviderConfig } from "../../src/concepts/rag/realMode/providerConfigs";

const FAKE_API_KEY = "sk-FAKE-SECRET-KEY-MUST-NEVER-LEAK-1234567890";
const FAKE_CUSTOM_TEXT = "FAKE-CUSTOM-PASTED-DOCUMENT-TEXT-MUST-NEVER-LEAK";

const fixture = {
  realMode: {
    active: true,
    provider: openaiProviderConfig,
    apiKey: FAKE_API_KEY,
    error: null,
  },
  generationParams: { temperature: 0.7, fusionN: 4, hydeCount: 2 },
  docId: "coffee",
  customMode: "custom",
  chunkSize: 60,
  overlap: 15,
  chunkingStrategy: "fixed",
  similarityThreshold: 0.1,
  topK: 3,
  query: "a normal, intentionally-shareable question",
  // Extra properties not part of PermalinkSourceState -- simulates a
  // caller passing a bigger app-state object by mistake. TypeScript's
  // excess-property check only fires on object literals assigned
  // directly to a typed parameter, not on a variable cast like this, so
  // this is a genuine runtime gap the check needs to close.
  customText: FAKE_CUSTOM_TEXT,
  customQuestion: FAKE_CUSTOM_TEXT,
} as PermalinkSourceState;

const output = buildPermalinkParams(fixture).toString();
const failures: CheckFailure[] = [];

if (output.includes(FAKE_API_KEY)) {
  failures.push({ location: "buildPermalinkParams(fixture)", message: "the API key appeared in the permalink output" });
}
if (output.includes(FAKE_CUSTOM_TEXT)) {
  failures.push({
    location: "buildPermalinkParams(fixture)",
    message: "custom document text appeared in the permalink output",
  });
}
if (new URLSearchParams(output).has("doc")) {
  failures.push({
    location: "buildPermalinkParams(fixture)",
    message: "'doc' key was present even though customMode was 'custom'",
  });
}

report("check:permalink-safety", failures);
