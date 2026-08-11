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
**Status**: Clarified (2026-08-10, five ambiguities resolved -- view
placement, comparison scope, default warning threshold, ledger
persistence, no-key behavior) and planned (`/speckit.plan`, 2026-08-10:
`research.md`, `data-model.md`, `contracts/`, `quickstart.md` generated;
`tech-stack.md` amended to 1.5.0 with the cost-ledger-decorator and
flat-per-call-pricing decisions). Pending `/speckit.tasks` and
`/speckit.implement`. Milestone 3's Definition of Done is met, so this
milestone may proceed.

**Scope**: A side-by-side Simulated-vs-Real comparison view for the same
document and question, with each chunk's rank in both modes directly
inspectable; and a cumulative cost/call ledger that persists across an
entire Real Mode session rather than resetting per action, including a
learner-configurable warning threshold.

**Definition of done**:
- All acceptance scenarios in `specs/004-real-mode-depth/spec.md` pass.
- SC-002 (the cumulative ledger's displayed total is verified, by
  automated check, to match the sum of individual actions' own
  estimates) is a hard gate -- a cost tracker that silently drifts from
  reality is actively worse than no tracker.
- Milestones 1-3's full acceptance-scenario suites still pass
  (regression check).

**Explicitly not included**: live pricing lookups from provider APIs
(static pricing table only); real execution of GraphRAG/Self-RAG/Agentic
RAG (still out of scope, unchanged from Milestone 2).

---

## Milestone 5: Second Concept Module (proves extensibility for real)
**Spec**: not yet written -- do not begin until Milestone 4 DoD is met
**Status**: Not started

**Scope**: Add one genuinely new concept module (candidates: Prompt
Engineering, Fine-Tuning, Agents/Tool Use, Context Window Management --
to be chosen when this milestone is planned) using only the `ConceptModule`
contract and one registry line, with zero edits to the RAG module or any
core file outside the registry.

**Definition of done** (draft, to be formalized in its own `spec.md`):
- SC-002's automated extensibility check (built in Milestone 1) passes
  for the new module without modification.
- The new module independently satisfies Constitution Principles II-V
  (disclosed simulation if any, purposeful interactivity, guided style,
  determinism) -- these aren't RAG-specific, they're platform-wide.
- Milestones 1-4's full acceptance-scenario suites still pass
  (regression check).

---

## Milestone 6: Automated Test Suite + CI
**Spec**: not yet written -- do not begin until Milestone 5 DoD is met
**Status**: Not started

**Scope**: Formalize the manual-Playwright verification used during
Milestones 1-5 into an actual automated test suite (framework choice
deferred, see tech-stack.md), wired into CI so every Success Criterion
across all prior milestones regresses loudly instead of silently.

**Definition of done** (draft):
- Every Success Criterion across Milestones 1-5 has a corresponding
  automated test, not a manual verification note.
- CI blocks merge on any regression.

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
- Deployment target selection -- deferred until there's a reason to
  deploy.

Keeping this section explicit documents what was considered and
deliberately deferred, rather than leaving it ambiguous whether it was
forgotten.

**Version**: 1.9.0 -- 2026-08-10, **Milestone 3's Definition of Done is
fully met -- all 31 of 31 tasks in `specs/003-parameter-exploration/
tasks.md` are complete.** `npm run check:all` (extensibility, disclosure,
determinism, `check:a11y` 48/48, `check:key-isolation`, `check:real-mode`
17/17, `check:parameter-exploration`) and `npm run build`/`tsc`/`eslint`
all pass clean. All three user stories are built and independently
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
4.5:1 minimum), fixed before this version closed.

Supersedes 1.8.0 (2026-08-08, Milestone 2's Definition of Done fully
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
