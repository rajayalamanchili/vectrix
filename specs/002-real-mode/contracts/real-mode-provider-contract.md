# Contract: `RealModeProvider` + `ProviderConfig` (supports FR-004, FR-006, FR-008, FR-010, FR-012, FR-013, FR-014)

**Status**: New, this plan; re-synced 2026-08-06 against the
`checklists/requirements.md` follow-up. The seam every Real Mode caller
depends on instead of a specific vendor's API directly -- see
research.md's provider-abstraction decision (revised 2026-08-05 to be
config-driven rather than hardcoded to one vendor).

## Interface

```ts
// src/concepts/rag/realMode/types.ts
export interface ProviderConfig {
  id: string;               // free-form, e.g. "openai" -- not a fixed union
  label: string;             // display name for disclosure UI, e.g. "OpenAI"
  baseUrl: string;            // e.g. "https://api.openai.com/v1"
  embeddingsModel: string;    // e.g. "text-embedding-3-small"
  chatModel: string;          // e.g. "gpt-4o-mini"
  keyFormatPattern: RegExp;   // FR-003 pre-validation, e.g. /^sk-/
}

export interface RealModeProvider {
  /** Embeds a batch of texts in one call. Returns one vector per input, same order. */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Generates one completion for `prompt`. `temperature` is passed through unchanged. */
  generate(prompt: string, opts: { temperature: number }): Promise<string>;
}
```

Implemented by `src/concepts/rag/realMode/openaiCompatibleProvider.ts`,
a single adapter taking a `ProviderConfig` and calling
`{config.baseUrl}/embeddings` and `{config.baseUrl}/chat/completions`
directly via `fetch` -- no vendor name appears in the adapter's own
logic, only in the `ProviderConfig` value passed to it. The one
`ProviderConfig` shipped, wired into the UI, and end-to-end tested this
milestone targets OpenAI (`baseUrl: "https://api.openai.com/v1"`,
`embeddingsModel: "text-embedding-3-small"`, `chatModel: "gpt-4o-mini"`);
swapping to a different OpenAI-compatible endpoint is a new
`ProviderConfig` value, not new adapter code. The learner's
`RealModeSession.apiKey` goes in the request's `Authorization` header --
never anywhere else (query string, body, logged, or sent to any other
origin; see `real-mode-automated-checks-contract.md`'s `key-isolation`
check).

A structurally different provider (e.g. Anthropic's Messages API, which
has no embeddings endpoint) cannot be expressed as a `ProviderConfig`
value for this adapter -- it would need its own module implementing only
`generate()`. This is documented in research.md as a design proof, not
built, selectable, or tested this milestone.

## Error contract

Both methods reject with a `RealModeError` **(data-model.md)**, never a
raw `fetch`/provider error object, so every call site can render FR-007's
"clear, specific" message without provider-specific error-shape
knowledge:

| Provider condition | `RealModeError.kind` |
|---|---|
| 401 (bad/missing key) | `"invalid-key"` |
| 429 (rate limited) | `"rate-limit"` |
| `fetch` throws (offline, DNS, CORS block) | `"network"` |
| Any other non-2xx or malformed response | `"other"` |

A multi-call sequence (HyDE, RAG-Fusion) that fails partway MUST stop
issuing further calls and surface `kind: "partial-failure"` with `stage`
identifying which call in the sequence failed (spec.md Edge Cases: "fail
closed... not silently proceed with incomplete results presented as
complete").

**Retry resumes, it doesn't restart** (FR-007, checklist follow-up
2026-08-06): the provider itself has no concept of a "sequence" -- it's
the caller (`VariantsComparison.tsx`'s orchestration, per
`VariantExecutionTrace` in data-model.md) that must retain the results of
whichever calls already succeeded before the failure and re-issue only
the one named by `stage`, not replay the whole HyDE/RAG-Fusion sequence
from its first call. This keeps a retry from re-incurring cost (and a
new API charge) for calls that already completed.

## Key-format pre-validation (FR-003)

Before `RealModeProvider` is ever constructed with a key, the Real Mode
toggle's key-entry UI validates the key against the active
`ProviderConfig.keyFormatPattern` (for the shipped OpenAI config:
non-empty, `sk-` prefix, minimum length) and rejects obviously malformed
input locally -- no network call is made for a key that fails this
check. This is a shape check only; it cannot guarantee the key is valid,
only that it's not obviously garbage (spec.md Edge Cases). Because the
pattern lives on `ProviderConfig` rather than being hardcoded in the
validation function, a different provider's key shape is a config
change, not a rewrite.

## Non-goals

- No streaming -- `generate()` returns the full completion text, since
  no acceptance scenario in spec.md requires token-by-token display.
- No function-calling/tool-use -- out of scope for this milestone's
  variants (naive, HyDE, RAG-Fusion all use plain completions).
- No retry-with-backoff inside the provider itself -- FR-007's "retry"
  option (User Story 4 Acceptance Scenario 2) is a UI-level "run this
  call again," not an automatic provider-level retry policy. For a
  multi-call sequence specifically, "run this call again" means only the
  failed call (see Error contract above), not the whole sequence.
