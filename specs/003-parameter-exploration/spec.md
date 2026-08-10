# Feature Specification: Parameter Exploration & Sharing

**Feature Branch**: `003-parameter-exploration`

**Created**: 2026-08-03

**Status**: Draft -- clarified 2026-08-10, pending `/speckit.plan`

**Input**: User description: "Parameter sweep curves, shareable
permalinks encoding configuration state, and known-failure presets for
the RAG module"

## Clarifications

### Session 2026-08-10

- Q: For the chunk-size sweep, what range and how many points should it cover -- a fixed range/step baked into the app, or one the learner can adjust? → A: Fixed range = existing chunk-size slider's min/max (spec 001), fixed point count (8-10 evenly spaced)
- Q: If a learner starts a second sweep while one is still running, should the new sweep cancel and replace the running one, or queue behind it? → A: Cancel the running sweep immediately, start the new one
- Q: Is the sweep's output metric fixed (e.g. always top-1 similarity score), or can the learner choose which metric the curve plots? → A: Fixed to top-1 similarity score only, for this milestone
- Q: Should this milestone's sweep control cover chunk size only, or also other parameters like similarity threshold or Top-K? → A: Chunk size only this milestone; architecture may be generic, but only one sweep target ships
- Q: How must a learner using only a keyboard select and activate an individual point on the sweep curve to jump to that configuration? → A: Each curve point is a focusable, individually-tabbable element, Enter/Space activates

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a sensitivity curve, not just one point (Priority: P1)

A learner wants to see how a metric (e.g. top-1 similarity score) changes
across a whole range of a parameter -- not just the one value they
happen to have the slider set to -- so they can see the shape of the
trade-off, not just a single sample of it.

**Why this priority**: This is the single highest-leverage addition
identified against the rest of the field (playground.tensorflow.org's
signature move is showing shape, not a point), and it directly extends
value already built in Milestones 1-2 rather than requiring new
infrastructure.

**Independent Test**: On the Retrieval step with a document and question
selected, activate a sweep on chunk size, and confirm a curve renders
showing a chosen output metric across a defined range of chunk size
values, with no manual re-running required per point.

**Acceptance Scenarios**:

1. **Given** a learner is on the Retrieval step with a question selected,
   **When** they activate a sweep on chunk size, **Then** the app
   automatically re-runs chunking, embedding, and retrieval across a
   defined range of chunk size values and plots the resulting metric
   (e.g. top-1 similarity score) as a curve against chunk size.
2. **Given** a sweep has completed, **When** the learner clicks any point
   on the curve, **Then** the pipeline jumps to that exact parameter
   setting's full state (chunks, chart, retrieval results) -- the curve
   is a navigable summary, not a dead-end image.
3. **Given** a sweep would produce a flat curve (the parameter barely
   affects the outcome for this document/question), **When** the sweep
   completes, **Then** the flat result is shown as a valid, clearly
   labeled outcome -- "this parameter doesn't move the outcome much
   here" is itself a teaching moment, not treated as a broken or
   uninteresting result.
