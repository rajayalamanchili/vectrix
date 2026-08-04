# Feature Specification: Core Extensible Platform + RAG Concept Module

**Feature Branch**: `001-core-platform-rag-module`

**Created**: 2026-08-03

**Status**: Draft -- pending `/speckit.clarify`

**Input**: User description: "Core extensible playground platform with the
Retrieval-Augmented Generation concept module (pipeline walkthrough and
variant comparison views)"

## Clarifications

### Session 2026-08-03

- Q: When a learner switches to a different sample document after already
  generating retrieval results for the previous document, should the app
  auto-clear those now-stale results, the same way it's required to do
  when the chunking strategy changes? → A: Auto-clear query, results, and
  step position -- switching documents resets query text, retrieved
  results, and returns the stepper to the Document step, consistent with
  the existing chunking-strategy-switch rule.
- Q: For FR-014's sentence-boundary chunking strategy, how should the
  existing chunk-size setting (a word count) determine boundaries, since
  a pure sentence split doesn't naturally respect a word count the way
  fixed-size chunking does? → A: Split the document into sentences
  first, then greedily group consecutive sentences into a chunk until
  adding the next sentence would exceed the chunk-size word count, then
  start a new chunk -- keeps the size slider's meaning comparable across
  both strategies.
- Q: What numeric range and default value should the similarity-
  threshold slider (FR-013) use, given cosine-similarity scores over
  this app's bag-of-words vectors are always non-negative? → A: 0.00-1.00
  raw score, default 0 -- matches the exact scale already shown next to
  each ranked result, and a default of 0 leaves the threshold fully open
  (no filtering) so it doesn't change existing default retrieval
  behavior.
- Q: Neither FR-013 (similarity-threshold control) nor FR-014
  (chunking-strategy toggle) exist in the shipped code yet, despite
  being written into this spec's requirements and Success Criteria.
  Should closing them be treated as required Milestone-1 work? → A: Yes
  -- both were deliberately added to this approved spec during the
  parameter-impact review, not accidentally; they remain required
  Milestone-1 Definition-of-Done items, not deferred scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Work through the RAG pipeline hands-on (Priority: P1)

A learner picks a sample document, adjusts chunking settings, watches the
resulting chunks land in a 2D embedding-space visualization, asks a
question, and sees which chunks get retrieved and why -- then sees the
augmented prompt that would be sent to a model.

**Why this priority**: This is the playground's core teaching moment --
the thing that makes RAG intuitive instead of abstract. Without it there
is no product, just a description of RAG.

**Independent Test**: Load the RAG module, complete all five pipeline
steps (Document -> Chunking -> Embedding -> Retrieval -> Generation)
using only the provided sample content, and confirm a ranked, scored list
of retrieved chunks and an assembled prompt are visible at the end --
delivers the "aha" of seeing retrieval work without needing any other
feature.

**Acceptance Scenarios**:

1. **Given** a learner has selected a sample document, **When** they move
   to the Chunking step, **Then** they see the document split into
   labeled, colored chunks that update immediately as they drag the chunk
   size or overlap sliders.
2. **Given** chunks have been produced, **When** the learner moves to the
   Embedding step, **Then** each chunk is plotted as a distinct point in
   a 2D chart with no two chunks perfectly overlapping and no chunk
   missing from the chart.
3. **Given** the learner types or selects a question, **When** they view
   the Retrieval step, **Then** the question appears on the same chart as
   a visually distinct marker, and the top-K nearest chunks by similarity
   score are both highlighted on the chart and listed in ranked order
   with numeric scores.
4. **Given** retrieval results exist, **When** the learner moves to the
   Generation step, **Then** they see the exact assembled prompt
   (instructions + retrieved context + question) that would be sent to a
   model, and a clearly labeled simulated answer -- never presented as if
   it came from a real model call.
5. **Given** the learner raises Top-K from 1 to 5, **When** the retrieved
   list updates, **Then** similarity scores are non-increasing down the
   list (each subsequent result's score is less than or equal to the one
   above it).
6. **Given** the learner raises a similarity-threshold control, **When**
   the threshold exceeds every candidate chunk's score for the current
   question, **Then** the retrieved list becomes empty and the chart
   shows no chunk as highlighted -- "no good match" is a real, visible
   state, not just a theoretical one the learner has to take on faith.
7. **Given** the learner switches the chunking strategy from fixed-size
   to sentence-boundary (or back) on the same document with the same
   size setting, **When** the Chunking step re-renders, **Then** the
   resulting chunk boundaries visibly differ between the two strategies
   -- the toggle changes real output, not just a label.

