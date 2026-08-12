# Research: Automated Test Suite + CI

## 1. CI platform

**Decision**: GitHub Actions, `.github/workflows/ci.yml`, triggered on
`pull_request` targeting `main`.

**Rationale**: The repository's remote is `github.com/rajayalamanchili/
vectrix` (confirmed via `git remote -v`), and every prior milestone's
pull request was already merged through GitHub's own PR flow (`git log`
shows "Merge pull request #1" through "#5"). GitHub Actions requires no
new hosting account, integrates with GitHub's native branch-protection
"required status checks" feature for FR-002's merge-block requirement,
and needs no new npm dependency -- continuing every prior milestone's
"no new dependency" precedent (tech-stack.md). `pull_request`-triggered
workflows re-run automatically on every push to the PR's branch, which
satisfies FR-003 for free, with no extra configuration.

**Alternatives considered**: A third-party CI (CircleCI, Travis) would
add an external account/integration for no benefit over Actions, given
the repo is already GitHub-hosted. A local-only `pre-push` git hook was
rejected because it isn't visible to reviewers on the PR itself (FR-010)
and is trivially bypassable (`--no-verify`), undermining SC-002's "every
time, no manual step" guarantee.

## 2. Job structure: matrix-driven, not hand-listed

**Decision**: The workflow's checks run as an array of independent
GitHub Actions jobs: three fixed jobs (`typecheck`, `lint`, `build`) plus
one dynamically-generated matrix job whose entries are the `check:*`
script names read directly out of `package.json` at workflow-run time
(a small `node -e` one-liner in a `discover-checks` job, feeding
`strategy.matrix` in a downstream job via `fromJson()` -- a standard,
well-documented GitHub Actions pattern, no new dependency).

**Rationale**: FR-007 requires that adding a new concept module's check
to the CI gate needs no edit to the CI configuration itself, only an
addition to the existing aggregate command -- mirroring Milestone 5's
own precedent that a new concept module needs "exactly one import and
one array entry" in `concept-registry.ts`, not a core-file edit. Reading
`check:*` script names from `package.json` at run time (rather than
listing them in the YAML) makes `package.json` the single integration
point for both `npm run check:all` (local) and CI (remote) -- adding
module N+1's check script to `package.json` is the only step, exactly
as FR-007 requires. Running each check as its own job (rather than one
job invoking `npm run check:all` as a single shell chain) also directly
satisfies FR-008/SC-004: GitHub's PR UI lists each job by name with its
own pass/fail status natively, with no additional reporting tooling
needed to identify which specific check failed.

**Alternatives considered**: A single job running `npm run check:all`
was rejected -- FR-008/SC-004 would then require scrolling one
long combined log to find which of nine chained commands failed, rather
than seeing it as a distinct named status on the PR. Hardcoding each
check's job name directly in the YAML (one `check:a11y:` job, one
`check:real-mode:` job, etc.) was rejected because it reintroduces
exactly the per-module CI edit FR-007 exists to prevent.

**Secondary benefit**: since jobs run on separate parallel runners, this
also directly helps meet SC-005's 15-minute target -- each `playwright
test` invocation (several of which currently boot their own dev server
from a cold start, since `playwright.config.ts`'s
`reuseExistingServer: !process.env.CI` is `false` under CI) pays that
cost once per job, in parallel, rather than paying it N times
sequentially inside one job the way local `npm run check:all` does.

## 3. Making FR-004's "traceable" requirement itself verifiable

**Decision**: A small checked-in manifest,
`scripts/checks/lib/sc-traceability-manifest.ts`, maps every
`{spec file, SC-ID}` pair to the test file(s)/check script(s) that cover
it. A new pure-function script, `scripts/checks/sc-coverage.ts`, parses
the `SC-###` headings out of the five existing `spec.md` files (the
living source of truth) and fails if any is missing a manifest entry,
or if a manifest entry's referenced file doesn't exist. This becomes
Milestone 6's own hard gate for SC-001 (100% traceable coverage) --
the same "one small purpose-built script proves the milestone's own
hardest-to-fake claim" pattern Milestone 3's `permalink-safety.ts` and
Milestone 4's `cost-ledger-sum.ts` already established.

