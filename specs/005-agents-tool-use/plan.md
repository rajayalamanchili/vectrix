# Implementation Plan: Agents & Tool Use Concept Module

**Branch**: `005-agents-tool-use` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-agents-tool-use/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Adds the platform's second concept module -- Agents & Tool Use -- as a
new, self-contained folder under `src/concepts/agents-tool-use/`,
registered with one import + one array entry in
`src/lib/concept-registry.ts` and nothing else. The module ships a
deterministic, disclosed simulation of an agent deciding whether and
which of three non-overlapping tools (Calculator, Unit Converter,
Knowledge Lookup) to call for a learner's question, in two views: a
Walkthrough (User Stories 1-2 -- step-by-step reasoning/tool-
call/observation/final-answer, with per-tool enable/disable toggles) and
a Compare Strategies view (User Story 3 -- the same question run through
three strategies at once: Direct Answer, Single Tool Call, and a
Multi-Step Reasoning Loop capped at a fixed 3 iterations).

This plan resolves three design questions the spec left open, all in
`research.md`: (1) tool selection uses binary rule-based matchers with
fixed-order tie-breaking, not a continuous similarity score like RAG's
embedding projection -- a categorically different problem deserves a
categorically different (and more legibly disclosable) simulation; (2)
the Walkthrough view's engine *is* the `single-tool-call` strategy, not
a separate implementation, so Compare Strategies can never silently
drift from what the Walkthrough demonstrates; (3) the Multi-Step
Reasoning Loop's added cost is real, not padding -- an honest extra
verify step when a tool matches, and a genuinely reachable `"gave-up"`
outcome (via the shipped "no tool fits" sample question) when none does,
which is what makes both FR-006's iteration-cap edge case and User Story
3's "added cost is legible, not hidden" acceptance scenario concretely
true rather than only true in theory. No new npm dependency; `tech-
stack.md` is amended (Phase 1, this plan) with this module's AI-behavior
and testing decisions, mirroring every prior milestone's own amendment.

## Technical Context

