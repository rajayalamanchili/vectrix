# Feature Specification: Agents & Tool Use Concept Module

**Feature Branch**: `005-agents-tool-use`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Agents / Tool Use concept module for Vectrix"

## Clarifications

### Session 2026-08-11

- Q: When a learner runs the agent on a question, does the Walkthrough view reveal the resulting steps one at a time via explicit next/prev navigation controls, or render the whole computed step sequence at once as a single list? → A: Full list at once -- the whole computed step sequence (reasoning, tool-call, observation, final-answer) renders together immediately after a run finishes; there is no click-through stepper or per-step reveal control. "Current step position" (see Edge Cases) refers to which question's run is currently displayed, not a per-step navigation index.
- Q: Does the fixed iteration cap in FR-006 apply as a single project-wide limit, or could different agent strategies have their own independent caps? → A: Single global cap -- one fixed constant applies project-wide. Only a strategy capable of looping can ever approach it; a strategy that never loops satisfies the cap trivially, by construction, not via a separate limit of its own.
- Q: Does the determinism guarantee behind SC-003 also have to be verified by an automated check for runs that end in the multi-step loop's "gave up" outcome, or is checking the single-tool-call/final-answer path sufficient? → A: Yes, verify it too -- SC-003's "identical every time" claim is general, with no carve-out for outcome type; the multi-step loop's retry logic is the more complex path and needs its own dedicated determinism check, not just the single-tool-call path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch an agent decide whether and which tool to call (Priority: P1)

A learner wants to see, step by step, how an agent answers a question it
can't just recite from memory: does it recognize it needs help, which of
its available tools it picks, what that tool returns, and how that
result leads to a final answer.

**Why this priority**: This is the core teaching moment of the whole
module -- without it, "agents" is a label with nothing behind it. Every
other story in this module builds on this walkthrough existing first.

**Independent Test**: Pick a shipped sample question, step through the
agent's reasoning, tool call, observation, and final answer, and confirm
each step is legible on its own (not just the end result) and the
tool-selection step is disclosed as a simplified simulation, not a real
model's output.

**Acceptance Scenarios**:

1. **Given** a learner picks a sample question that clearly matches one
   tool's capability, **When** they step through the agent's process,
   **Then** they see an initial reasoning step, the specific tool chosen
   and why, that tool's returned result, and a final answer grounded in
   that result.
2. **Given** a learner picks a question no available tool is a good fit
   for, **When** the agent runs, **Then** it answers directly without
   forcing a poor-fit tool call, and this "no tool needed" reasoning is
   shown as plainly as a tool-call step would be.
3. **Given** the same question and the same available tools, **When** a
   learner runs the agent twice, **Then** both runs produce the identical
   sequence of steps.
4. **Given** a learner types their own custom question, **When** they run
   the agent, **Then** it produces some step sequence and a final answer
   -- never a blank or broken state, even if no tool fits well.

---

### User Story 2 - Remove a tool and see the agent's path change (Priority: P2)

A learner wants to understand that an agent's behavior is bounded by
what tools it actually has available -- not by what it theoretically
knows how to use -- by disabling a tool the agent would otherwise pick
and re-running the same question.

**Why this priority**: This is the single clearest way to demonstrate
that "agent" doesn't mean "omniscient" -- it means "reasons within the
capabilities it's actually been given." It depends on User Story 1's
walkthrough existing, but adds a genuinely new, independently testable
insight on top of it.

**Independent Test**: Run a sample question that uses a specific tool,
disable that tool, re-run the identical question, and confirm the
step sequence visibly differs (a different tool is chosen, or the agent
falls back to answering directly) rather than silently reusing the
previous run's path.

**Acceptance Scenarios**:

1. **Given** a question the agent answers using Tool A, **When** the
   learner disables Tool A and re-runs the same question, **Then** the
   agent either picks a different available tool or falls back to a
   direct answer, and the step sequence reflects this change.
2. **Given** a learner disables every available tool, **When** they run
   any question, **Then** the agent always falls back to a direct answer
   -- never an error state -- and this "no tools available" condition is
   shown plainly.
3. **Given** a learner re-enables a previously disabled tool, **When**
   they re-run the same question, **Then** the agent's path returns to
   using that tool again, matching its very first run.

