# Feature Specification: Real Mode Depth -- Simulated-vs-Real Comparison & Cumulative Cost Tracking

**Feature Branch**: `004-real-mode-depth`

**Created**: 2026-08-03

**Status**: Draft -- clarified 2026-08-10, pending `/speckit.plan`

**Input**: User description: "Side-by-side Simulated vs Real Mode
comparison and cumulative cost/latency tracking across a Real Mode
session"

## Clarifications

### Session 2026-08-10

- Q: Where should the new "Compare Simulated vs Real" view live in the existing UI structure — a new third top-level view, or a toggle integrated into the existing Pipeline Walkthrough's Retrieval step? → A: New third top-level view, sitting alongside Pipeline Walkthrough and Compare Variants.
- Q: Should the Compare Simulated vs Real view cover only baseline (naive) RAG retrieval, or also let a learner compare Simulated vs Real for the HyDE/RAG-Fusion variants Milestone 2 already executes for real? → A: Baseline + variants — a learner can select naive RAG, HyDE, or RAG-Fusion within the comparison view.
- Q: What should the default cumulative-cost warning threshold be for a learner who never configures one themselves? → A: $1.00.
- Q: Should the cumulative cost ledger survive a page refresh within the same browser tab, or is it allowed to reset on refresh like the API key already does? → A: In-memory only, resets on refresh — matches the existing API key storage pattern (tech-stack.md, Milestone 2); "persists across an entire Real Mode session" means across step/view navigation, not across a page refresh.
- Q: If a learner opens the Compare Simulated vs Real view before ever configuring Real Mode (no API key entered yet), what should happen? → A: The Simulated half renders immediately; the Real half shows the same inline API key entry prompt Real Mode already uses elsewhere, in place of the Real chart, rather than blocking the whole view.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See exactly where the simulation and reality diverge (Priority: P1)

A learner who has used both Simulated and Real Mode wants to see
them run side by side for the same document and question, so the gap
between the teaching simulation and real embedding geometry is concrete
and inspectable, not just described in a disclosure caption.

