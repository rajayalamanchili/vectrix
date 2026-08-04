# Contract: `ConceptModule` + Registry (supports FR-001, FR-002, SC-002)

**Status**: Already implemented, unchanged by this plan. Documented here
because it's the platform's central extensibility contract (Constitution
Principle I) and User Story 4's independent test target.

## Interface

```ts
// src/lib/concept-types.ts
export interface ConceptModule {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  estimatedTime: string;
  Component: ComponentType;
}
```

## Registration contract

- Exactly one array, `conceptRegistry: ConceptModule[]`, in
  `src/lib/concept-registry.ts`.
- Every `ConceptModule.id` in `conceptRegistry` MUST be unique (FR-001);
  two entries sharing an id is a registry-configuration error, not a
  valid state.
- The home page (`src/app/page.tsx`) and the dynamic concept route
  (`src/app/concepts/[conceptId]/page.tsx`) MUST render purely by
  mapping/looking up `conceptRegistry` -- no per-concept-id conditional
  (`if (id === "rag")`, `switch` on id, etc.) is permitted in either file
  or in any file outside a concept's own folder (`src/concepts/<id>/`).
- Adding a module = adding one new folder under `src/concepts/` plus one
  new import + array entry in `concept-registry.ts`. No other file
  changes.

## Verification

`scripts/checks/no-cross-module-conditionals.ts` (new, this plan) enforces
both the "no conditional outside a concept's own folder" rule and the
`conceptRegistry` id-uniqueness rule above, by static scan and by array
inspection respectively. See `automated-checks-contract.md`.