**Rationale**: FR-004 requires every Success Criterion's automated-test
result to be "traceable" back to that specific criterion -- a prose
claim in a completion report isn't verifiable the way SC-002/SC-004 of
this very spec demand everything else be. The codebase already has a
strong, organic precedent worth building on rather than replacing: most
existing check scripts and Playwright specs already open with a comment
citing the `SC-###` they verify (confirmed by grepping `scripts/checks/
*.ts` and `tests/**/*.spec.ts` -- the large majority already do this).
That convention is good enough for a human reader, but not for an
automated cross-check: `SC-###` numbering resets per milestone (five
different spec.md files each have their own `SC-001`), so a bare
repo-wide grep for `SC-002` cannot tell Milestone 1's `SC-002` apart
from Milestone 4's `SC-002` -- disambiguation today relies on a reader
inferring milestone from directory/module context. Retrofitting every
existing comment to a fully milestone-qualified ID was rejected as
unnecessary churn to already-correct, already-shipped code; a small
explicit manifest instead lets the existing comments stay exactly as
they are (still useful to a human reader in place) while giving the
automated check an unambiguous, structured source of truth.

**Alternatives considered**: Parsing the existing loose `SC-###`
comments automatically (regex over all test/check files, no manifest)
was rejected for the disambiguation reason above. A convention requiring
every future comment to be milestone-qualified (e.g. `SC-002
(004-real-mode-depth)`) was considered but still leaves all pre-existing
comments unusable by an automated parser without a repo-wide rewrite --
the manifest achieves the same verifiability without that churn.

## 4. Coverage gap inventory (Phase 0 audit)

Cross-referencing each of the five `spec.md` files' `SC-###` lists
against roadmap.md's own status notes and the existing `tests/`/
`scripts/checks/` trees (`grep`-confirmed: zero mention of `375`,
`viewport`, or `touch` in any committed test file) surfaces the concrete
gaps FR-005 must close. This list is the starting point for `tasks.md`,
not exhaustive proof every other SC is perfectly covered -- confirming
each of the remaining ~27 SCs' existing coverage is itself part of
building the traceability manifest in item 3 above, and is deferred to
`tasks.md`.

| Spec | SC | Gap | Current evidence |
|---|---|---|---|
| 001-core-platform-rag-module | SC-001 | No committed test exercises the full first-time-visitor journey (home page → completed pipeline) end-to-end | roadmap.md: re-verified 2026-08-05 "for the first time" against a real browser (T051), but that was a one-time historical run, not a committed regression spec |
| 001-core-platform-rag-module | SC-004 | Zero committed test for 375px-viewport readability (no horizontal scroll, no clipped text, 44x44px touch targets) | roadmap.md: "verified manually via Playwright screenshots during the original build (T050)"; confirmed via grep, no committed test references viewport/375/touch |
| 001-core-platform-rag-module | SC-008 | The chunking-strategy boundary-difference scenario (coffee doc, size 60, 6 vs. 10 chunks) was confirmed via an ad hoc script, not committed | roadmap.md 2026-08-05 entry: "confirmed... via an ad hoc script" |
| 005-agents-tool-use | SC-001 / SC-007 | Two quickstart.md scenarios (question-switch state reset; Compare Strategies' same-final-answer-more-steps difference) verified only via ad hoc script | roadmap.md Milestone 5 status: "the last two of which... were confirmed with ad hoc scripts against the dev server" |

**Rationale for scoping the audit this way**: spec.md's FR-004 sets a
100%-coverage bar, but roadmap.md's own status notes are the most
reliable, already-written record of exactly which scenarios were
verified by a human rather than a committed test -- re-deriving that
from scratch by re-auditing all 31 SCs' test coverage line-by-line
belongs in `tasks.md` (where each gap becomes a concrete task, and the
manifest's completeness is itself what `sc-coverage.ts` verifies), not
in this research document.

## 5. Structural/DOM assertion approach for SC-004 (per `/speckit-clarify`)

**Decision**: `tests/a11y/viewport-readability.spec.ts`, a new Playwright
spec, sets the viewport to 375x667 (a common small-phone size already
implied by spec.md's "375px-wide"), navigates the Pipeline Walkthrough
and Compare Variants views, and asserts: `document.documentElement
.scrollWidth <= document.documentElement.clientWidth` (no horizontal
scroll), no element's rendered text is clipped via `overflow: hidden`
combined with `scrollWidth > clientWidth` on text-bearing elements, and
every interactive control's bounding box is >= 44x44 CSS px.

**Rationale**: Directly implements the `/speckit-clarify` answer:
structural/DOM assertions, no pixel-diff baseline tooling, no new
dependency (Playwright's existing `page.evaluate`/`boundingBox()` APIs
cover all three checks).
