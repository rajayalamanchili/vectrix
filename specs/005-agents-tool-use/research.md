# Research: Agents & Tool Use Concept Module

**Feature**: `005-agents-tool-use` | **Date**: 2026-08-11

This is the platform's second concept module (roadmap.md Milestone 5),
so the first open question isn't "what does an agent do" but "does the
`ConceptModule` contract, proven only by RAG so far, actually hold for a
structurally different concept without touching RAG's own files." Every
decision below is made with that proof obligation in mind, alongside the
module's own teaching goals from spec.md.

## Decision: Rule-based, binary-confidence tool matching (not a similarity score)

**Decision**: Each `Tool` owns a pure function, `match(question: string):
ToolMatch | null`, that either recognizes the question as belonging to
its domain (arithmetic expression, unit-conversion phrase, known-fact
substring) and returns a `ToolMatch` carrying a genuinely computed
result, or returns `null`. There is no partial-credit score -- a tool
either matches (confidence effectively 1) or doesn't (no entry at all).
Selection picks the first enabled, matching tool in the toolbox's fixed
declaration order; ties (two tools both matching) resolve to whichever
is declared first, deterministically, every time.

**Rationale**: RAG's `mockEmbedding.ts` uses a continuous cosine-similarity
score because retrieval is genuinely a nearest-neighbor problem over a
shared vector space -- that's the concept being taught. Tool selection is
a categorically different problem: "does this question need a
calculator, a unit converter, a fact lookup, or nothing?" is a
classification into non-overlapping domains (FR-003's own requirement),
not a point-cloud distance. A binary rule-based matcher is *more*
honest about what it's simulating (a simplified stand-in for a real
model's structured tool-selection reasoning, which is itself closer to
"parse the request, pick the applicable tool" than to embedding
similarity) and is trivially disclosable in plain language ("this
matched the Calculator because the question contains a two-number
arithmetic expression") -- see FR-002 and FR-009's disclosure
requirement, and Constitution Principle II. It's also what makes
Edge Cases' "two tools both a reasonable fit" case resolvable with a
simple, auditable rule (fixed declaration order) rather than needing a
tie-breaking heuristic on top of a continuous score.

**Alternatives considered**: Reusing `mockEmbedding.ts`'s bag-of-words
cosine-similarity approach (embed the question and each tool's
description, pick the nearest) was considered for consistency with
RAG's own precedent -- rejected because it would produce a *plausible-
looking but ungrounded* confidence number for a problem that isn't
actually a similarity search, and because non-overlapping tool domains
(FR-003) are far more legibly modeled as "which pattern matched," not
"which vector is closest." A weighted multi-signal scorer (keyword
overlap + regex bonus) was also considered and rejected as
unnecessary complexity: with only 3 non-overlapping tool domains, a
binary per-tool test is sufficient to be deterministic, legible, and
correct, and the constitution's Principle III bar ("every interaction
teaches something") doesn't ask for a fuzzier signal than the concept
requires.

## Decision: Three strategies, one of which *is* the main walkthrough

**Decision**: The module ships exactly three `AgentStrategy` values --
`direct-answer`, `single-tool-call`, and `multi-step-loop` -- and User
Story 1's Pipeline-Walkthrough-equivalent view runs `single-tool-call`
under the hood (reasoning -> at most one tool call -> observation ->
final answer). It is not a fourth, separate "the agent" implementation;
Compare Strategies (US3) simply renders the same `single-tool-call.run()`
alongside the other two for the same question.

**Rationale**: spec.md's User Story 1 acceptance scenarios describe
exactly this shape -- one reasoning step, one tool decision, one result,
one grounded final answer, with "no tool needed" as a first-class
alternative outcome, never a loop. Making that the literal
`single-tool-call` strategy (rather than a bespoke fourth code path)
means Compare Strategies has zero risk of silently drifting from what
the walkthrough actually demonstrates -- the same function runs in both
places, satisfying Constitution Principle V (determinism) by
construction rather than by two independently-maintained
implementations happening to agree.

**Alternatives considered**: A single unified "the agent" engine with a
`maxToolCalls` parameter (1 for the walkthrough, N for comparison) was
considered -- rejected as needless indirection: the walkthrough's
single-tool-call behavior and the multi-step loop's behavior differ in
more than a call-count parameter (the loop's verify step and cap/give-up
handling below have no equivalent in the single-call path), so
collapsing them into one parameterized function would trade a small
amount of duplication for a harder-to-read implementation.

## Decision: The multi-step loop's added cost is real overhead, and its cap is genuinely reachable

**Decision**: `multi-step-loop` never fabricates extra steps for their
own sake, but it does structurally cost more than `single-tool-call` in
two honest ways:

1. **When a tool matches**: after the tool-call/observation, it takes
   one additional "verify" reasoning step (confirming the observation
   actually answers the question) before the final answer -- genuine
   overhead a more careful agent would actually do, not padding.
2. **When no enabled tool matches**: rather than falling back to a
   direct answer on the first try (as `direct-answer` and
   `single-tool-call` both do), it re-examines the question and retries
   up to `MAX_ITERATIONS` (3) times, looking for a tool match on each
   attempt. If it still finds nothing by the last attempt, the run ends
   with a distinct `"gave-up"` outcome (FR-006's Edge Case) instead of
   ever producing a direct answer for that path.

**Rationale**: This directly satisfies User Story 3's Acceptance
Scenario 2 without fabricating anything: for a question one tool
answers cleanly, the loop reaches the *same* answer via more steps
(case 1) -- a real, inspectable cost. For the shipped no-tool-fits
sample question specifically, comparing all three strategies shows a
genuine three-way divergence: `direct-answer` answers immediately (low
confidence, disclosed), `single-tool-call` falls back to a direct answer
after one explicit "no tool needed" reasoning step, and
`multi-step-loop` alone reaches the `"gave-up"` outcome -- a strictly
worse, not merely slower, result. This is the strongest, most honest way
to make "persistence has a real failure mode, not just a time cost"
legible (spec.md's Edge Case for the iteration cap), and it makes the
cap genuinely reachable by a real code path rather than only a synthetic
test fixture nothing in the shipped UI can ever hit.

**Alternatives considered**: Capping `multi-step-loop` at 1 tool call
like `single-tool-call` (differing only in the verify step) was
considered -- rejected because it leaves FR-006's "reaching the cap
shows a distinct gave-up outcome" edge case unreachable from any real
shipped sample question, which would make it effectively unverifiable
except by an artificial unit-test-only construction. Making the loop
retry the *same* already-failed tool on each attempt (instead of moving
on) was also considered and rejected: since matching is deterministic,
retrying an already-tried tool would always fail identically, which
reads as broken rather than as "trying harder" -- the shipped toolbox
only has 3 tools, so with 3 non-overlapping domains and a cap of 3,
"attempt N re-examines the question" is honestly framed as re-reasoning
about fit, not re-running an identical failed action.

## Decision: Toolbox -- Calculator, Unit Converter, Knowledge Lookup

**Decision**: Three non-overlapping tools (FR-003's minimum), each
computing a genuinely correct result rather than a canned string:
- **Calculator** -- matches a two-operand arithmetic expression
  (`+ - × ÷`) via regex, evaluates it directly (no `eval`, a small
  hand-rolled operand/operator extraction).
- **Unit Converter** -- matches a `<number> <unit> to <unit>` phrase
  against a small fixed unit table (km/mi, kg/lb, °C/°F) via regex,
  computes the real conversion.
- **Knowledge Lookup** -- matches a question containing one of a small,
  fixed set of known fact-phrases (e.g. "capital of france"), returning
  that fixed, shipped fact.

**Rationale**: Directly implements spec.md's Assumptions ("tools that
can be computed honestly... return genuinely correct results; a
knowledge lookup draws from a small, fixed, shipped fact set"). Three
tools is FR-003's stated minimum and is sufficient to demonstrate every
acceptance scenario (a clean single-tool match, a no-tool-fits case, and
a disable/re-enable path) without the toolbox itself becoming the
module's main complexity.

**Alternatives considered**: A fourth or fifth tool (e.g. a date/time
tool, a text-transform tool) was considered to make the "two tools both
a reasonable fit" edge case easier to construct -- rejected as
unnecessary for now: the calculator and unit-converter domains already
overlap syntactically for a crafted input like "convert 10 + 5 km to
miles," which is enough to exercise the fixed-order tie-break rule
without adding a fourth tool's own maintenance surface.

## Decision: Disclosure marker granularity mirrors RAG's per-surface convention

**Decision**: `data-simulated-disclosure="true"` is rendered once per
*rendered surface* -- once for the Walkthrough view's step sequence, and
once per strategy panel (three total) in Compare Strategies -- not once
per individual `AgentStep`. `scripts/checks/simulated-disclosure.ts`
gains new `checkSurface(...)` calls for these, reusing its existing
helper rather than a new script.

**Rationale**: Matches the established granularity `check:disclosure`
already uses for `EmbeddingStep`/`GenerationStep` (one marker per
component render, not one per data point or chunk) -- FR-009's "every
simulated reasoning or tool-selection step" and SC-004's "100% of
surfaces" are satisfied by every step within a disclosed surface
inheriting that surface's visible disclosure, the same way RAG's
existing disclosure isn't repeated per retrieved chunk. Extending the
existing script in place (rather than a new one) follows the precedent
`tech-stack.md` already documents for this exact script growing a new
rule per milestone (FR-004's Real Mode rule, 004's comparison-caveat
rule).

## Decision: New, module-scoped determinism and tool-toggle-effect checks

**Decision**: SC-003 (10-run determinism) and SC-002 (disabling a tool
changes the step sequence) are each a new, small pure-function script --
`scripts/checks/agent-determinism.ts` and
`scripts/checks/agent-tool-toggle-effect.ts` -- not an extension of
RAG's existing `determinism.ts`.

**Rationale**: `determinism.ts` imports directly from
`src/concepts/rag/lib/...` and its own header comment already scopes it
to "Simulated-Mode-only" RAG concerns (`002-real-mode/research.md`'s own
note). Extending it to cover an unrelated module's unrelated pipeline
would blur what it verifies and couple two concept modules' checks
together -- the opposite of Constitution Principle I. A new script per
concern is exactly the pattern this project already uses for every
other milestone-specific hard gate (`failure-presets.ts`,
`cost-ledger-sum.ts`, `permalink-safety.ts`) -- small, purpose-built,
independently runnable, per `tech-stack.md`'s stated testing philosophy.

**Alternatives considered**: A single combined
`scripts/checks/agents-tool-use.ts` running both SC-002 and SC-003's
logic in one file was considered -- rejected in favor of two files for
the same reason `cost-ledger-sum.ts` and `failure-presets.ts` are
separate scripts despite both being Milestone-3/4 pure-function checks:
each verifies one independent claim, and a failure in one shouldn't
require reading past unrelated assertions to find it.

## Decision: Module folder structure mirrors the RAG module's established shape

**Decision**: `src/concepts/agents-tool-use/` follows the same shape
`concept-types.ts`'s own doc comment already prescribes: `meta.ts` +
Component + subfolders (`lib/` for pure logic, `walkthrough/` for US1+US2,
`compare/` for US3) -- see Project Structure in plan.md.

**Rationale**: This is the first real exercise of that doc comment's
promise ("creating one object like this and registering it... nothing
else needs to change") and of `check:extensibility`'s scan, which is
generic over any concept folder already. Deviating from RAG's shape
would still pass the mechanical registry/conditional check, but would
undercut the actual proof this milestone exists to deliver -- that the
*pattern*, not just the interface, generalizes.