4. **Given** Real Mode is active, **When** the learner activates a sweep
   that would require many real API calls, **Then** an estimated call
   count is shown and explicit confirmation is required before any of
   those calls are made, following the same disclosure pattern -- and
   the same call-count-only scope, with no dollar figure (deferred to
   Milestone 4's cost/call ledger per roadmap.md) -- as Real Mode's
   variant execution (spec 002 FR-010).
5. **Given** Simulated Mode is active, **When** a sweep runs, **Then** it
   completes with no real API calls and no confirmation step, since no
   cost or determinism concern applies (Constitution Principle V already
   guarantees deterministic, repeatable output).

---

### User Story 2 - Share an exact configuration via a link (Priority: P1)

A learner wants to send a colleague or a forum post a link that opens
this exact configuration -- same document, same chunk settings, same
question -- rather than describing the settings in prose.

**Why this priority**: Cheap to build relative to its value, and it
makes specific, discussable configurations linkable -- useful for
teaching, bug reports, and sharing an interesting or surprising result
with someone else.

**Independent Test**: Configure a non-default set of parameters, copy the
generated permalink, open it in a fresh browser session with no prior
state, and confirm every encoded parameter matches exactly.

**Acceptance Scenarios**:

1. **Given** a learner has configured document, chunk size, overlap,
   chunking strategy, threshold, Top-K, and question, **When** they
   generate a permalink, **Then** the resulting URL encodes all of those
   values.
2. **Given** Real Mode is active with temperature, RAG-Fusion N, or
   HyDE's hypothetical count set to non-default values, **When** a
   permalink is generated, **Then** those values are encoded too, but
   **When** the permalink is inspected, **Then** it contains no API key
   or credential under any circumstance.
3. **Given** a permalink encoding Real Mode parameters is opened by
   someone with no API key configured, **When** the page loads, **Then**
   every encoded parameter is applied immediately, but no real API call
   is made until the visitor supplies their own key -- a shared link
   never implies a shared credential.
4. **Given** a learner has pasted a custom document in Real Mode, **When**
   they generate a permalink, **Then** the custom document text is
   explicitly excluded from the encoded link (to avoid unbounded URL
   length), and the UI states this limitation plainly rather than
   silently truncating the text or failing to generate a link at all.

---

### User Story 3 - Learn from a deliberately broken example (Priority: P2)

A learner wants to see a specific, named failure mode on purpose --
"here's what happens when your chunks are too big" -- instead of only
discovering failures by accident while experimenting.

**Why this priority**: High teaching value, but depends on the parameters
being explorable at all (User Story 1's territory) to be worth curating
specific failure points within that space.

**Independent Test**: Select a named failure preset (e.g. "Threshold too
strict") from any pipeline step, and confirm the app loads a specific
parameter configuration and sample document/question that reproduces the
described failure, with an explanation naming the causing parameter.

**Acceptance Scenarios**:

1. **Given** the learner selects a failure preset, **When** it loads,
   **Then** the app sets the specific parameter values and sample
   document/question associated with that preset and shows the resulting
   (failed) pipeline state.
2. **Given** a failure preset has loaded, **When** the learner views the
   result, **Then** a short explanation names exactly which parameter
   caused the failure and why -- distinguishing a deliberately-taught
   failure from an unexplained broken state.
3. **Given** a learner wants to leave a preset, **When** they activate a
   single "reset to defaults" control, **Then** all parameters return to
   sensible defaults from any preset-loaded state or mid-sweep state
   (matching FR-010's full scope).

---

### Edge Cases

- What happens if a chunk-size sweep's range includes a chunk size that
  would make the current overlap setting invalid at some points in the
  range? (Overlap must be clamped per-step of the sweep, consistent with
  spec.md 001's structural overlap-below-chunk-size requirement -- not
  merely at the sweep's starting value.)
- What happens if two different parameters are both mid-sweep at once?
  (Only one sweep should be active at a time; starting a second sweep
  MUST cancel the running one immediately and start the new one, not
  queue behind it or silently corrupt both.)
- What happens if a permalink is generated, then the underlying sample
  document set changes in a future release (a document is renamed or
  removed)? (Opening an old permalink referencing a removed document
  must fail with a clear message, not silently load a different,
  unrelated document.)
- What happens if a failure preset's parameters stop reproducing the
  described failure after an unrelated engine change (e.g. a chunking
  algorithm improvement)? (This must be caught by an automated check --
  see Success Criteria -- not discovered by a learner encountering a
  preset that no longer demonstrates what it claims to.)
- What happens when a learner tries to permalink a state that includes an
  active, in-progress sweep? (The permalink should encode the
  pre-sweep parameter state, not an ambiguous mid-sweep snapshot.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a sweep control for at least chunk
  size that re-runs the pipeline across a defined range of values and
  computes a chosen output metric at each step without further learner
  input per step. This control MUST operate in both Simulated Mode
  (runs immediately, no confirmation) and Real Mode (gated by FR-003's
  cost-confirmation requirement before any real call is made) -- it is
  the same control in both modes, not a Simulated-Mode-only feature.
  The chunk-size sweep's range is fixed to the existing chunk-size
  slider's min/max (spec 001), sampled at a fixed 9 evenly spaced
  points -- not learner-adjustable.
- **FR-002**: Sweep results MUST render as a curve (parameter value vs.
  metric), with every point clickable to load that exact configuration's
  full pipeline state. The metric plotted is fixed to top-1 similarity
  score for this milestone -- not learner-selectable. Each point MUST be
  an individually focusable, keyboard-activatable element (Tab to move
  between points, Enter/Space to activate), per Constitution Principle
  VII -- not mouse-only.
- **FR-003**: When a sweep is run in Real Mode and would require more
  than one real API call, the system MUST show an estimated call count
  (call-count only, no dollar figure -- deferred to Milestone 4's
  cost/call ledger per roadmap.md, matching spec 002 FR-010's own scope)
  and require explicit confirmation before any of those calls are made.
- **FR-004**: A sweep producing a flat (low-sensitivity) curve MUST be
  presented as a valid, clearly labeled outcome, not as an error or an
  empty state.
- **FR-005**: The system MUST generate a permalink encoding the current
  mode (Simulated/Real) and all current parameter values (document
  selection, chunk size, overlap, chunking strategy, threshold, Top-K,
  question, and, in Real Mode, temperature, RAG-Fusion N, and HyDE
  hypothetical count).
- **FR-006**: A generated permalink MUST NOT include any API key or
  credential under any circumstance.
- **FR-007**: A permalink MUST exclude custom pasted Real Mode document
  text from its encoding; this limitation MUST be stated in the UI when
  generating a link under those conditions, not silently applied.
- **FR-008**: Opening a valid permalink MUST reproduce every encoded
  parameter without requiring the visitor to manually re-enter any of
  them, while never assuming or requiring a shared API key.
- **FR-009**: The system MUST ship at least three named failure presets
  (at minimum: threshold-too-strict producing an empty result set,
  chunk-too-large, and chunk-too-small/fact-split), each associated with
  a specific parameter configuration, sample document, and question, and
  each accompanied by an explanation naming the causing parameter.
- **FR-010**: A "reset to defaults" control MUST be reachable from any
  preset-loaded or swept state.

### Key Entities *(include if feature involves data)*

- **SweepPoint** / **SweepState**: `SweepPoint` is one (chunk size,
  clamped overlap, top-1 similarity score, status) tuple; `SweepState` is
  the ordered set of `SweepPoint`s for one sweep run plus a cancellation
  token. For the chunk-size sweep, the range is fixed to the existing
  chunk-size slider's min/max at 9 evenly spaced points (not
  learner-configurable) -- see data-model.md.
- **PermalinkParams**: the encodable subset of pipeline configuration
  (mode, document selection, chunking/retrieval/generation parameters)
  that a permalink carries -- explicitly excluding API keys and custom
  pasted document text. See data-model.md's `PermalinkParams` table and
  contracts/permalink-contract.md's `PermalinkSourceState`/
  `ParsedPermalink` types for the exact field-level shape.
- **FailurePreset**: a named, curated (parameter configuration, sample
  document, sample question, explanation) tuple that reliably reproduces
  a specific, labeled failure mode.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can identify, from a sweep curve alone, at least
  one parameter range where the output metric changes meaningfully and
  at least one range where it stays flat, without manually re-running the
  pipeline by hand at each point.
- **SC-002**: Every generated permalink, when inspected, is verified by
  an automated check to contain zero API keys or credentials.
- **SC-003**: Opening a permalink in a fresh, stateless browser session
  reproduces every encoded parameter exactly, verified across all
  encodable parameters listed in FR-005.
- **SC-004**: Each shipped failure preset is verified, via an automated
  check run against the current pipeline implementation, to still
  produce its labeled failure -- not merely to load static numbers that
  may have drifted out of sync with pipeline changes over time.
- **SC-005**: 100% of Real Mode sweeps requiring more than one real API
  call show a call-count estimate and require confirmation before any
  call is made -- verified by test, not by inspection alone.

## Assumptions

- Real Mode sweeps are in scope for this milestone (gated behind the
  cost-confirmation requirement in FR-003), not deferred to a later
  milestone -- the teaching value of seeing a real fidelity curve is
  judged high enough to justify the added cost-disclosure complexity now.
- Chunk size is the only sweepable parameter this milestone; the sweep
  architecture may be built generically, but similarity threshold,
  Top-K, and other parameters are not exposed as sweep targets until a
  future milestone.
- Permalinks cover all parameters except custom pasted Real Mode
  documents (excluded per FR-007) and API keys (excluded per FR-006,
  with no exception).
- Failure presets are curated against the shipped sample documents only;
  automatically generating a failure preset for a learner's own custom
  document is out of scope for this milestone.
- This milestone depends on Milestone 1 (parameters to sweep and
  permalink must exist) and benefits from, but does not strictly require,
  Milestone 2 (Real Mode) -- the Simulated-Mode-only subset of this
  milestone's scope is independently valuable and testable.