**Language/Version**: TypeScript 5, Node.js (Next.js 16 runtime) --
unchanged from Milestones 1-4.

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind
CSS v4 -- per tech-stack.md (locked), unchanged. No new runtime
dependency: tool matching is hand-rolled regex/string logic (no
expression-parser or NLP library), and both views reuse existing UI
primitives (button/toggle/tab styling already established by
`RagConcept.tsx`'s `TABS` pattern) rather than a new component library.

**Storage**: N/A -- still no backend/database. `AgentRun` results are
transient, local component state inside `AgentsToolUseConcept.tsx`'s two
child views -- no state is lifted across views (each view owns its own
question/tool-toggle state independently, mirroring
`VariantsComparison.tsx`'s own established "independent state per view"
precedent from `004-real-mode-depth/research.md`).

**Testing**: Extends the existing check pattern with module-scoped
additions rather than reusing RAG-scoped scripts: two new pure-function
scripts (`scripts/checks/agent-determinism.ts` for SC-003,
`scripts/checks/agent-tool-toggle-effect.ts` for SC-002, both in
`determinism.ts`/`failure-presets.ts`'s no-browser style) plus a new
`tests/agents-tool-use/` Playwright directory (two specs, SC-001 and
SC-007) and one new `tests/a11y/agents-tool-use.spec.ts` (SC-005, folded
into the existing `check:a11y` file-glob automatically). `check:
disclosure` gains new `checkSurface` calls for this module's two views
(SC-004); `check:extensibility` and `check:determinism` need no new rule
(the former already scans generically over the registry, the latter
stays RAG-scoped by design -- see research.md). A new
`check:agents-tool-use` npm script bundles this feature's checks, added
to `check:all`.

**Target Platform**: Same as Milestones 1-4 -- Next.js web app, desktop
browser primary, usable down to 375px.

**Project Type**: Single Next.js project (web), client-only, unchanged.

**Performance Goals**: None beyond feeling responsive -- every
`AgentRun` is one synchronous pass over at most 3 tool matchers and at
most `MAX_ITERATIONS = 3` loop iterations, several orders of magnitude
cheaper than RAG's existing chunk/embed/rank pipeline. No async
work anywhere in this module (Simulated Mode only, per spec.md
Assumptions -- no Real Mode layer this milestone).

**Constraints**: FR-002 (tool-selection determinism -- identical
question + identical enabled-tool set MUST always produce an identical
step sequence, verified by `agent-determinism.ts`); FR-006 (a fixed
iteration cap, `MAX_ITERATIONS = 3`, with reaching it producing a
distinct `"gave-up"` outcome, not a silent truncation); FR-009 (every
simulated reasoning/tool-selection surface carries a visible, rendered
disclosure -- not only a code comment); FR-011 (exactly one registry
entry, zero edits to any file outside this module's own folder other
than that one entry).

**Scale/Scope**: One new concept module folder (~9-10 files: `meta.ts`,
top-level `Component`, `lib/` with types + toolbox + sample questions +
strategy engine, `walkthrough/` with 1-2 components, `compare/` with 1
component); one new line in `concept-registry.ts`; two new pure-function
check scripts; one new Playwright spec directory (2 specs) plus one new
a11y spec; one extension to `simulated-disclosure.ts`; one new
`package.json` script; one amendment to `tech-stack.md`. Single-learner,
single session, no accounts, no persistence -- unchanged from every
prior milestone.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Extensibility Is Structural | PASS | This is the actual proof, not just a restatement: all new code lives inside `src/concepts/agents-tool-use/`; the only edit outside that folder is one import + one array entry in `src/lib/concept-registry.ts` (`contracts/concept-module-contract.md`). `check:extensibility`'s existing, unmodified scan now runs against a two-entry registry for the first time -- SC-006 is verified by that fact alone, not a new rule. |
| II. Never Blur Simulated vs Real | PASS | This module has no Real Mode layer at all this milestone (spec.md Assumptions) -- every surface is simulated, and every simulated reasoning/tool-selection surface carries a visible `data-simulated-disclosure="true"` element (FR-009, `check:disclosure` extension). Tool results are never fabricated: Calculator/Unit Converter compute genuinely, Knowledge Lookup draws from a small fixed fact set disclosed as such, and a no-tool-fit question gets an honestly-hedged best-effort answer, never a confident-looking fake (research.md's toolbox decision). |
| III. Every Interaction Teaches Something | PASS | Tool toggles -> FR-004/SC-002 (an agent's behavior is bounded by what it's actually given, not what it theoretically knows). Sample-question/custom-question input -> FR-001/FR-007 (the core reasoning-tool-observation-answer loop, on any question, not just curated ones). Strategy comparison -> FR-008/SC-007 (trade-offs between approaches become a concrete, inspectable fact -- more steps for the same answer, or a genuine failure mode via the iteration cap -- not a caption to take on faith). |
| IV. Guided, Not Just Dense | PASS | Both views follow the existing `TABS`-plus-`Marginalia`-style guided pattern `RagConcept.tsx` already established -- no new navigation paradigm. Numbered steps are used because the underlying process genuinely is sequential (reasoning -> tool call -> observation -> answer), the same justification RAG's own stepper already relies on. |
| V. Deterministic By Default | PASS | Every `Tool.match` and every `AgentStrategy.run` is a pure function of its explicit arguments only -- no unseeded randomness, no wall-clock/UUID dependency in any simulated output (contrast with the cost ledger's `crypto.randomUUID()` entry ids, which this module has no equivalent of, since it introduces no ledger). `scripts/checks/agent-determinism.ts` verifies this against a live 10-run fixture, not by construction alone. |
| VI. Spec Before Code | PASS | spec.md 005 is drafted (2026-08-11) before this plan; at the time this plan was written no `/speckit.clarify` pass had run yet for this feature -- see Complexity Tracking below for why this plan proceeded without one. **Update (2026-08-11, post-plan)**: a clarify pass subsequently ran and resolved three ambiguities (Walkthrough reveal timing, the iteration cap's scope, and SC-003's gave-up-path coverage) -- see spec.md's own `## Clarifications` section, dated the same day. |
| VII. Accessible and Reduced-Motion by Default | PASS | Every control this module introduces (sample-question chips, custom-question input, per-tool toggles, view-tab switcher) is planned from the start against FR-010's keyboard-operable/distinct-accessible-name bar, verified by a new `tests/a11y/agents-tool-use.spec.ts` (SC-005) -- not a follow-up pass. Reuses the platform's existing global focus-indicator CSS (Milestone 1's Phase 6.5 work) rather than inventing new focus styling. |

**Technology Constraints gate** (tech-stack.md): This plan adds an
"Agents & Tool Use behavior (Milestone 5)" row set to tech-stack.md
(amended alongside this plan, Phase 1 -- version bumped 1.5.0 -> 1.6.0):
rule-based binary-confidence tool matchers with fixed-order
tie-breaking (rather than reusing RAG's cosine-similarity approach), a
three-tool toolbox that computes genuinely rather than fabricates, and
the multi-step-loop's iteration-cap design. No new npm dependency, so
the "no charting library / state library without justification" bar
isn't triggered.

No violations requiring Complexity Tracking beyond the one noted below
(proceeding without a `/speckit.clarify` pass).

## Project Structure

### Documentation (this feature)

```text
specs/005-agents-tool-use/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── data-model.md                        # Phase 1 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/                           # Phase 1 output (/speckit-plan command)
│   ├── concept-module-contract.md
│   ├── tool-engine-contract.md
│   └── automated-checks-contract.md
└── tasks.md                             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Existing structure (unchanged in shape), extended additively:

```text
src/concepts/agents-tool-use/              # (new) this module's own folder -- Principle I boundary
├── meta.ts                                # ConceptModule value: id "agents-tool-use", registered below (contracts/concept-module-contract.md)
├── AgentsToolUseConcept.tsx                # top-level Component: two-tab chrome (Walkthrough / Compare Strategies), mirrors RagConcept.tsx's TABS pattern
├── lib/
│   ├── types.ts                           # Tool, ToolMatch, AgentStep(Kind), AgentRun(Outcome), AgentStrategy(Id) (data-model.md)
│   ├── tools.ts                           # CALCULATOR, UNIT_CONVERTER, KNOWLEDGE_LOOKUP, FACTS, DEFAULT_TOOLBOX (contracts/tool-engine-contract.md)
│   ├── sampleQuestions.ts                 # SAMPLE_QUESTIONS fixture, incl. the "no-fit" question (data-model.md)
│   └── strategies.ts                      # selectTool(), runDirectAnswer/runSingleToolCall/runMultiStepLoop, MAX_ITERATIONS, STRATEGIES (contracts/tool-engine-contract.md)
├── walkthrough/                            # US1 + US2
│   ├── AgentWalkthrough.tsx                # question picker (sample chips + custom input), tool enable/disable toggles, runs runSingleToolCall, renders disclosure + StepSequence
│   └── StepSequence.tsx                    # renders an AgentStep[] list; shared by both views
└── compare/                                # US3
    └── StrategyComparison.tsx              # question picker (reuses SAMPLE_QUESTIONS), always DEFAULT_TOOLBOX, renders 3 strategy panels (StepSequence + name/problem/tradeoff), each with its own disclosure marker

src/lib/concept-registry.ts                 # + import agentsToolUseConcept, + one array entry (edit -- the only edit outside this module's folder, contracts/concept-module-contract.md)

scripts/checks/
├── simulated-disclosure.ts                 # + checkSurface calls for AgentWalkthrough and StrategyComparison's 3 panels (edit, SC-004)
├── agent-determinism.ts                    # (new) SC-003 -- 10 runs of the "division" sample question through runSingleToolCall, asserts byte-for-byte identical AgentRun output
└── agent-tool-toggle-effect.ts             # (new) SC-002 -- runs the "division" question with Calculator enabled vs. disabled, asserts the step sequence differs and Calculator is never called in the second run

tests/a11y/
└── agents-tool-use.spec.ts                 # (new) SC-005 -- sample chips, custom input, tool toggles, tab switcher: keyboard + axe, folded into existing check:a11y file-glob

tests/agents-tool-use/                      # (new)
├── walkthrough.spec.ts                     # SC-001 -- fresh page load through a complete sample-question run, no setup required
└── strategy-comparison.spec.ts             # SC-007 -- the "no-fit" question's three-way divergence (multi-step-loop alone reaches "gave-up")

package.json                                # + check:agents-tool-use script; check:all gains it (edit)

tech-stack.md                               # + "Agents & Tool Use behavior (Milestone 5)" row set; version 1.5.0 -> 1.6.0 (edit, amended alongside this plan -- already applied)
```

**Structure Decision**: No structural change to the existing single
Next.js project. This module lives entirely inside its own new folder,
`src/concepts/agents-tool-use/`, following the exact shape
`concept-types.ts`'s doc comment already prescribes (`meta.ts` + a
top-level `Component`, per-story subfolders for anything beyond that).
The only edit outside that folder for the module itself is
`concept-registry.ts`'s one import + one array entry; all other touched
files (`scripts/checks/`, `tests/`, `package.json`, `tech-stack.md`) are
the same category of cross-cutting infrastructure every prior milestone
has touched without tripping Principle I. `src/app/page.tsx` and
`src/app/concepts/[conceptId]/page.tsx` are untouched -- this module
introduces no new routing/navigation concept (spec.md Assumptions) and
needs no `useSearchParams()`/`<Suspense>` wiring the way Milestone 3's
permalinks did.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Proceeding to `/speckit-plan` without a prior `/speckit.clarify` pass | spec.md 005 (drafted 2026-08-11) reads as fully resolved against this plan's scope -- every ambiguity a `/speckit.clarify` pass would typically surface (toolbox size/honesty, iteration-cap behavior, strategy-comparison's toolbox-state independence) is already answered explicitly in spec.md's own Assumptions and Edge Cases sections, and this plan's `research.md` resolves the remaining *implementation* (not specification) choices, the same category of decision `002-real-mode`'s and `004-real-mode-depth`'s own research.md files resolved without requiring a fresh clarify pass at plan time. | Running `/speckit.clarify` purely as a procedural gate, with no open question to actually ask, would produce zero-content clarifications -- the constitution requires resolving ambiguity, not performing the command. If `/speckit.analyze` (mandatory before `/speckit.implement`, per `AGENTS.md`) surfaces a real gap this plan missed, that is the point at which a clarify pass becomes genuinely load-bearing, not before. |

**Note for `/speckit.analyze`**: per `AGENTS.md`'s workflow rule, run
`/speckit.analyze` before `/speckit.implement` and treat any flagged
constitution violation -- including whether the Complexity Tracking
justification above actually holds -- as blocking, not advisory.

**Update (2026-08-11, post-plan)**: a `/speckit.clarify` pass did
subsequently run against spec.md (see its `## Clarifications` section),
resolving three questions -- none of which this plan's own scope had to
change in response to, since `research.md`'s design decisions already
anticipated all three answers (full-list rendering, a single global
iteration cap, and SC-003 covering the gave-up path). The row above is
retained as a historical record of the state at plan time, not as a
currently-accurate "no clarify pass has run" claim.
