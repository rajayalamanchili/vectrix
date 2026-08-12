# Contract: Success-Criterion Traceability (US2 -- supports FR-004, FR-005; SC-001)

**Status**: New, this plan. See research.md item 3 for why a manifest,
not a comment-parser, was chosen.

## `scripts/checks/lib/sc-traceability-manifest.ts`

```ts
export interface ScCoverageEntry {
  specPath: string;   // e.g. "specs/001-core-platform-rag-module/spec.md"
  scId: string;       // e.g. "SC-004"
  coveredBy: string[]; // repo-relative test/check file paths, >=1 entry
  note?: string;
}

export const SC_TRACEABILITY_MANIFEST: ScCoverageEntry[] = [
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-001",
    coveredBy: ["tests/smoke/first-time-visitor-journey.spec.ts"],
    note: "closed 2026-08-12 -- previously only a historical, uncommitted verification (roadmap.md T051)",
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-004",
    coveredBy: ["tests/a11y/viewport-readability.spec.ts"],
    note: "closed 2026-08-12 -- previously screenshot-only (roadmap.md T050), never a committed regression test",
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-008",
    coveredBy: ["tests/a11y/pipeline-walkthrough.spec.ts"],
    note: "closed 2026-08-12 -- previously an ad hoc script run (roadmap.md 2026-08-05 entry)",
  },
  // ... one entry per remaining SC-### across specs 001-005;
  // for already-automated criteria, `coveredBy` points at the existing
  // check:* script or spec file (e.g. { specPath: ".../002-real-mode/spec.md",
  // scId: "SC-006", coveredBy: ["scripts/checks/key-isolation.ts",
  // "tests/real-mode/key-isolation.spec.ts"] }) -- tasks.md enumerates
  // the full set.
];
```

## `scripts/checks/sc-coverage.ts`

Pure-function check, no browser -- same style as `no-cross-module-
conditionals.ts`/`simulated-disclosure.ts`.

1. For each of the five spec paths, read the file and extract every
   `- **SC-###**:` heading via a regex scan (mirrors how
   `no-cross-module-conditionals.ts` already scans source files for a
   textual pattern -- no markdown-parsing dependency needed).
2. For each extracted `(specPath, scId)`, assert exactly one manifest
   entry exists in `SC_TRACEABILITY_MANIFEST`. **Fail** with a clear
   `"{specPath} {scId} has no traceability-manifest entry"` message if
   zero are found.
3. For each manifest entry, assert every path in `coveredBy` exists on
   disk (`fs.existsSync`). **Fail** with `"{specPath} {scId}'s
   coveredBy path {path} does not exist"` if not.
4. For each manifest entry, assert its `(specPath, scId)` still appears
   in that spec's extracted heading list from step 1 (catches a stale
   entry left behind after a spec amendment renumbers/removes a
   criterion). **Fail** with `"{specPath} {scId} in the manifest no
   longer exists in that spec"` if not.
5. Exit non-zero if any assertion in steps 2-4 failed, printing every
   failure found (not just the first), so a contributor sees the full
   gap list in one run.

This script is what makes spec.md's SC-001 ("100% of Success Criteria
... have at least one committed, automated test") an enforced fact
rather than a claim in a completion report -- exactly the same role
`permalink-safety.ts` plays for Milestone 3's SC-002 and
`cost-ledger-sum.ts` plays for Milestone 4's SC-002.

## Wiring

`package.json` gains:

```json
"check:sc-coverage": "tsx scripts/checks/sc-coverage.ts"
```

added to `check:all`'s chain -- picked up automatically by
`ci-workflow-contract.md`'s `discover-checks` job like any other
`check:*` script, plus its own fixed job in the workflow (since it isn't
module-scoped -- it verifies coverage across all five existing modules'
specs at once, not one module's own behavior).

## Non-goals

- Not a general-purpose spec-linting framework -- it only extracts
  `SC-###` headings, nothing else from spec.md's structure.
- Does not verify a `coveredBy` test currently *passes* -- that's what
  actually running `coveredBy`'s own check:* script does; this script
  only verifies the *mapping* exists and points at real files, closing
  the gap between "an SC is covered" (a claim) and "an SC is covered"
  (a checked fact).
