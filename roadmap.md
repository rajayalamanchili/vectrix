# Roadmap

**Project**: Vectrix
**Governing rule**: per the constitution's Development Workflow section,
a milestone does not begin until the previous milestone's `spec.md`
Success Criteria are met.

---

## Milestone 1: Core Platform + RAG Concept Module
**Spec**: `specs/001-core-platform-rag-module/spec.md`
**Status**: `/speckit.implement` has run (2026-08-04). FR-013
(similarity-threshold), FR-014 (chunking-strategy toggle, incl.
`aria-pressed`), FR-001 (registry id-uniqueness), and all of Phase 6.5's
accessibility-closure work (focus-indicator CSS, non-color chart marker,
focus management after a stepper jump and after the document/strategy
auto-reset, empty-list landmark) are now built -- `tsc --noEmit` and
`eslint` both pass clean. All four automated checks
(`check:extensibility`, `check:disclosure`, `check:determinism`,
`check:a11y`) now run and pass.

**Update (2026-08-05)**: the prior root/sudo gap is closed (Chromium's
system libraries were installed via `sudo npx playwright install-deps
chromium` in a session with sudo access). `check:a11y` (T034/T043's 14
Playwright tests) ran for real for the first time and initially failed
5 of 14 -- genuine defects invisible to static `playwright test --list`
validation, not environment noise: an axe heading-order violation and a
broken FIFO-replacement flow in Compare Variants, a non-focusable
scrollable region on the Document step, and (the most significant) the
Chunking step's strategy toggle resetting query/stepper state on every
switch, contradicting spec.md's own Edge Cases section, plus a
resulting stepper-jump focus-target bug on the Retrieval step. All 5
are now fixed; `check:a11y` passes 14/14, re-run twice with no flake.
T036 (US1's manual-scenario walkthrough) is done, including the two
scenarios not covered by the Playwright specs' assertions
(chunking-strategy boundary difference, non-color chart distinction
under emulated color-vision deficiency), verified with an ad hoc script
against the dev server. T044 (US3's manual-scenario walkthrough) is
also done, verified via mouse-click interaction (not just keyboard) --
all four of spec.md US3's acceptance scenarios confirmed, including
that the FIFO-replacement fix from T036 holds for mouse input too, not
only keyboard. **T051 (the final `npm run check:all` + full
quickstart.md manual-scenario re-run) is also done -- all 57 of 57
tasks in `tasks.md` are complete, and Milestone 1's Definition of Done
is met.** T051's pass re-confirmed the two quickstart.md scenarios not
directly exercised by T036/T044 -- US1's full 5-step pipeline and US2's
home page discovery -- against a real browser for the first time (their
only prior evidence was a historical "verified via Playwright
screenshots during the original build" claim); no further defects
found. See `tasks.md` T036/T044/T051 for the full defect list and
fixes, and `tasks.md` for the full 57-task breakdown.

**Scope**: The `ConceptModule` contract and central registry; the RAG
module's Pipeline Walkthrough (Document -> Chunking -> Embedding ->
Retrieval -> Generation, with chunking-strategy and similarity-threshold
controls added alongside Milestone 2's planning per the parameter-impact
review) and Compare Variants view (naive RAG baseline plus five
variants).

**Definition of done**:
- All acceptance scenarios in `spec.md` User Stories 1-3 pass, including
  the similarity-threshold and chunking-strategy scenarios added during
  the parameter-impact review.
- FR-013 (similarity-threshold control) and FR-014 (chunking-strategy
  toggle) -- **built** 2026-08-04 (`RetrievalStep.tsx`, `ChunkingStep.tsx`,
  `sampleDocs.ts`'s `chunkTextBySentence`). Filtering is applied before
  Top-K slicing per the corrected FR-013 composition order.
- SC-001 -- **re-verified** 2026-08-05 against a real Chromium build
  (T051): a first-time visitor's path from the home page through the
  RAG card to a completed pipeline walkthrough (ranked results,
  assembled prompt, disclosed simulated answer) was confirmed
  end-to-end, not just via the original build's historical Playwright
  screenshots. SC-004 remains as verified manually via Playwright
  screenshots during the original build (T050, 375px-viewport
  readability -- not part of quickstart.md's 8-scenario list T051
  re-ran). SC-006 (determinism) -- **verified** by
  `scripts/checks/determinism.ts` against the pinned "coffee" fixture,
  passing. SC-007 and SC-008 (threshold-empties-results,
  chunking-strategy-produces-different-boundaries) -- **verified**
  2026-08-05 against a real Chromium build: `check:a11y`'s threshold
  test passes, and an ad hoc script confirmed the coffee/size-60 fixture
  produces 6 fixed-size vs. 10 sentence-boundary chunks with genuinely
  different `(start,end)` pairs. Verifying this surfaced a real bug in
  the chunking-strategy toggle (it was resetting stepper/query state on
  every switch, contradicting spec.md's Edge Cases section) -- now
  fixed, see `tasks.md` T036.
- SC-002 (`check:extensibility`, now also covering FR-001's
  registry-uniqueness rule) and SC-003 (`check:disclosure`) --
  **verified**, both pass. SC-005 (`check:a11y`) -- **verified**
  2026-08-05: the two Playwright specs (T034/T043, 14 tests) now
  actually run against a real Chromium build (system libraries
  installed via `sudo npx playwright install-deps chromium`) and pass
  14/14, re-run twice with no flake. The first real run failed 5 tests;
  all 5 were genuine defects (not flaky/environment noise), now fixed
  -- see `tasks.md` T036 for the full list.
- User Story 4's contract (the `ConceptModule` interface + registry
  pattern) exists and type-checks; its full acceptance scenario is only
  verifiable once a second module exists (Milestone 5).
- FR-001's `ConceptModule.id` uniqueness rule (added via `/speckit.clarify`
  2026-08-04) -- **built and verified**: folded into `check:extensibility`
  (`tasks.md` T048's expanded scope), which passes.
- FR-005 (chart highlighting), FR-009 (Compare Variants keyboard/FIFO
  scope), FR-011 (keyboard operability -- rewritten), and FR-014
  (chunking-strategy toggle selected-state), refined by the
  `checklists/accessibility.md` pass (2026-08-04) -- **built**:
  `tasks.md` Phase 6.5 (T053-T057, a global focus-indicator style, a
  diamond-marker non-color chart cue, focus management after a stepper
  jump and after the document/strategy-switch reset, and an empty-state
  landmark) is complete and type-checks/lints clean. FR-009's
  keyboard/FIFO scope and FR-005's color-independence are exercised by
  T043/T034 respectively, both blocked on the same `check:a11y`
  execution gap above -- not a known defect, but not yet proven correct
  by an actual browser run either.

**Explicitly not included**: a second concept module, any real
embedding/LLM API integration, backend/persistence, deployment.

### A note on sequencing
This project's Milestone 1 was prototyped first (to
validate the design -- star-chart visualization, guided stepper,
variants comparison -- was actually worth building) and the formal
`spec.md`/constitution were written afterward, codifying what the
prototype got right and flagging what it's still missing (the automated
extensibility/disclosure/accessibility checks above). Continuing work
from here should follow the constitution's Principle VI going forward:
new modules get a spec before code, even though Milestone 1 itself
didn't strictly happen in that order.

---

## Milestone 2: Real Mode for the RAG Module
**Spec**: `specs/002-real-mode/spec.md`
**Status**: `/speckit.implement` has run (2026-08-08). All 59 tasks in
`tasks.md` are complete. `npm run check:all` (extensibility, disclosure,
determinism, `check:a11y` 37/37, `check:key-isolation`, `check:real-mode`
17/17) passes clean, alongside `npm run build`/`tsc`/`eslint`. The
Milestone 1 regression pass (T056) confirmed zero behavioral difference
with Real Mode present but never toggled on. A real end-to-end run
against the live OpenAI API (T058-T059) confirmed Real Mode activation,
real embedding/retrieval charts, real generation with observable
temperature effects, and HyDE/RAG-Fusion executing for real with visible
intermediate steps and honest non-executable-variant labeling -- this
also retroactively closed T023/T035/T048/T055, which had been left
blocked earlier in the implementation for lack of a real API key.
Milestone 2's Definition of Done is met.

**Scope**: An opt-in, clearly labeled "Real Mode" layered on top of the
existing Simulated Mode, adding: real embeddings (with the projection
method disclosed), real document/question input, real generation with a
learner-adjustable temperature control, real execution of the HyDE and
RAG-Fusion variants specifically (with their intermediate steps
surfaced, and RAG-Fusion's query-variant count and HyDE's
hypothetical-answer count both learner-adjustable, not fixed constants),
and a lightweight recall@K evaluation against learner-defined (question,
expected chunk) pairs.

**Why this comes before the second concept module**: Real Mode extends
and completes the RAG module that already exists, rather than depending
on the extensibility pattern being proven first -- it's the more urgent
gap (closing the fidelity gap against tools like RAGxplorer) and doesn't
require a second module to exist. Milestone 5 (second concept module)
still proves extensibility, once RAG itself is more complete -- Milestones
3 and 4 below extend the RAG module further first, since they build
directly on Real Mode rather than on the extensibility pattern.

**Definition of done**:
- All acceptance scenarios in `specs/002-real-mode/spec.md` pass.
- Milestone 1's full acceptance-scenario and Success-Criteria suite still
  passes with Real Mode present but inactive (SC-001, SC-002 in the Real
  Mode spec) -- this is a hard regression gate, not a nice-to-have.
- SC-006 (no API key ever reaches a first-party server or log) is
  verified, not assumed, given this is the one requirement in the whole
  project so far with a real security/privacy consequence if wrong.
- GraphRAG, Self-RAG, and Agentic RAG remain explicitly labeled
  explanatory-only in the UI -- their real execution is out of scope
  here (see spec.md 002 Assumptions) and deferred, not silently implied.

**Explicitly not included**: a backend proxy for API keys, real
execution of GraphRAG/Self-RAG/Agentic RAG, any persistence of learner
data across sessions.

---

## Milestone 3: Parameter Exploration & Sharing
**Spec**: `specs/003-parameter-exploration/spec.md`
**Status**: `/speckit.implement` has run (2026-08-10). All 31 tasks in
`tasks.md` are complete. `npm run check:all` (extensibility, disclosure,
determinism, `check:a11y` 48/48, `check:key-isolation`, `check:real-mode`
17/17, `check:parameter-exploration`) passes clean, alongside `npm run
build`/`tsc`/`eslint`. The Milestone 1+2 regression pass found one
genuine (non-behavioral) regression: two Milestone 1 a11y tests assumed
a single page-wide `role="status"` element, which broke once
`PermalinkButton`'s own always-present `aria-live` region was added --
fixed by scoping those two tests' locators to their message text: no
actual learner-facing behavior changed. A second real defect (not just a
test issue) was caught by `check:a11y` itself: the failure-preset
picker's selected-state styling (`text-danger` on a `bg-danger/15` tint)
scored 4.12:1 contrast, under WCAG's 4.5:1 minimum -- fixed by dropping
the background tint and using an underline instead for the selected
state, matching the already-passing unselected style's contrast.
SC-002 (permalink-safety.ts, fixture-based: verifies `buildPermalinkParams`
never serializes an API key or custom document text even when a caller
passes a larger, non-conforming state object at runtime) and SC-004
(failure-presets.ts: runs all three shipped presets through the live
chunk/embed/rank pipeline, not stored expectations) both pass as the
hard gates spec.md requires. Milestone 3's Definition of Done is met.

**Scope**: Parameter sweep curves (starting with chunk size), showing an
output metric across a whole range instead of one point at a time;
shareable permalinks encoding the full non-secret configuration state
(mode, chunking/retrieval/generation parameters); and at least three
curated, verified-to-still-work "known failure" presets (threshold too
strict, chunk too large, chunk too small) with an explanation of the
causing parameter attached to each.

**Why this comes before the second concept module**: Like Real Mode,
this extends and deepens the RAG module's existing teaching value rather
than depending on the extensibility pattern being proven -- and the
permalink feature in particular is more useful once it can encode Real
Mode's parameters too (Milestone 2), so it belongs after Real Mode, not
before it.

**Definition of done**:
- All acceptance scenarios in `specs/003-parameter-exploration/spec.md`
  pass.
- SC-002 (permalinks never contain a credential) and SC-004 (failure
  presets are verified, by automated check, to still produce their
  labeled failure) are both hard gates -- SC-002 for an obvious security
  reason, SC-004 because a stale, silently-broken teaching preset is
  worse than no preset at all.
- Milestones 1 and 2's full acceptance-scenario suites still pass
  (regression check).

**Explicitly not included**: sweeping more than one parameter
simultaneously; auto-generated failure presets for learner-supplied
custom documents.

---

## Milestone 4: Real Mode Depth -- Comparison & Cost Tracking
**Spec**: `specs/004-real-mode-depth/spec.md`
**Status**: `/speckit.implement` has run (2026-08-11). All 35 tasks in
`tasks.md` are complete -- US1 (Compare Simulated vs Real) landed first,
US2 (the cost/call ledger) completed this pass. `npm run check:all`
(extensibility, disclosure, determinism, `check:a11y` 59/59,
`check:key-isolation`, `check:real-mode` 17/17,
`check:parameter-exploration` 6/6, `check:real-mode-depth`
[`cost-ledger-sum.ts` + 10 Playwright tests + 11 a11y tests]) passes
clean, alongside `npm run build` and `npx eslint .`. SC-002's hard gate
(`scripts/checks/cost-ledger-sum.ts`) verifies, against a live fixture
run, that the ledger's summed total exactly matches `costEstimateUsd()`'s
own pre-call estimate for naive/HyDE/RAG-Fusion, and that a call
rejecting partway through a sequence adds nothing to the total. The
Milestone 1-3 regression pass found zero behavioral difference now that
every pre-existing real-call site (`RetrievalStep`, `EmbeddingStep`,
`GenerationStep`, `VariantsComparison`, `EvalPanel`) routes its provider
construction through `createTrackedProvider`. Building and verifying the
ledger surfaced one genuine, pre-existing defect this milestone's own
work exposed rather than introduced: `CompareSimulatedVsReal.tsx`'s Real
half (built under US1) never issues a final-answer generate call, since
this view compares retrieval rankings only (contracts/comparison-
contract.md's Non-goals) -- its pre-call call-count/cost estimate had
been silently overcounting by exactly one generate call for every
configuration, caught only once SC-002's exact-match verification made
the drift impossible to miss; fixed as part of this pass, alongside
adding the dollar-estimate figure cost-ledger-contract.md's own example
calls for ("Estimated calls for this run: 4 (~$0.0004)") to three sites
(`VariantsComparison.tsx`, `EvalPanel.tsx`, the chunk-size sweep) that
had shipped with a call count only, no dollar figure. Milestone 4's
Definition of Done is met.

**Scope**: A side-by-side Simulated-vs-Real comparison view for the same
document and question, with each chunk's rank in both modes directly
inspectable; and a cumulative cost/call ledger that persists across an
entire Real Mode session rather than resetting per action, including a
learner-configurable warning threshold.

**Definition of done**:
- All acceptance scenarios in `specs/004-real-mode-depth/spec.md`
  pass -- **verified** (2026-08-11) via `tests/real-mode-depth/`'s three
  Playwright specs (10 tests) plus `tests/a11y/compare-simulated-vs-real
  .spec.ts` and `tests/a11y/cost-ledger.spec.ts` (11 tests), all mocked
  at the HTTP layer, no real API key in CI.
- SC-002 (the cumulative ledger's displayed total is verified, by
  automated check, to match the sum of individual actions' own
  estimates) is a hard gate -- a cost tracker that silently drifts from
  reality is actively worse than no tracker. **Verified**:
  `scripts/checks/cost-ledger-sum.ts` passes, and this exact check is
  what caught the `CompareSimulatedVsReal.tsx` estimate-drift defect
  described above before it could ship silently.
- Milestones 1-3's full acceptance-scenario suites still pass
  (regression check) -- **verified**, zero behavioral difference found.

**Explicitly not included**: live pricing lookups from provider APIs
(static pricing table only); real execution of GraphRAG/Self-RAG/Agentic
RAG (still out of scope, unchanged from Milestone 2).

---

## Milestone 5: Second Concept Module -- Agents & Tool Use
**Spec**: `specs/005-agents-tool-use/spec.md`
**Status**: `/speckit.implement` has run (2026-08-12). All 23 tasks in
`tasks.md` are complete. `npm run check:all` (extensibility, disclosure,
determinism, `check:a11y` 66/66 [+7 new], `check:key-isolation`,
`check:real-mode` 17/17, `check:parameter-exploration` 6/6,
`check:real-mode-depth`, `check:agents-tool-use`
[`agent-determinism.ts` + `agent-tool-toggle-effect.ts` + 2 Playwright
specs]) and `npm run build`/`tsc`/`eslint` all pass clean. This is the
platform's first genuinely new concept module since Milestone 1's RAG --
it registers with exactly one import and one array entry in
`concept-registry.ts`, and `check:extensibility`'s existing, unmodified
scan now passes against a two-entry registry for the first time,
actually proving Principle I rather than just asserting it. All three
user stories are built and independently verified: the Walkthrough view
(US1 -- sample-question chips plus a custom-question input, both driving
one `runSingleToolCall` engine, with the tool-selection reasoning step
disclosed as a simplified rule-based simulation); per-tool enable/disable
toggles that visibly change the agent's path, including the
never-an-error all-tools-disabled fallback (US2); and the Compare
Strategies view showing Direct Answer, Single Tool Call, and a
Multi-Step Reasoning Loop (capped at `MAX_ITERATIONS = 3`) run against
the same question at once, where the loop's added "double-checking" step
is real, visible overhead and its `"gave-up"` outcome (on the shipped
"no tool fits" question) is a genuinely reachable failure mode, not a
synthetic one (US3). The a11y pass (`tests/a11y/agents-tool-use.spec.ts`)
caught one real defect on first run: `StrategyComparison.tsx`'s panel
headings used `<h3>` directly under the page's `<h1>`, an axe
heading-order violation, since this view (unlike RAG's own
`VariantsComparison.tsx`, which the fix now matches) had no intervening
`<h2>` -- fixed by promoting each panel's strategy-name heading to
`<h2>`. The Milestone 1-4 regression pass (the full pre-existing
`npm run check:all`, 66 total a11y tests including the pre-existing 59)
found zero behavioral difference in the RAG module, and the home page
now shows two concept cards. Milestone 5's Definition of Done is met.

**Scope**: One new concept module, Agents & Tool Use, added under
`src/concepts/agents-tool-use/` using only the `ConceptModule` contract
and one registry line -- a deterministic, disclosed simulation of an
agent deciding whether and which of three non-overlapping tools
(Calculator, Unit Converter, Knowledge Lookup) to call for a learner's
question, in two views: Walkthrough (US1-2) and Compare Strategies (US3).

**Definition of done**:
- All acceptance scenarios in `specs/005-agents-tool-use/spec.md` User
  Stories 1-3 pass -- **verified** (2026-08-12) via `tests/agents-tool-
  use/`'s two Playwright specs, `tests/a11y/agents-tool-use.spec.ts`'s
  seven tests, and this feature's 13 `quickstart.md` manual scenarios,
  the last two of which (question-switch state reset, US3's
  same-final-answer-more-steps comparison) were confirmed with ad hoc
  scripts against the dev server in addition to the committed specs.
- SC-002's automated extensibility check (built in Milestone 1) passes
  for the new module without modification -- **verified**:
  `check:extensibility` passes against the now-two-entry registry.
- The new module independently satisfies Constitution Principles II-V
  (disclosed simulation if any, purposeful interactivity, guided style,
  determinism) -- these aren't RAG-specific, they're platform-wide.
  **Verified**: `check:disclosure` (4 disclosure elements: Walkthrough +
  3 strategy panels, each independently marked), `agent-determinism.ts`
  (10-run determinism across both the final-answer and gave-up paths,
  SC-003), and `agent-tool-toggle-effect.ts` (SC-002's toggle-changes-
  the-path guarantee) all pass.
- Milestones 1-4's full acceptance-scenario suites still pass
  (regression check) -- **verified**, zero behavioral difference found;
  see Status above for the one real (accessibility, not behavioral)
  defect this milestone's own a11y check caught and fixed in its own new
  code.

---

## Milestone 6: Automated Test Suite + CI
**Spec**: `specs/006-test-suite-ci/spec.md`
**Status**: `/speckit.implement` has run (2026-08-12). All 21 tasks in
`tasks.md` are complete. `npm run check:all` (all 11 chained checks,
including the new `check:smoke` and `check:sc-coverage`, 69/69 a11y
tests) plus `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all
pass clean. A GitHub Actions workflow (`.github/workflows/ci.yml`) now
gates every PR against `main` with a `discover-checks` job that reads
`package.json`'s `check:*` script names into a matrix at run time (so a
new module's check is CI-enforced the moment its script is added, no
YAML edit), plus fixed `typecheck`/`lint`/`build`/`sc-coverage` jobs, all
required status checks on `main`'s branch protection. The traceability
audit (T011) found 33 `SC-###` entries across specs 001-005, 2 more
genuinely-uncovered gaps than research.md's original 5 (002 SC-003, 003
SC-001's own numeric claim) -- all 7 closed, all 33 now covered in
`scripts/checks/lib/sc-traceability-manifest.ts` and enforced by
`check:sc-coverage`, a hard merge-blocking gate. All three user stories
were verified against real GitHub Actions runs, not just local
`check:all`: US1's regression-blocks-merge/revert-restores-mergeability/
no-false-positive scenarios via throwaway PRs #6 and #7 (T004-T005); US3's
failing-check identifiability (T016) via PR #6's own original failing
run, which showed `module-checks (check:a11y)` as an individually-named
failing status alongside 13 green ones, its log pinpointing the exact
spec/line/test/axe-rule with no ambiguity -- no check output needed
improving. SC-005 (a real PR's workflow completes within 15 minutes) and
SC-006 (identical results across 3 reruns of the same commit) were both
verified for real via a third throwaway PR (#8, closed without merging):
run 31649201895 completed in 2m8s, then two `gh run rerun`s of that same
commit completed in 1m50s and 1m58s, all three concluding `success`.
Building this feature's own `check:sc-coverage` gate surfaced no new
application defects (this milestone adds no `src/concepts/` behavior),
but re-verifying it live (T018 scenario 4) confirmed the gate is a real
completeness check, not a trivial pass -- deleting one manifest entry
made it fail, naming the exact missing `(specPath, scId)` pair, before
being restored. Milestone 6's Definition of Done is met.

**Scope**: Formalize the manual-Playwright verification used during
Milestones 1-5 into an actual automated test suite (GitHub Actions +
the project's existing Playwright/`tsx`-script precedent, see
tech-stack.md), wired into CI so every Success Criterion across all
prior milestones regresses loudly instead of silently.

**Definition of done**:
- Every Success Criterion across Milestones 1-5 has a corresponding
  automated test, not a manual verification note -- **verified**:
  `scripts/checks/lib/sc-traceability-manifest.ts` maps all 33 `SC-###`
  entries across specs 001-005 to committed test/check files, and
  `npm run check:sc-coverage` (a hard merge-blocking gate, SC-001 of
  this feature's own spec.md) enforces completeness on every PR.
- CI blocks merge on any regression -- **verified**: `.github/workflows/
  ci.yml`'s matrix and fixed jobs are all required status checks on
  `main`'s branch protection from the moment each is added (no advisory
  period), confirmed against three real throwaway PRs (#6, #7, #8) that
  exercised a deliberate regression, a docs-only false-positive check,
  and SC-005/SC-006's timing/determinism claims respectively.

---

## Milestone 7: Deployment -- Vercel Staging & Production
**Spec**: `specs/007-vercel-deployment/spec.md` (not yet written --
per Constitution Principle VI, `/speckit.specify` and `/speckit.plan`
run before implementation begins, same discipline as every milestone
since Milestone 1).
**Status**: Not started. Vercel was chosen as the deployment target in
conversation on 2026-08-13 -- this milestone is that decision's
follow-through, superseding the "deferred until there's a reason to
deploy" stance this file and `tech-stack.md` both held through Milestone
6. No code, config, or Vercel project exists yet.

**Scope**: Stand up two persistent environments for the app as it
exists today -- a production deployment tracking `main`, and a staging
deployment tracking a long-lived `staging` branch -- both on Vercel,
both redeploying automatically on push via Vercel's native GitHub
integration. Infrastructure/config only; no new application behavior.

**Why this comes after Milestone 6**: CI already gates every PR against
`main` before merge (Milestone 6); deployment should sit on top of a
`main` that's already continuously verified, not the other way around.

**Definition of done** (draft -- to be finalized in `spec.md`):
- A production deployment is live at a stable URL and redeploys
  automatically on every push to `main`.
- A staging deployment is live at its own stable URL and redeploys
  automatically on every push to a `staging` branch, so changes are
  reviewable in a real deployed environment before merging to `main`.
- No secret is required at build or deploy time -- the app has none
  server-side today (`process.env` is unreferenced anywhere in `src/`),
  and this milestone must not introduce one without amending
  `tech-stack.md`'s existing key-isolation stance first.
- `tech-stack.md`'s "Explicitly not yet decided" section is amended to
  record Vercel as the chosen platform, with rationale, as part of this
  feature's `/speckit.plan`.

**Explicitly not included**: a custom domain (default `*.vercel.app`
URLs are sufficient to start), any server-side environment-variable
secret, any change to the app's existing client-side-only Real Mode
architecture.

---

## Out of current roadmap (not planned, not rejected)
- Real embedding-model / LLM API integration for the *default* experience
  -- Milestone 2 (Real Mode) adds this as an explicit opt-in layer, but
  Simulated Mode's disclosed simulation remains the default (Constitution
  Principle V), not replaced by default. This entry is intentionally
  narrowed rather than removed: full real-mode execution of GraphRAG,
  Self-RAG, and Agentic RAG specifically remains deferred beyond
  Milestone 2 (see `specs/002-real-mode/spec.md` Assumptions).
- A backend proxy for Real Mode API keys -- Milestone 2 keeps Real Mode
  entirely client-side (key goes straight from the learner's browser to
  their chosen provider); a proxy would only become worth its added
  backend complexity if a concrete need for hiding keys in a shared or
  public deployment context emerges.
- Saved learner progress / accounts -- would require a backend, which is
  explicitly out of scope until a concrete module needs it.

Keeping this section explicit documents what was considered and
deliberately deferred, rather than leaving it ambiguous whether it was
forgotten.

**Version**: 1.13.0 -- 2026-08-13, added Milestone 7 (Deployment --
Vercel Staging & Production) as a planned, not-yet-started milestone --
Vercel was chosen as the deployment target in conversation, resolving
the "deployment target selection" item this file previously listed
under "Out of current roadmap." No spec, plan, or code exists yet for
this milestone; per Constitution Principle VI, `/speckit.specify` runs
next, not implementation directly.

Supersedes 1.12.0 (2026-08-12, **Milestone 6's Definition of Done is
fully met -- all 21 of 21 tasks in `specs/006-test-suite-ci/tasks.md`
are complete.** `npm run check:all` (all 11 chained checks, including
the new `check:smoke` and `check:sc-coverage`, 69/69 a11y tests) plus
`npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean.
A GitHub Actions workflow (`.github/workflows/ci.yml`) now gates every
PR against `main`, with a `discover-checks` job reading `package.json`'s
`check:*` script names into a matrix at run time -- extending Constitution
Principle I's "one array entry, no core-file edit" extensibility
guarantee into CI for the first time -- plus fixed `typecheck`/`lint`/
`build`/`sc-coverage` jobs, all required status checks on `main`'s
branch protection from the moment each was added. The traceability audit
found 33 `SC-###` entries across specs 001-005, 2 more genuinely-
uncovered gaps than the original 5-gap estimate (002 SC-003, 003 SC-001's
own numeric claim) -- all 7 closed and all 33 now enforced by
`check:sc-coverage`, a hard merge-blocking gate verified to genuinely
detect gaps (a deleted manifest entry makes it fail, naming the exact
missing pair) rather than trivially pass. All three user stories were
verified against real GitHub Actions runs, not just local `check:all`:
regression-blocks-merge, revert-restores-mergeability, and no-false-
positive via throwaway PRs #6 and #7; failing-check identifiability via
PR #6's own failing run, which showed one individually-named failing job
alongside 13 green ones, its log pinpointing the exact spec/line/test/
axe-rule with no ambiguity; SC-005 (workflow completes within 15 minutes)
and SC-006 (identical results across 3 reruns of the same commit) via a
third throwaway PR (#8): one run plus two `gh run rerun`s of that same
commit all concluded `success` in 1m50s-2m8s each. This milestone adds
no `src/concepts/` behavior -- the Milestone 1-5 regression pass (`npm
run check:all` against unchanged concept-module code) found zero
behavioral difference.

Supersedes 1.11.0 (2026-08-12, Milestone 5's Definition of Done fully
met -- all 23 of 23 tasks in `specs/005-agents-tool-use/tasks.md`
are complete; `npm run check:all` (extensibility, disclosure,
determinism, `check:a11y` 66/66, `check:key-isolation`, `check:real-mode`
17/17, `check:parameter-exploration` 6/6, `check:real-mode-depth`,
`check:agents-tool-use`) and `npm run build`/`tsc`/`eslint` all passed
clean. This is the platform's second concept module -- Agents & Tool
Use, registered with exactly one import and one array entry in
`concept-registry.ts`, the first real proof of `check:extensibility`'s
scan passing against a two-entry registry. All three user stories were
built and independently verified: the Walkthrough view (US1, sample and
custom questions through one disclosed rule-based tool-selection
engine), per-tool enable/disable toggles that visibly change the agent's
path (US2), and a Compare Strategies view showing Direct Answer, Single
Tool Call, and a Multi-Step Reasoning Loop side by side, whose extra
verify step and genuinely reachable "gave-up" outcome make its added
cost legible rather than theoretical (US3). The new a11y spec caught one
real defect on first run -- `StrategyComparison.tsx`'s panel headings
skipped from `<h1>` straight to `<h3>`, an axe heading-order violation --
fixed by promoting them to `<h2>`, matching RAG's own
`VariantsComparison.tsx` precedent. The Milestone 1-4 regression pass
(the full pre-existing `check:all`, 66 total a11y tests including the
pre-existing 59) found zero behavioral difference in the RAG module.

Supersedes 1.10.0 (2026-08-11, Milestone 4's Definition of Done fully
met -- all 35 of 35 tasks in `specs/004-real-mode-depth/tasks.md`
complete; `npm run check:all` (extensibility, disclosure, determinism,
`check:a11y` 59/59, `check:key-isolation`, `check:real-mode` 17/17,
`check:parameter-exploration` 6/6, `check:real-mode-depth`) and `npm run
build`/`tsc`/`eslint` all passed clean. Both user stories were built and
independently verified: the "Compare Simulated vs Real" view (US1), and
the session-wide cost/call ledger with a learner-configurable
$1.00-default warning threshold (US2), whose displayed total is verified
by `scripts/checks/cost-ledger-sum.ts` to exactly match
`costEstimateUsd()`'s own pre-call estimate against a live fixture run
(SC-002's hard gate). That exact-match check caught a genuine,
previously-shipped defect: `CompareSimulatedVsReal.tsx`'s Real half never
issues a final-answer generate call (it compares retrieval rankings
only), so its own pre-call estimate had been silently overcounting by
one generate call per configuration -- fixed as part of that pass. The
Milestone 1-3 regression pass found zero behavioral difference now that
every pre-existing real-call site routes through `createTrackedProvider`.),
1.9.0 (2026-08-10, Milestone 3's Definition of Done fully
met -- all 31 of 31 tasks in `specs/003-parameter-exploration/
tasks.md` complete; `npm run check:all` (extensibility, disclosure,
determinism, `check:a11y` 48/48, `check:key-isolation`, `check:real-mode`
17/17, `check:parameter-exploration`) and `npm run build`/`tsc`/`eslint`
all passed clean. All three user stories were built and independently
verified: the 9-point chunk-size sweep curve (US1, keyboard-operable,
Real-Mode-cost-gated); shareable permalinks that structurally exclude
API keys and custom document text (US2, `permalink-safety.ts`
fixture-verifies this against a runtime-constructed state object, not
just the type system); and three curated failure presets kept honest by
`failure-presets.ts` running them through the live pipeline (US3). The
Milestone 1+2 regression pass surfaced and fixed two real issues: two
Milestone 1 a11y tests broke on locator ambiguity once
`PermalinkButton`'s always-present `aria-live` region was added (test
fix only, no behavior change), and the failure-preset picker's
selected-state styling initially failed WCAG contrast (4.12:1 vs. the
4.5:1 minimum), fixed before that version closed), 1.8.0 (2026-08-08,
Milestone 2's Definition of Done fully
met -- all 59 of 59 tasks in `specs/002-real-mode/tasks.md` complete;
`npm run check:all` -- extensibility, disclosure, determinism,
`check:a11y` 37/37, `check:key-isolation`, `check:real-mode` 17/17 --
and `npm run build`/`tsc`/`eslint` all passed clean; the Milestone 1
regression pass confirmed zero behavioral difference with Real Mode
present but never toggled on; and a real end-to-end run against the live
OpenAI API confirmed every acceptance scenario against the actual
provider), 1.7.0 (2026-08-05, Milestone 1's Definition of Done fully
met -- all 57 of 57 tasks in that feature's `tasks.md` complete after
the root-access gap blocking `check:a11y` closed), 1.6.0 (2026-08-05,
the root-access gap blocking `check:a11y`
closed; all four automated checks passed via `npm run check:all`, and
T036's manual-scenario walkthrough was done, with T044/T051 still
open), 1.5.0 (2026-08-04, `/speckit.implement` ran: FR-013, FR-014,
FR-001, and Phase 6.5's accessibility-closure work built and
type-check/lint clean; `check:extensibility`/`check:disclosure`/
`check:determinism` passed, but `check:a11y` and the manual scenario
walkthroughs (T036/T044) were unverified because the implementing
sandbox had no root access to install Chromium's system libraries), and
1.4.0 (2026-08-04, FR-001's registry id-uniqueness rule and
the `checklists/accessibility.md`-driven FR-005/FR-009/FR-011/FR-014
refinements added as required scope) and 1.3.0 (2026-08-03, FR-013/FR-014
confirmed unimplemented via `/speckit.clarify`, not merely unverified;
SC-007/SC-008 depend on that build gap closing first).