---

### User Story 2 - Discover and choose a module from the home page (Priority: P1)

A visitor lands on the playground with no prior context, sees what
modules are available, and picks one to start learning.

**Why this priority**: Equally foundational to User Story 1 -- without a
legible entry point, the pipeline experience is unreachable. This is also
where the platform's extensibility is first visible to a user, even
before a second module exists.

**Independent Test**: Load the home page with zero prior state and
confirm every registered concept module is listed with enough
information (title, one-line hook, category, estimated time) to decide
whether to open it, and that opening one navigates to a working module.

**Acceptance Scenarios**:

1. **Given** the home page loads, **When** the learner looks at the
   module list, **Then** every module in the registry is shown exactly
   once, with no module requiring scrolling through unrelated content to
   find.
2. **Given** only one module exists today, **When** the learner views the
   home page, **Then** the layout visibly communicates that more modules
   are expected over time, not that this is the permanent full set.

---

### User Story 3 - Compare RAG variants side by side (Priority: P2)

A learner who already understands naive RAG wants to understand what
HyDE, RAG-Fusion, GraphRAG, Self-RAG, and Agentic RAG each change and why,
without reading five separate articles.

**Why this priority**: High learning value, but depends on User Story 1
existing first to give "naive RAG" meaning as a baseline to compare
against.

**Independent Test**: Open the Compare Variants view, select any two
variant cards, and confirm a side-by-side view appears showing each
variant's flow, the specific problem it addresses, how it works, and its
trade-off -- independently of ever touching the pipeline walkthrough.

**Acceptance Scenarios**:

1. **Given** the variants grid is showing, **When** the learner selects
   any single variant, **Then** its flow diagram visually distinguishes
   the stages it changes from the stages it shares with naive RAG.
2. **Given** two variants are selected, **When** the comparison view
   renders, **Then** both variants' problem/how-it-works/trade-off text
   is visible without further clicks, and a control exists to return to
   the full grid.
3. **Given** two variants are already selected, **When** the learner
   selects a third, **Then** the oldest of the two prior selections is
   replaced rather than the action being blocked or silently ignored.

---

### User Story 4 - Add a second concept module without touching core code (Priority: P3)

A developer (possibly future-you, in Claude Code) wants to add a new AI
engineering concept -- fine-tuning, prompt engineering, agents, whatever
comes next -- and expects to do so by adding a new, self-contained folder,
not by editing the home page, routing, or any existing concept.

**Why this priority**: This is the entire reason the platform is
architected as a registry rather than a single hardcoded page. It's lower
priority than P1/P2 only because it can't be demonstrated until at least
one more concept module is actually built -- but the *contract* that
makes it possible must exist from Milestone 1.

**Independent Test**: Without this milestone's Success Criteria, this
story cannot be fully verified (see SC-002) until a second module is
added in a later milestone -- but the `ConceptModule` contract and
registry pattern that make it possible must be reviewable and testable in
isolation now, e.g. via a type-level contract check and a test that
asserts the home page and routing render purely from the registry array
with no per-module conditionals elsewhere.

**Acceptance Scenarios**:

1. **Given** the `ConceptModule` contract, **When** a new module object
   satisfying it is added to the registry array, **Then** it appears on
   the home page and is reachable at its own route with zero changes to
   any other file outside its own new folder and the one registry line.

---

### Edge Cases

- What happens when chunk size is set larger than the document itself?
  (Should yield exactly one chunk, not an error or an empty result.)
- What happens when overlap is set equal to or greater than chunk size?
  (Must be structurally prevented, e.g. by clamping the slider's range,
  not merely validated after the fact.)
- What happens when a query is empty or whitespace-only? (Retrieval must
  degrade gracefully -- e.g. show a neutral empty state -- not crash or
  silently rank arbitrary chunks.)
- What happens when Top-K exceeds the total number of chunks available?
  (Return all available chunks, ranked, without erroring.)
- What happens if a second concept module's object is missing a required
  `ConceptModule` field? (Should fail at build/type-check time, not
  render a broken card at runtime.)
- How does the pipeline behave if a learner jumps directly to the
  Retrieval or Generation step via the stepper without visiting earlier
  steps first? (Must not crash -- earlier steps' state should have sane
  defaults so any step is independently viewable.)
- How is a simulated/mocked AI behavior (the embedding projection, the
  generated answer) visually distinguished from output that would come
  from a real model or embedding API? (Must be explicit in the UI, not
  merely documented in code comments.)
