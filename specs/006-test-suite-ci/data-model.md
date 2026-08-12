# Data Model: Automated Test Suite + CI

This feature's "entities" are CI/tooling constructs, not application
data -- there is no database or persisted user data involved. Each is
either a checked-in manifest structure (verified by a script) or a
platform-native GitHub Actions concept.

## Check

A single named, automated verification, sourced from `package.json`'s
`scripts` for the module-check matrix, or hardcoded for the three fixed
jobs.

| Field | Type | Notes |
|---|---|---|
| `name` | string | For matrix jobs: the `package.json` script key, e.g. `"check:a11y"`. For fixed jobs: `"typecheck"` \| `"lint"` \| `"build"`. |
| `command` | string | The shell command executed, e.g. `npm run check:a11y`. |
| `kind` | `"fixed"` \| `"module-check"` | Fixed jobs are hardcoded in the workflow (typecheck/lint/build, not module-specific); module-check jobs come from the dynamic matrix. |

**Validation rule**: every `module-check`-kind entry's `name` MUST exist
as a key in `package.json`'s `scripts` at workflow-run time (enforced
implicitly -- the matrix is generated *from* that file, so this can't
drift by construction).

## SuccessCriterionCoverage (the traceability manifest entry)

One entry per `SC-###` across the five existing `spec.md` files, defined
in `scripts/checks/lib/sc-traceability-manifest.ts`.

| Field | Type | Notes |
|---|---|---|
| `specPath` | string | Repo-relative path, e.g. `"specs/001-core-platform-rag-module/spec.md"`. |
| `scId` | string | e.g. `"SC-004"`. Unique only in combination with `specPath` (IDs reset per milestone). |
| `coveredBy` | string[] | One or more repo-relative test/check file paths (e.g. `"tests/a11y/viewport-readability.spec.ts"`) whose passing result is this SC's evidence. |
| `note` | string (optional) | Free-text context, e.g. "closed 2026-08-12, previously ad hoc-verified only" -- for entries converted from a prior manual-only gap, per FR-005. |

**Validation rules** (enforced by `scripts/checks/sc-coverage.ts`):
1. Every `SC-###` heading found by parsing the five `spec.md` files MUST
   have at least one manifest entry with a matching `(specPath, scId)`.
2. Every file path listed in `coveredBy` MUST exist in the repository.
3. No manifest entry may reference a `(specPath, scId)` pair that no
   longer exists in the corresponding `spec.md` (catches stale entries
   if a future spec amendment renumbers or removes a criterion).

**Relationships**: many-to-many with `Check` in spirit (one SC can be
covered by several tests; one test file can be cited by several SC
entries, as already happens today -- e.g. an a11y spec covering controls
from two milestones at once, an accepted case per spec.md's Edge Cases).
The manifest does not need to reference `Check.name` directly, since
`coveredBy` points at file paths, not job names -- a test file's own job
membership is whatever `check:*` script includes it in its `playwright
test` invocation.

## CI Run

Not a data structure this codebase constructs -- this is GitHub Actions'
own native concept (one workflow execution against one commit/PR state).
Recorded here only to name it consistently with spec.md's Key Entities
section: its "fields" (per-job status, overall conclusion, associated
PR/commit) are entirely provided by the GitHub Actions platform and
surfaced directly in the PR UI, satisfying FR-010 with no custom code.
