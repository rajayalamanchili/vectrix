# Contract: Permalink (US2)

`src/concepts/rag/permalink/permalinkParams.ts`

## `buildPermalinkParams(state: PermalinkSourceState): URLSearchParams`

```ts
interface PermalinkSourceState {
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
```

Pure function. Builds a `URLSearchParams` per data-model.md's
`PermalinkParams` table. **Never reads `realMode.apiKey` or any custom
document text field** -- `PermalinkSourceState` doesn't even carry a
`customText`/`customQuestion` field, so there is no field to
accidentally serialize (FR-006, FR-007 enforced by the input type
shape, not just by omission at the call site). When `customMode ===
"custom"`, `doc` is omitted from the output.

This is the function `scripts/checks/permalink-safety.ts` (SC-002)
imports and calls directly against a fixture with a fake
`apiKey`/custom text sitting elsewhere in a full `RealModeSession`, to
assert the *type itself* structurally excludes what FR-006/FR-007
forbid.

## `parsePermalinkParams(params: ReadonlyURLSearchParams): ParsedPermalink`

```ts
interface ParsedPermalink {
  valid: boolean;             // false if params is empty (no permalink was opened)
  docNotFound?: string;       // set when `doc` was present but matches no sampleDocs id
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
```

Pure function, read-only-input. Validates `doc` against the real
`sampleDocs` array (imported from `lib/sampleDocs.ts`) -- a `doc` value
that doesn't match any shipped id sets `docNotFound` instead of
`docId`, so the caller can render the Edge-Cases-required "this document
no longer exists" message instead of silently defaulting.

## Caller contract (`PipelineWalkthrough.tsx`)

- **On mount only** (not on every render/navigation): call
  `useSearchParams()`, pass through `parsePermalinkParams`, and if
  `valid`, apply every present field to the corresponding `useState`
  setter in one pass, plus `onRealModeChange({ ...realMode, active:
  mode === "real" })` and `onGenerationParamsChange({...})` when
  Real-Mode fields are present. If `docNotFound` is set, render a
  dismissible inline message naming the missing document instead of
  applying any document-dependent field.
- **"Generate permalink" button**: calls `buildPermalinkParams`, copies
  `${location.origin}${location.pathname}?${params}` via
  `navigator.clipboard.writeText`, and shows a transient "Copied" status
  in an `aria-live="polite"` region. When `customMode === "custom"`, the
  button's adjacent copy states plainly that the custom document isn't
  included (FR-007) -- rendered every time that mode is active, not only
  after the first generation.

## Required page-level change

`src/app/concepts/[conceptId]/page.tsx` wraps `<Component />` in
`<Suspense>` (research.md's Next.js constraint). This is the only edit
to a file outside `src/concepts/rag/`, and it contains no
`concept.id`-keyed branch.