---

### User Story 3 - Compare agent strategies side by side (Priority: P3)

A practitioner wants to see, for the same question, how a plain
direct-answer approach, a single tool call, and a multi-step
reasoning loop each behave differently -- so they can judge which
approach fits a given problem's complexity.

**Why this priority**: This turns the single walkthrough (User Story 1)
into a comparison of trade-offs, the same role Compare Variants plays for
the existing RAG module -- valuable, but meaningfully secondary to the
walkthrough existing at all.

**Independent Test**: Pick one question, view all shipped strategies at
once, and confirm at least one concrete difference between any two of
them (e.g. number of steps taken, whether a tool was used at all) is
visible without needing to run anything else.

**Acceptance Scenarios**:

1. **Given** a learner opens the comparison view with a question
   selected, **When** the view renders, **Then** every shipped strategy
   is shown with its own step flow and a plain-language explanation of
   the problem it addresses and its trade-off.
2. **Given** a question that a single tool call can answer completely,
   **When** comparing strategies, **Then** the multi-step reasoning loop
   strategy is visibly not "better" -- it either reaches the same answer
   in more steps or the comparison otherwise makes its added cost legible,
   not hidden.

---

### Edge Cases

- What happens when a learner's custom question matches no tool well and
  has no obvious direct answer either? The agent still produces a
  best-effort direct answer -- "no good match" is a real, reachable state
  here, the same way it already is for RAG's similarity-threshold filter,
  not something papered over with a fabricated tool result.
- What happens if the agent's reasoning loop would need more steps than
  its fixed iteration cap allows? The run stops and shows a distinct
  "gave up before reaching a final answer" outcome, not a silent
  truncation that looks like a normal completion -- and, per SC-003's
  determinism guarantee, retrying the identical (question, enabled
  tools) combination gives up again, the same way, every time
  (Clarifications, 2026-08-11).
- What happens when a learner switches to a different sample question
  mid-walkthrough? The previously displayed run (its full step list and
  any results) is cleared immediately -- the Walkthrough always renders
  one run's complete step list at a time, not a click-through stepper
  (Clarifications, 2026-08-11) -- the same invalidation rule the RAG
  module already applies when its active document changes.
- What happens when two tools are both a reasonable fit for the same
  question? The deterministic selection rule still picks exactly one,
  consistently, every time that question runs (User Story 1, Acceptance
  Scenario 3) -- there is no "randomly pick one" branch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let a learner submit a question and reveal
  the agent's process as a sequence of distinct, legible steps: an
  initial reasoning step, a tool-selection decision (or a decision to
  answer directly), the chosen tool's result if one was called, and a
  final answer.
- **FR-002**: The system MUST make the agent's tool-selection decision
  deterministic and MUST visibly disclose it as a simplified simulation
  of a real model's reasoning, not real model output -- the same
  question against the same available tools MUST always produce an
  identical step sequence.
- **FR-003**: The system MUST provide a fixed toolbox of at least 3
  distinct tools, each with non-overlapping capabilities and its own
  plain-language description of what it does.
- **FR-004**: The system MUST let a learner enable or disable individual
  tools before running the agent, and re-running the same question after
  a change MUST reflect that change in the resulting step sequence.
- **FR-005**: When no available tool is a good enough match for a
  question, the system MUST have the agent answer directly rather than
  force a poor-fit tool call, and MUST disclose this "no tool needed"
  reasoning as plainly as a tool-call step.
- **FR-006**: The system MUST enforce a single, fixed, project-wide
  maximum (not a per-strategy limit) on the number of reasoning/tool-call
  iterations a single agent run may take; reaching that cap without a
  final answer MUST show a distinct "gave up" outcome rather than
  silently stopping. Only a strategy capable of looping can ever
  approach this cap -- a strategy that never loops satisfies it
  trivially, by construction (Clarifications, 2026-08-11).
- **FR-007**: The system MUST provide at least 3 shipped sample
  questions spanning different tools (including at least one question no
  tool fits well) and MUST let a learner type their own custom question.
- **FR-008**: The system MUST provide a comparison view showing at least
  3 distinct agent strategies for the same question at once, each with
  its own step flow and a plain-language explanation of the problem it
  addresses and its trade-off.
