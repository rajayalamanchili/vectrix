# Feature Specification: Core Extensible Platform + RAG Concept Module

**Feature Branch**: `001-core-platform-rag-module`

**Created**: 2026-08-03

**Status**: Draft -- clarified 2026-08-04, pending `/speckit.plan`

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

### Session 2026-08-04

- Q: Should FR-004 (chunk size/overlap) and FR-006 (Top-K) be updated to
  state the exact numeric ranges already shipped in the prototype's
  code, rather than leaving them unspecified? → A: Yes -- codify the
  shipped values: chunk size 20-120 words (step 5, default 60), overlap
  0-40 words but always dynamically capped to (chunk size - 5) so it can
  never reach or exceed chunk size (step 5, default 15), Top-K 1-5
  (default 3).
- Q: Should FR-010 state a minimum number of sample documents, matching
  what's already shipped (2: a coffee-brewing guide and an
  employee-benefits handbook excerpt)? → A: Yes -- require at least 2,
  each with its own set of sample queries, matching the shipped
  fixtures.
- Q: How should SC-008's "measurably different" chunk boundaries be
  quantified so an automated check can verify it objectively? → A: At
  least one boundary differs -- the ordered list of chunk (start, end)
  word-index pairs produced by sentence-boundary chunking differs from
  fixed-size chunking in at least one chunk, for the same document and
  size setting.
- Q: How should FR-011 define "keyboard operable" concretely, so the
  committed Playwright + axe-core check (tech-stack.md) has a precise
  bar to test against rather than just "reachable"? → A: Focus +
  role-appropriate activation -- reachable via Tab in a logical order,
  with a visible focus indicator, and activatable/adjustable using the
  standard key for its role (Enter/Space for buttons and tabs, Arrow
  keys for sliders and the stepper) without a mouse.
- Q: How should SC-004's "fully readable and operable" at 375px be given
  concrete, checkable criteria instead of being left to implementation
  judgment? → A: No horizontal scroll of the page body, no clipped or
  truncated text (ellipsis or cutoff), and every interactive control has
  at least a 44x44px touch target.

### Session 2026-08-04 (batch closure of remaining checklist gaps)

Remaining `checklists/requirements.md` items (CHK003-CHK005, CHK007,
CHK008, CHK011-CHK022, CHK024-CHK026) were closed in one pass rather than
individually re-asked, since each had a single defensible answer
consistent with the shipped prototype, the constitution, and tech-stack.md
-- no live decision point required a learner- or product-level trade-off
the way the five questions earlier in this session did. Each resolution
is inlined at its requirement/success-criterion/edge-case site rather
than repeated here; see FR-001, FR-007, FR-012, FR-013, Edge Cases,
SC-001, SC-006, SC-007, SC-008, Assumptions, and User Story 3's new
scenario 1. CHK014 and CHK026 required no spec text change: CHK014 was
already resolved by this session's FR-002/SC-002 definitional
cross-reference, and CHK026 was already consistent across spec.md,
roadmap.md, and AGENTS.md (all three already state the FR-013/FR-014
build gap identically).

### Session 2026-08-04 (batch closure of accessibility checklist gaps)