- How does the layout behave at a narrow (mobile-width) viewport? (Must
  remain readable and operable, not merely "not crash.")
- What happens when the similarity threshold is set to its minimum
  (effectively disabled) versus its maximum (excludes everything short of
  a perfect match)? (Both ends must be reachable and must produce a
  coherent result -- all candidates at minimum; at maximum, every chunk
  is excluded except one whose similarity score is an exact 1.00 match
  to the query, which the shipped sample fixtures never produce -- not a
  clamped or ignored value. See FR-013 for why the comparison is
  inclusive and why that makes this the correct outcome rather than a
  conflict.)
- What happens if a learner switches chunking strategy after already
  having retrieval results from the previous strategy? (The Retrieval
  and Generation steps must re-run against the new chunk set, not show
  stale results computed from chunks that no longer exist.)
- What happens if a learner switches to a different sample document
  after already having retrieval results from the previous document?
  (The query text, retrieved results, and stepper position MUST all
  reset to their defaults and return to the Document step -- the same
  stale-state rule that applies to a chunking-strategy switch, so
  Generation never displays a prompt built from a different document's
  chunks.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define a `ConceptModule` contract (id,
  title, tagline, description, category, estimated time, and a renderable
  component) that every concept, including RAG, satisfies.
- **FR-002**: The system MUST render the home page's module list and
  every concept's route purely by reading a single central registry of
  `ConceptModule` entries -- no file outside a concept's own folder may
  contain a per-concept conditional: code whose branch is selected by
  comparing a value against a specific, hardcoded concept id literal
  (e.g. `if (id === "rag")`, a `switch` case naming a literal id, or a
  lookup table keyed by literal ids). Iterating or looking up over the
  registry using a runtime-supplied id -- `conceptRegistry.map(...)`,
  `getConcept(id)`, `key={c.id}` -- is not a per-concept conditional,
  since no concept's specific id is named in the comparison; it's the
  literal-id comparison that the extensibility contract prohibits
  outside a concept's own folder.
- **FR-003**: The RAG module MUST provide a Pipeline Walkthrough view with
  five sequential steps -- Document, Chunking, Embedding, Retrieval,
  Generation -- navigable via a stepper that allows jumping to any step
  directly, not only linearly forward.
- **FR-004**: The Chunking step MUST let the learner adjust chunk size and
  overlap via sliders, with overlap structurally clamped below chunk size,
  and MUST re-render the resulting chunks immediately on every change.
- **FR-005**: The Embedding step MUST plot every chunk as a distinct point
  on a 2D chart, and the visualization method MUST be disclosed in the UI
  as a simplified teaching simulation, not presented as a real embedding
  model's output.
- **FR-006**: The Retrieval step MUST let the learner enter or select a
  question, embed it with the same method used for chunks, rank all
  chunks by similarity, and visually highlight the top-K (learner
  adjustable) both on the chart and in a ranked, scored list.
- **FR-007**: The Generation step MUST display the exact assembled prompt
  (instructions + retrieved context + question) and a simulated answer
  that is explicitly labeled as simulated, with the code path for
  substituting a real model call clearly documented at that one seam.
- **FR-008**: The RAG module MUST provide a Compare Variants view listing
  naive RAG (baseline) plus these five specific named variants: HyDE,
  RAG-Fusion, GraphRAG, Self-RAG, and Agentic RAG -- each with a flow
  diagram that visually distinguishes stages that differ from naive RAG.
  These five are a required minimum, not interchangeable examples of a
  category: User Story 3 names this exact set as what the learner comes
  to understand, so a different set of five variants would not satisfy
  this requirement even though it would satisfy a plain "at least five"
  reading. Additional variants beyond these five MAY be added without
  violating this requirement.
- **FR-009**: The Compare Variants view MUST support selecting exactly two
  variants for a side-by-side detailed comparison (problem addressed, how
  it works, trade-off), with a documented rule for what happens on a
  third selection (FIFO replacement, per Edge Cases).
- **FR-010**: All sample content (documents, queries) needed to
  demonstrate the RAG module end-to-end MUST ship as static, hardcoded
  fixtures -- no external API, database, or user upload is required for
  Milestone 1.
- **FR-011**: Every interactive control (slider, tab, stepper step,
  button) MUST be operable via keyboard alone and MUST have an accessible
  name.
- **FR-012**: The system MUST respect the user's reduced-motion preference
  for any animation or transition.
- **FR-013**: The Retrieval step MUST provide a similarity-threshold
  control, independent of Top-K, that filters the retrieved set to only
  chunks meeting or exceeding the threshold (an inclusive `>=`
  comparison) -- the retrieved list MAY be smaller than Top-K, including
  empty, when the threshold is strict enough that fewer chunks qualify.
  The control MUST use a 0.00-1.00 raw cosine-similarity scale (the same
  units already shown next to each ranked result) and MUST default to 0
  (fully open, no filtering) so existing default retrieval behavior is
  unchanged. The comparison MUST stay inclusive at both ends: a
  zero-scoring chunk has to pass at the default-0 threshold, which is
  only possible with `>=`, and that same inclusive comparison is what
  necessarily admits a perfect (1.00) match at the maximum threshold too
  -- see Edge Cases for the reachability consequence.
- **FR-014**: The Chunking step MUST offer at least two distinct chunking
  strategies (fixed-size word chunking and sentence-boundary chunking)
  as a learner-selectable toggle, applied to the same source document, so
  the resulting chunk boundaries are directly comparable. Sentence-
  boundary chunking MUST split the document into sentences first, then
  greedily group consecutive sentences into a chunk until adding the
  next sentence would exceed the chunk-size word count, then start a new
  chunk -- so the same chunk-size setting governs both strategies.

### Key Entities *(include if feature involves data)*

- **ConceptModule**: id, title, tagline, description, category,
  estimated time, and the component that renders the whole concept --
  the contract every module (RAG and future ones) must satisfy.
- **Chunk**: a contiguous slice of a source document's text, with its
  word-range boundaries and the chunking strategy that produced it,
  produced by the chunking step.
- **EmbeddedPoint**: a chunk or query's projected 2D coordinate plus its
  underlying comparison vector, used for plotting and similarity scoring.
- **RetrievedChunk**: a `Chunk` paired with its similarity score relative
  to the current query, ranked for display and filtered by both Top-K and
  the similarity-threshold control.
- **RagVariant**: a named RAG architecture variant with its one-line
  description, the problem it addresses, how it works, its flow (as an
  ordered list of stages, each flagged whether it differs from naive
  RAG), and its trade-off.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can go from the home page to seeing a
  ranked, scored set of retrieved chunks for a question in under 2
  minutes without external instructions.
- **SC-002**: Adding a second concept module requires changes in exactly
  one existing file (the registry) plus new files inside that module's
  own new folder -- verified by an automated check that scans existing
  concept and core files for per-module conditionals, using FR-002's
  definition of a per-concept conditional (a hardcoded-literal-id
  comparison, not registry iteration/lookup by a runtime id).
- **SC-003**: Every simulated or mocked AI behavior in the module (the
  embedding projection, the generated answer) is verified, via an
  automated content check, to carry an explicit "simulated" disclosure
  visible in the rendered UI.
- **SC-004**: The Pipeline Walkthrough and Compare Variants views both
  remain fully readable and operable at a 375px-wide viewport.
- **SC-005**: 100% of interactive controls are operable using keyboard
  navigation alone, verified by an automated accessibility check.
- **SC-006**: Across ten repeated runs with the same document, chunk
  settings, and query, the retrieval ranking is byte-for-byte identical
  every time -- the pipeline's core teaching mechanism is deterministic,
  not flaky.
- **SC-007**: For at least one shipped sample document and question, a
  learner can find a similarity-threshold value that empties the
  retrieved set -- "no good match" is a reachable, demonstrable state,
  not merely an assertion in the marginalia text.
- **SC-008**: For at least one shipped sample document, switching
  chunking strategy at the same size setting produces a measurably
  different set of chunk boundaries (not merely a different label on
  identical output).

## Assumptions

- No real embedding model or LLM API call is required or expected for
  Milestone 1 -- a disclosed, deterministic simulation is the intended
  design, not a placeholder awaiting a real integration (a real API can
  be wired in later at the documented seam without changing this
  milestone's success criteria).
- Sample documents and queries are hardcoded fixtures shipped with the
  app; user-uploaded or externally-fetched content is out of scope for
  Milestone 1.
- This is a single-user, client-side-only experience for Milestone 1: no
  backend service, database, authentication, or persistence is required.
- Desktop is the primary target, but the layout must degrade usably (not
  merely "not break") down to common mobile widths.
- A second concept module is not built in this milestone; User Story 4's
  contract is established and reviewable now, with full end-to-end
  verification deferred to the milestone that adds an actual second
  module.