- **FR-009**: Every simulated reasoning or tool-selection step MUST
  carry a visible disclosure that it is a simplified simulation, not a
  real model's output (Constitution Principle II) -- this disclosure
  must be present in the rendered experience, not only in source code.
- **FR-010**: Every interactive control this module introduces (tool
  toggles, sample-question selection, the custom-question input, and the
  Walkthrough/Compare Strategies view switcher) MUST be operable via
  keyboard alone and carry an accessible name distinct from any other
  control on the same view. (Per Clarifications, 2026-08-11: the
  Walkthrough's step list renders in full at once, not behind a
  dedicated step-navigation control, so no separate step-navigation
  control exists to name here.)
- **FR-011**: The module MUST be addable to the platform by implementing
  the existing concept-module contract and adding exactly one entry to
  the existing central registry, with no edit required to any file
  outside this module's own folder other than that one registry entry.

### Key Entities *(include if feature involves data)*

- **Tool**: one capability the agent can invoke -- an id, a
  learner-facing name, a plain-language description of what it does, and
  whatever it needs internally to deterministically decide whether a
  given question is a good match for it.
- **AgentStep**: one entry in a run's visible sequence -- its kind
  (reasoning, tool call, observation, or final answer), the tool
  involved if any, and the content shown for that step.
- **AgentRun**: the ordered list of `AgentStep`s produced for one
  (question, set of enabled tools) combination, plus whether it ended in
  a final answer or hit the iteration cap.
- **AgentStrategy**: one named approach shown in the comparison view --
  an id, a name, the problem it addresses, how it works, its trade-off,
  and the step flow it produces for the comparison view's question.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can run a shipped sample question
  through a complete agent loop, from question to final answer, with no
  setup or configuration required beforehand.
- **SC-002**: For at least one shipped sample question, disabling the
  tool the agent would otherwise use changes the visible step sequence
  in an observable way (a different tool is chosen, or the agent falls
  back to a direct answer), verified by an automated check.
- **SC-003**: Across 10 repeated runs of the same question against the
  same enabled tools, the produced step sequence is identical every
  time -- including when a run ends in the multi-step loop's "gave up"
  outcome, not only runs that reach a final answer (Clarifications,
  2026-08-11) -- verified by an automated check covering both the
  single-tool-call and multi-step-loop strategies.
- **SC-004**: 100% of the module's simulated reasoning/tool-selection
  surfaces carry a visible simulation disclosure, verified by an
  automated check that fails if any is missing.
- **SC-005**: Every interactive control this module introduces is
  reachable and operable using the keyboard alone, verified by an
  automated check.
- **SC-006**: The module is addable to the app's registry without
  modifying any other concept module's own files, verified by the
  existing cross-module extensibility check passing against this
  module unmodified.
- **SC-007**: A learner viewing the strategy-comparison view can identify
  at least one concrete difference (step count, whether a tool was used,
  or which tool) between any two shown strategies for the same question
  without leaving that view.

## Assumptions

- This milestone ships Simulated Mode only -- no real LLM or real tool
  API is called to decide tool selection or generate the final answer,
  mirroring the RAG module's own Milestone 1 scope (a "Real Mode" layer,
  if ever built for this module, would be a later, separately-planned
  milestone, the same relationship Milestone 2 has to Milestone 1).
- The toolbox is fixed and curated by the module, not learner-authorable
  -- a learner can enable/disable which shipped tools are available
  (User Story 2), not define new ones, mirroring the RAG module's own
  fixed sample-document set.
- Tools that can be computed honestly without fabrication (e.g. a
  calculator evaluating an arithmetic expression, a unit converter doing
  the actual conversion math) return genuinely correct results; a tool
  representing a knowledge lookup draws from a small, fixed, shipped
  fact set, the same "curated, not live" precedent the RAG module's
  sample documents already establish.
- The strategy-comparison view (User Story 3) runs against a fixed
  default toolbox (all shipped tools enabled) rather than inheriting
  whatever tool-toggle state User Story 2 last left -- it exists to
  compare strategies on equal footing, not to reflect an in-progress
  experiment.
- This module reuses the platform's existing home-page discovery,
  routing, and concept-module registration pattern as-is; it introduces
  no new top-level navigation or routing concept.
