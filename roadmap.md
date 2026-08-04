# Roadmap

**Project**: Vectrix
**Governing rule**: per the constitution's Development Workflow section,
a milestone does not begin until the previous milestone's `spec.md`
Success Criteria are met.

---

## Milestone 1: Core Platform + RAG Concept Module
**Spec**: `specs/001-core-platform-rag-module/spec.md`
**Status**: Prototype built and manually verified; formal spec authored
after the fact (see "A note on sequencing" below). `/speckit.plan` and
`/speckit.tasks` have run and produced `plan.md`/`tasks.md` (57 tasks,
30 done / 27 open); `/speckit.analyze` has run against them. As of the
2026-08-03 `/speckit.clarify` pass, FR-013 (similarity-threshold
control) and FR-014 (chunking-strategy toggle) are confirmed still
**unimplemented** in the shipped prototype -- not merely unverified --
and are required Milestone-1 work, not deferred scope. Two further
2026-08-04 passes added scope beyond the original spec: a
`/speckit.clarify` pass added FR-001's `ConceptModule.id` uniqueness
rule, and a `/speckit-checklist` (`checklists/accessibility.md`) pass
rewrote FR-011 and added smaller clauses to FR-005/FR-009/FR-014,
producing `tasks.md`'s Phase 6.5 (five new tasks, T053-T057) -- see
Definition of Done below for the full current gap, not just the
original FR-013/FR-014 one.

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
  toggle) MUST actually be built -- confirmed via `/speckit.clarify` on
  2026-08-03 that these are not yet implemented at all in the shipped
  prototype (only fixed-size chunking and a Top-K slider exist today),
  and that they remain required Milestone-1 scope rather than being
  silently deferred. This is a build gap, not just a verification gap,
  and it's a prerequisite for SC-007/SC-008 below.
- SC-001, SC-004, and SC-006 verified manually (done for SC-001/SC-004 via
  Playwright screenshots during the build; SC-006 -- determinism across
  repeated runs -- not yet explicitly re-verified across ten runs).
  SC-007 and SC-008 (threshold-empties-results and chunking-strategy
  produces different boundaries) are new as of the parameter-impact
  review and cannot be verified at all until the FR-013/FR-014 build gap
  above is closed.
- SC-002, SC-003, SC-005 each need an actual automated check written --
  today they hold true by inspection/design, not by a test that would
  catch a future regression. This, together with the FR-013/FR-014 build
  gap above, is the concrete work to close before calling Milestone 1
  truly done, and it's the first thing `/speckit.tasks` should generate
  tasks for.
- User Story 4's contract (the `ConceptModule` interface + registry
  pattern) exists and type-checks; its full acceptance scenario is only
  verifiable once a second module exists (Milestone 5).
- FR-001's `ConceptModule.id` uniqueness rule (added via `/speckit.clarify`
  2026-08-04) MUST be enforced by the same automated check as SC-002,
  not left to array-authorship discipline alone -- this is `tasks.md`
  T048's expanded scope, not a separate script.
- FR-005 (chart highlighting), FR-009 (Compare Variants keyboard/FIFO
  scope), FR-011 (keyboard operability -- rewritten), and FR-014
  (chunking-strategy toggle selected-state) were all refined or expanded
  by the `checklists/accessibility.md` pass (2026-08-04). The concrete,
  previously-nonexistent behavior this requires -- a global
  focus-indicator style, a non-color chart marker, focus management
  after a stepper jump and after the document/strategy-switch reset, and
  an empty-state landmark -- is `tasks.md` Phase 6.5 (T053-T057) and is
  required Milestone-1 work, not deferred scope, same as the FR-013/FR-014
  gap above.

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
**Status**: Spec drafted, pending `/speckit.clarify` and `/speckit.plan` --
do not begin until Milestone 1's Definition of Done gaps (the
SC-002/003/005 automated checks) are closed.

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
**Status**: Spec drafted, pending `/speckit.clarify` and `/speckit.plan` --
do not begin until Milestone 2's Definition of Done is met.

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
**Status**: Spec drafted, pending `/speckit.clarify` and `/speckit.plan` --
do not begin until Milestone 3's Definition of Done is met.

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

**Version**: 1.4.0 -- 2026-08-04, Milestone 1's Definition of Done
expanded: FR-001's registry id-uniqueness rule (`/speckit.clarify`) and
the `checklists/accessibility.md`-driven FR-005/FR-009/FR-011/FR-014
refinements (`/speckit-checklist`) added as required scope, alongside
the FR-013/FR-014 gap already tracked since v1.3.0; `tasks.md`'s Phase
6.5 (T053-T057) is the concrete work this adds. Supersedes 1.3.0
(2026-08-03, FR-013/FR-014 confirmed unimplemented via `/speckit.clarify`,
not merely unverified; SC-007/SC-008 depend on that build gap closing
first).
