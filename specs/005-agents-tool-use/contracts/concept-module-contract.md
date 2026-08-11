# Contract: `ConceptModule` Registration (supports FR-011, SC-006)

**Status**: New registration of an existing, unmodified contract. The
`ConceptModule` interface and `conceptRegistry` array
(`src/lib/concept-types.ts`, `src/lib/concept-registry.ts`) are
Milestone 1's contract, untouched by this plan -- see
`specs/001-core-platform-rag-module/contracts/concept-module-contract.md`.
This file documents this specific module's registration, and is this
milestone's actual proof that the contract generalizes to a second,
structurally different concept.

## This module's `ConceptModule` value

```ts
// src/concepts/agents-tool-use/meta.ts
import type { ConceptModule } from "@/lib/concept-types";
import { AgentsToolUseConcept } from "./AgentsToolUseConcept";

export const agentsToolUseMeta: Omit<ConceptModule, "Component"> = {
  id: "agents-tool-use",
  title: "Agents & Tool Use",
  tagline: "Watch an agent decide whether -- and which -- tool to call.",
  description:
    "Ask a question and step through an agent's reasoning: does it need a tool, which one, what it returns, and how that shapes the final answer. Disable tools to see the agent's path change, then compare a direct-answer, single-tool-call, and multi-step reasoning loop side by side.",
  category: "Agents",
  estimatedTime: "8-12 min",
};

export const agentsToolUseConcept: ConceptModule = {
  ...agentsToolUseMeta,
  Component: AgentsToolUseConcept,
};
```

## Registration change (the only edit outside this module's own folder)

```ts
// src/lib/concept-registry.ts
import { ragConcept } from "@/concepts/rag/meta";
import { agentsToolUseConcept } from "@/concepts/agents-tool-use/meta";

export const conceptRegistry: ConceptModule[] = [ragConcept, agentsToolUseConcept];
```

- Exactly one new import line and one new array entry -- no other line
  in `concept-registry.ts` changes, and `concept-types.ts` is not
  touched at all (FR-011).
- `id: "agents-tool-use"` is distinct from `"rag"` -- `conceptRegistry`'s
  id-uniqueness rule (`check:extensibility`, FR-001 from 001-spec)
  passes without modification, exercising that check against a second
  id for the first time since it was written.
- No file inside `src/app/` changes: the home page grid and the
  `/concepts/[conceptId]` dynamic route both already render purely from
  `conceptRegistry`, so a second entry appears automatically.

## Verification

`scripts/checks/no-cross-module-conditionals.ts` (unmodified) re-scans
its fixed target file list plus the (now two-entry) `conceptRegistry`
array -- passing here for the first time with more than one concept
present is SC-006's actual verification, not merely a re-run of an
existing pass.