**Why this priority**: This directly closes the most-cited fidelity
concern from the earlier competitive gap analysis, and is a genuinely
novel capability -- none of the comparable tools surveyed (RAGxplorer,
RAG Playground, Google's rag-playground) offer a direct, same-screen
simulated-vs-real comparison.

**Independent Test**: With Real Mode configured and a document/question
selected, activate "Compare Simulated vs Real," and confirm both charts
render for the same input with each chunk's rank in both modes readable
without additional clicks.

**Acceptance Scenarios**:

1. **Given** a learner has a document and question set, **When** they
   activate Compare Simulated vs Real, **Then** both the Simulated Mode
   chart and the Real Mode chart render for the same document and
   question, each still carrying its own mode-disclosure label from
   spec.md 001 (Simulated) and spec.md 002 (Real).
2. **Given** both charts are shown, **When** the learner looks at any
   single chunk, **Then** its rank/position in both modes is readable
   side by side (e.g. "chunk #2: ranked 1st in Real, ranked 3rd in
   Simulated") -- divergence is a concrete, inspectable fact, not a
   visual impression the learner has to eyeball across two separate
   charts.
3. **Given** the Real half of the comparison requires a real API call,
   **When** the learner activates the comparison, **Then** the same
   cost/call disclosure pattern as spec.md 002 FR-010 applies before that
   call is made.
4. **Given** Simulated and Real Mode happen to agree closely for a given
   document/question, **When** the comparison renders, **Then** that
   agreement is shown honestly as a valid outcome -- the feature must not
   imply divergence is the expected or typical result.

---

### User Story 2 - Track real cost across a whole session, not per call (Priority: P2)

A learner running several real queries, and possibly several
variant executions, wants to see a running total of calls and estimated
cost across their whole Real Mode session, not just a per-action
estimate that resets the moment they move to the next step.

**Why this priority**: Builds real cost intuition over a realistic usage
pattern (many queries, possibly several variant runs), which a
per-action estimate alone cannot convey -- but it is scoped below User
Story 1 because it's a refinement of an already-useful Real Mode, not a
capability gap on its own.

**Independent Test**: In a Real Mode session, make at least three real
calls across different steps, and confirm a running total (call count
and estimated cost) is visible from any step and reflects the sum of the
individual actions taken.

**Acceptance Scenarios**:

1. **Given** a learner is in a Real Mode session, **When** they make
   multiple real calls across different steps or variant runs, **Then**
   a running total of call count and estimated cost is visible from any
   step and persists across step navigation within the session.
2. **Given** a learner changes the active document or resets pipeline
   state, **When** they do so, **Then** the app asks whether to reset the
   cumulative total or keep accumulating, rather than silently doing
   either.
3. **Given** a learner has configured a warning threshold for cumulative
   estimated cost, **When** the running total crosses that threshold,
   **Then** a visible warning is shown before the next real call is
   made, not only after the fact.
4. **Given** a displayed cost figure, **When** the learner views it,
   **Then** it is labeled as an estimate with its pricing-assumption
   basis named (e.g. "estimated at $X per 1K tokens for [provider]"),
   never presented as an exact bill.

---

### Edge Cases

- What happens if a learner runs the Simulated-vs-Real comparison
  repeatedly for the same document/question? (Real Mode's half should
  re-run for real each time -- consistent with Real Mode not being
  claimed as deterministic per spec.md 002 -- while Simulated Mode's half
  remains identical every time per Constitution Principle V; the
  comparison view should make this asymmetry visible, not confusing.)
- What happens if a learner switches the retrieval configuration
  (naive RAG, HyDE, or RAG-Fusion) while the Real half is still running
  for the previously selected configuration? (The configuration selector
  is disabled for the duration of an in-flight Real half, re-enabling
  once it settles to done or error, rather than allowing a switch that
  would orphan the in-flight call's result -- the call itself still
  completes and is still recorded on the cumulative cost ledger either
  way, since ledger accounting does not depend on which configuration is
  currently displayed.)
- What happens to the cumulative cost total if a real call fails partway
  (e.g. a rate limit error)? (A failed call that made no billable request
  should not be added to the total; a failed call that did consume quota
  before failing should be -- this must be handled per-provider's actual
  behavior, not assumed uniformly.)
- What happens if the learner never configures a warning threshold?
  (A default threshold of $1.00 applies rather than the warning feature
  being silently unavailable until manually configured.)
- What happens when a learner switches away from Real Mode entirely mid-
  session? (The cumulative total should persist, ready to resume, rather
  than being lost the moment Real Mode is toggled off.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a new top-level "Compare Simulated
  vs Real" view, a sibling to the existing Pipeline Walkthrough and
  Compare Variants views (not a toggle folded into either), that renders
  Simulated and Real results for the same document and question at the
  same time, with each retaining its own mode-disclosure label.
- **FR-002**: The comparison MUST make each chunk's rank/position in both
  modes inspectable side by side, not only visually approximate.
- **FR-002a**: The comparison view MUST let the learner select which
  retrieval approach to compare — naive RAG, HyDE, or RAG-Fusion — since
  these are the only three approaches Milestone 2 executes for real;
  GraphRAG, Self-RAG, and Agentic RAG remain explanatory-only per
  spec.md 002 and are not selectable here.
- **FR-003**: Triggering the Real half of a comparison MUST follow the
  same cost/call disclosure pattern required by spec.md 002 FR-010.
- **FR-004**: The comparison MUST represent cases where Simulated and
  Real Mode agree closely as an honest, valid outcome, not implying
  divergence is expected or typical.
- **FR-004a**: If a learner opens the comparison view before Real Mode
  has been configured with an API key, the Simulated half MUST still
  render immediately, while the Real half MUST show the same inline API
  key entry prompt used elsewhere in Real Mode, in place of the Real
  chart, rather than blocking access to the whole view.
- **FR-005**: The system MUST maintain a running total of real API calls
  and estimated cost across an entire Real Mode session, visible from any
  step, not reset on step navigation. The ledger lives in memory only
  (matching the existing API key storage pattern) and is expected to
  reset on a page refresh or tab close, not persisted to
  sessionStorage/localStorage.
- **FR-006**: The system MUST ask before resetting the cumulative total
  when the learner changes the active document or resets pipeline state,
  rather than silently resetting or silently continuing to accumulate.
- **FR-007**: The system MUST support a learner-configurable warning
  threshold for cumulative estimated cost, defaulting to $1.00 if the
  learner never sets one, and MUST surface a visible warning before the
  next real call once that threshold is crossed.
- **FR-008**: Any displayed cost figure MUST be labeled as an estimate
  with its pricing-assumption basis named, never presented as an exact
  bill.

### Key Entities *(include if feature involves data)*

- **ComparisonResult**: a paired (Simulated result, Real result) for the
  same document/question and a selected retrieval approach (naive RAG,
  HyDE, or RAG-Fusion), including each chunk's rank in both, used to
  render the side-by-side view.
- **SessionCostLedger**: the running total of real API calls and
  estimated cost accumulated across a Real Mode session, plus the
  learner's configured (or default) warning threshold.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For at least one shipped sample document/question,
  Simulated and Real charts are shown side by side with every chunk's
  rank in both modes readable without additional clicks.
- **SC-002**: The cumulative cost/call counter persists correctly across
  at least three consecutive real actions within one session, verified
  by an automated check that the displayed total matches the sum of the
  individual actions' own estimates.
- **SC-003**: 100% of the Compare Simulated vs Real view's actions
  requiring a real call show a cost/call estimate before execution,
  verified by test. (Pre-existing real-call sites elsewhere in the app --
  Pipeline Walkthrough, Compare Variants, the chunk-size sweep, recall@K
  evaluation -- retain spec.md 002 FR-010's existing disclosure
  requirement, unchanged and out of this SC's scope; FR-005's cumulative
  ledger tracks their calls but does not redefine their own disclosure
  obligation.)
- **SC-004**: Crossing a configured (or default) warning threshold
  surfaces a visible warning before, not after, the next real call is
  made, verified by deliberately triggering the threshold in testing.

## Assumptions

- This milestone depends entirely on Milestone 2 (Real Mode) already
  being complete; it adds no new capability usable in Simulated Mode
  alone.
- Cost estimates use a single configurable pricing table per provider,
  maintained as static configuration -- not a live pricing lookup from
  the provider's API, which would be added complexity out of scope for
  this milestone.
- A failed real API call's effect on the cumulative total follows the
  configured provider's actual documented billing behavior for failed
  requests; where that behavior is unknown or unspecified by the
  provider, the system defaults to not counting the failed call toward
  the total (favoring undercounting cost over overcounting it).