`checklists/accessibility.md` items CHK001-CHK023 were closed in one
pass, same rationale as the batch above: each had a single defensible
answer, none required a learner-facing product trade-off. Resolutions
are inlined at FR-005 (chart color-independence), FR-009 (Compare
Variants keyboard scope, FIFO-replacement operability), FR-011
(rewritten: canonical control enumeration, DOM-order Tab order,
measurable focus-indicator, disabled-control Tab removal, accessible
names must be purpose-specific, scope boundary against incidental
focusable elements, Arrow-key step alignment, focus-indicator
exemption from FR-012's reduced-motion collapse), FR-014 (toggle
selected-state via `aria-pressed` or equivalent), SC-005 (WCAG 2.1
AA-aligned target, explicit cross-view scope), Edge Cases (focus
destination after a stepper jump and after the document/strategy-switch
auto-reset; empty-retrieved-list keyboard reachability), and Assumptions
(native range-input keyboard reliance; ARIA live-region announcements
explicitly out of scope for Milestone 1's SC-005). CHK014 required no
spec text change beyond CHK004's enumeration, which already gives
SC-005 an unambiguous scope.

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

1. **Given** the Compare Variants view loads with no prior selection,
   **When** the learner first sees it, **Then** the full grid of variant
   cards (naive RAG baseline plus the five named variants) is shown with
   no side-by-side comparison panel, and every card is individually
   selectable.
2. **Given** the variants grid is showing, **When** the learner selects
   any single variant, **Then** its flow diagram visually distinguishes
   the stages it changes from the stages it shares with naive RAG.
3. **Given** two variants are selected, **When** the comparison view
   renders, **Then** both variants' problem/how-it-works/trade-off text
   is visible without further clicks, and a control exists to return to
   the full grid.
4. **Given** two variants are already selected, **When** the learner
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
- What happens if two `ConceptModule` entries in the registry share the
  same `id`? (Must be caught by an automated check over the registry
  array -- the same fail-fast bar as SC-002's per-module-conditional
  check -- not discovered only at runtime by whichever entry happens to
  render or route last.)
- How does the pipeline behave if a learner jumps directly to the
  Retrieval or Generation step via the stepper without visiting earlier
  steps first? (Must not crash -- earlier steps' state should have sane
  defaults so any step is independently viewable.)
- Where does keyboard focus land after the stepper jumps to a
  non-adjacent step? (Focus MUST move to the newly active step's first
  interactive control -- e.g. the document picker on the Document step,
  the chunk-size slider on the Chunking step -- not remain stranded on
  the stepper navigation, so a keyboard user isn't forced to Tab through
  the stepper again to reach the new step's content.)
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
  conflict. No "nearest miss, below threshold" indicator is shown in
  this state -- complete suppression to an empty list is the only
  specified behavior for Milestone 1; surfacing the highest-scoring
  excluded chunk is a possible future enhancement, not required here.
  The empty-state message MUST be within a reachable landmark or heading
  so a keyboard/screen-reader user lands somewhere meaningful rather
  than nowhere; no separate interactive control is required in this
  state since there is nothing to act on.)
- What happens if a learner switches chunking strategy after already
  having retrieval results from the previous strategy? (The Retrieval
  and Generation steps must re-run against the new chunk set, not show
  stale results computed from chunks that no longer exist. Unlike a
  document switch below, the query text and stepper position are NOT
  reset -- the document and question the learner was working with
  remain valid; only the chunk boundaries, and therefore the ranked
  results computed from them, change.)
- What happens if a learner switches to a different sample document
  after already having retrieval results from the previous document?
  (The query text, retrieved results, and stepper position MUST all
  reset to their defaults and return to the Document step -- a stricter
  reset than a chunking-strategy switch above, by design: a new
  document invalidates the previous query's relevance and any
  chunk-based state in a way a same-document strategy change does not,
  so Generation never displays a prompt built from a different
  document's chunks. Keyboard focus after this auto-reset MUST land on
  the document-selector chip for the newly active document, consistent
  with the stepper-jump focus rule above -- not left on whatever control
  the learner was previously focused on before the reset occurred.)
- What happens if a learner changes the chunking-strategy toggle while
  on the Document step, before ever visiting the Chunking step -- or
  changes it, then switches documents, in the same session? (Chunking
  strategy, chunk size, and overlap are pipeline-wide settings
  independent of which document is active. A document switch resets
  query, results, and stepper position per the rule above, but does NOT
  reset the chosen chunking strategy, chunk size, or overlap -- a
  learner who already selected sentence-boundary chunking still sees it
  selected after picking a new document.)
- What does the Chunking step show while the chunk-size or overlap
  slider is actively being dragged, mid-interaction? (Chunking is a
  synchronous, pure client-side computation over documents under 300
  words, so there is no intermediate loading state to design for -- each
  slider `onChange` event synchronously recomputes and re-renders the
  full chunk set; the "mid-drag" and "settled" states are the same code
  path, not two different ones.)
- What happens when sentence-boundary chunking is selected on a document
  containing zero sentence-ending punctuation? (The entire document is
  treated as a single sentence, producing exactly one chunk -- the same
  outcome as the "chunk size larger than the document" edge case above,
  not an error or an empty result.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define a `ConceptModule` contract (id,
  title, tagline, description, category, estimated time, and a renderable
  component) that every concept, including RAG, satisfies. Each
  `ConceptModule.id` in the registry MUST be unique -- two entries
  sharing an id is a registry-configuration error, not a valid state.
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
- **FR-004**: The Chunking step MUST let the learner adjust chunk size
  (20-120 words, step 5, default 60) and overlap (0 words up to a
  maximum of `min(40, chunkSize - 5)`, step 5, default 15) via sliders,
  with overlap structurally clamped below chunk size, and MUST re-render
  the resulting chunks immediately on every change.
- **FR-005**: The Embedding step MUST plot every chunk as a distinct point
  on a 2D chart, and the visualization method MUST be disclosed in the UI
  as a simplified teaching simulation, not presented as a real embedding
  model's output. Highlighted points (retrieved chunks, the query marker)
  MUST be visually distinguishable by a means other than color alone
  (e.g., marker shape, size, or an adjacent label), so the chart remains
  legible to learners with color-vision deficiency.
- **FR-006**: The Retrieval step MUST let the learner enter or select a
  question, embed it with the same method used for chunks, rank all
  chunks by similarity, and visually highlight the top-K (learner
  adjustable from 1-5, default 3) both on the chart and in a ranked,
  scored list.
- **FR-007**: The Generation step MUST display the exact assembled prompt
  (instructions + retrieved context + question) and a simulated answer
  that is explicitly labeled as simulated, with the code path for
  substituting a real model call documented at that one seam by a code
  comment, immediately above the sole function implementing simulated
  generation, that explains what it simulates and how to replace it with
  a real provider call -- objectively checkable by confirming exactly
  one such function/comment pair exists in the codebase, rather than a
  subjective read.
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
  third selection (FIFO replacement, per Edge Cases). Variant-card
  selection and the return-to-grid control MUST satisfy FR-011: cards
  are Tab-reachable in grid (DOM) order with Enter/Space to select --
  no dedicated arrow-key grid navigation is required beyond Tab, since
  FR-011's Arrow-key requirement applies only to sliders and the
  stepper. The FIFO-replacement behavior on a third selection MUST be
  reachable and operable via keyboard identically to the first two
  selections, not a separate, mouse-only interaction path.
- **FR-010**: All sample content needed to demonstrate the RAG module
  end-to-end MUST ship as static, hardcoded fixtures -- no external API,
  database, or user upload is required for Milestone 1. At least 2
  sample documents MUST ship, each with its own set of sample queries,
  so choosing a document (US1) is a real choice among distinct content.
- **FR-011**: Every interactive control MUST be operable via keyboard
  alone and MUST have an accessible name that describes its specific
  purpose (e.g., "Chunk size in words," not a generic "Slider" shared
  across chunk-size, overlap, Top-K, and threshold controls that would
  otherwise sound identical to assistive technology). The canonical set
  of controls this requirement and SC-005 apply to -- identically across
  the Pipeline Walkthrough and Compare Variants views, and identically
  for native controls and custom-styled elements -- is: the chunk-size,
  overlap, Top-K, and similarity-threshold sliders; the stepper's step
  buttons; the Pipeline-Walkthrough/Compare-Variants view tabs; the
  chunking-strategy toggle; sample-document and sample-query chips;
  variant cards; and all other buttons (Back/Next, return-to-grid).
  "Operable" means: reachable via Tab in DOM order (the "logical order"),
  with a visible focus indicator (a minimum 2px outline at at least 3:1
  contrast against its adjacent background, present regardless of the
  reduced-motion preference in FR-012 -- a static outline's presence is
  not itself an animation or transition, so FR-012 does not delay or
  suppress it), and activatable/adjustable using the standard key for
  its role (Enter/Space for buttons, tabs, and toggle options; Arrow
  keys for sliders and the stepper, with each slider's arrow-key
  increment matching that slider's own stated `step` value) without a
  mouse -- reachability alone (focus without activation) does not
  satisfy this requirement. This requirement's scope is bounded to the
  enumerated control types above; an incidentally-focusable,
  non-interactive element (e.g., a plotted chart point) is not itself a
  "control" and is not required to be independently activatable. A
  control that is temporarily unavailable (e.g., a Back button at the
  first step) MUST be removed from the Tab order via its native
  `disabled` state, not merely styled to appear inactive.
- **FR-012**: The system MUST respect the user's reduced-motion preference
  for any animation or transition. This applies to every transition the
  module currently has: hover/selection-state color transitions on the
  Pipeline-Walkthrough/Compare-Variants tabs, sample-document chips, the
  Retrieval step's sample-query chips, variant cards, and the pipeline's
  Back/Next navigation buttons. A single global `prefers-reduced-motion`
  rule collapsing all transition/animation durations to near-zero
  satisfies this requirement by construction, rather than requiring a
  per-component opt-in.
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
  -- see Edge Cases for the reachability consequence. Filtering is
  applied before Top-K selection: chunks are ranked by similarity,
  filtered to those scoring at or above the threshold, and Top-K is then
  taken from that filtered set -- so raising the threshold can surface a
  lower-ranked chunk into the displayed list (by removing a
  higher-ranked chunk that no longer qualifies) rather than only ever
  shrinking it, and the retrieved set can reach empty independent of the
  Top-K value whenever fewer than one chunk qualifies (the reachability
  SC-007 depends on).
- **FR-014**: The Chunking step MUST offer at least two distinct chunking
  strategies (fixed-size word chunking and sentence-boundary chunking)
  as a learner-selectable toggle, applied to the same source document, so
  the resulting chunk boundaries are directly comparable. Sentence-
  boundary chunking MUST split the document into sentences first, then
  greedily group consecutive sentences into a chunk until adding the
  next sentence would exceed the chunk-size word count, then start a new
  chunk -- so the same chunk-size setting governs both strategies. The
  toggle MUST satisfy FR-011 (keyboard-operable, accessible name per
  option) and MUST communicate its currently-selected option to
  assistive technology via a selected-state attribute (e.g.
  `aria-pressed` or equivalent), not by color or label text alone.

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
  minutes without external instructions -- "external" meaning outside
  the running app itself (no README, docs site, or verbal walkthrough
  required); the app's own in-app Marginalia guidance is not external
  and is expected to be used, per Constitution Principle IV's guided-UI
  requirement.
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
  remain fully readable and operable at a 375px-wide viewport: no
  horizontal scroll of the page body, no clipped or truncated text
  (ellipsis or cutoff), and every interactive control has at least a
  44x44px touch target.
- **SC-005**: 100% of interactive controls -- the canonical set enumerated
  in FR-011, covering both the Pipeline Walkthrough and Compare Variants
  views identically -- are operable using keyboard navigation alone and
  carry an accessible name, verified by an automated accessibility check
  against WCAG 2.1 AA-aligned rules (the axe-core default ruleset).
- **SC-006**: Across ten repeated runs with the same document, chunk
  settings, and query -- using the "coffee" sample document ("Home
  Coffee Brewing Guide"), default settings (fixed-size chunking, chunk
  size 60, overlap 15, Top-K 3), and its first listed sample query --
  the retrieval ranking is byte-for-byte identical every time -- the
  pipeline's core teaching mechanism is deterministic, not flaky.
- **SC-007**: For the "coffee" sample document and its first listed
  sample query, a learner can find a similarity-threshold value (any
  value above that query's top-ranked chunk's score) that empties the
  retrieved set -- "no good match" is a reachable, demonstrable state,
  not merely an assertion in the marginalia text.
- **SC-008**: For the "coffee" sample document at chunk size 60
  (default), switching chunking strategy at that same size setting
  produces a measurably different set of chunk boundaries: the ordered
  list of chunk (start, end) word-index pairs differs in at least one
  chunk between the two strategies (not merely a different label on
  identical output).

## Assumptions

- No real embedding model or LLM API call is required or expected for
  Milestone 1 -- a disclosed, deterministic simulation is the intended
  design, not a placeholder awaiting a real integration (a real API can
  be wired in later at the documented seam without changing this
  milestone's success criteria).
- Sample documents and queries are hardcoded fixtures shipped with the
  app; user-uploaded or externally-fetched content is out of scope for
  Milestone 1. The two shipped documents are small by design (268 and
  220 words respectively, both under 300 words) -- this is a stated
  constraint on any future fixture additions, not an incidental property
  of today's content, and is what keeps SC-001's 2-minute target and
  SC-006's determinism trivially achievable, and every slider-drag
  recomputation (chunking, embedding, retrieval) synchronous and within
  a single rendered frame, without needing a separately stated numeric
  performance budget.
- Sentence-boundary chunking (FR-014) splits on a simple heuristic
  (`.`, `!`, or `?` followed by whitespace); it is verified correct only
  for the shipped sample documents, which contain no abbreviations or
  decimal numbers that would cause a false-positive split. Handling
  those cases correctly for arbitrary learner-supplied text is out of
  scope for Milestone 1, consistent with user-uploaded content being out
  of scope above.
- This is a single-user, client-side-only experience for Milestone 1: no
  backend service, database, authentication, or persistence is required.
- Target runtime is evergreen desktop and mobile browsers (latest two
  versions of Chrome, Firefox, Safari, and Edge); no legacy browser
  (e.g. Internet Explorer) support is required, consistent with the
  Next.js/React stack locked in tech-stack.md. FR-011's keyboard
  requirements rely on native `<input type="range">` Arrow-key behavior
  as shipped by these browsers, not a custom-implemented alternative --
  no additional cross-browser keyboard-behavior validation beyond this
  baseline is required.
- Announcing dynamic content changes (the chunk list updating as a
  slider drags, the retrieved list updating after a query) to
  screen-reader users via ARIA live regions is out of scope for
  Milestone 1's SC-005, which verifies keyboard reachability/operability
  and accessible names only -- not live-region announcement behavior.
  This is a possible future enhancement, not a currently specified
  requirement.
- Desktop is the primary target, but the layout must degrade usably (not
  merely "not break") down to a 375px-wide viewport (see SC-004 for the
  concrete pass/fail criteria at that width).
- A second concept module is not built in this milestone; User Story 4's
  contract is established and reviewable now, with full end-to-end
  verification deferred to the milestone that adds an actual second
  module.
