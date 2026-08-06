# Feature Specification: Real Mode for the RAG Concept Module

**Feature Branch**: `002-real-mode`

**Created**: 2026-08-03

**Status**: Draft -- clarified 2026-08-05, `plan.md` drafted 2026-08-05,
checklist follow-up 2026-08-06 closed the remaining gaps in
`checklists/requirements.md` (27/27 complete). `plan.md` predates this
follow-up's FR-007/FR-009/FR-011/FR-015/SC-003/User-Story-3 changes and
needs a re-sync pass before `/speckit.tasks` runs.

**Input**: User description: "Opt-in Real Mode for the RAG concept module:
bring-your-own API key for real embeddings and generation, real document
input, executable RAG variants, and lightweight evaluation -- layered on
top of the existing Simulated Mode without replacing it"

## Clarifications

### Session 2026-08-05

- Q: Should this spec add an explicit accessibility requirement (FR +
  Success Criterion) covering Real Mode's new controls (toggle, key
  input, temperature slider, RAG-Fusion N control, HyDE count control,
  document textarea), the same way Milestone 1's spec.md called out
  FR-011/SC-005 for its own controls? → A: Yes -- add an explicit FR
  plus a corresponding Success Criterion, mirroring Milestone 1's
  precedent.
- Q: For Real Mode's custom document input, should the spec support only
  pasted text, or both paste and file upload (User Story 3's title said
  "paste or upload," while FR-005 only covered pasted text)? → A: Paste
  only -- narrow US3's title to match FR-005; file upload is out of
  scope for this milestone.
- Q: FR-011's recall@K evaluation doesn't say where K comes from --
  should it reuse the pipeline's existing Top-K retrieval slider, or is
  eval K a separate, independently-configured parameter? → A: Reuse the
  existing Top-K slider; K is not a separate eval-only parameter.
- Q: FR-010's "rough cost indication" doesn't say what it's based on --
  should this milestone show a static per-provider $ estimate, or call
  count only? → A: Call count only, no dollar figure; $ pricing is
  Milestone 4 scope.
- Q: FR-005 requires a "stated size limit" on pasted custom documents
  but doesn't give a number -- what should that limit be? → A: 10,000
  characters.

### Session 2026-08-05 (checklist follow-up)

- Q: Does Real Mode require exactly one provider to supply both
  embeddings and generation, or can a learner configure independent
  providers for each? → A: One provider, both capabilities -- a single
  key, single configured provider throughout; a provider lacking either
  capability isn't usable as Real Mode's configured provider.
- Q: Should Real Mode's multi-call sequences (HyDE's hypothesis
  generation, RAG-Fusion's per-variant embeddings) run serially or in
  parallel? → A: Serial -- each call completes before the next starts,
  so intermediate steps reveal progressively and mid-sequence failure
  handling stays unambiguous.
- Q: Should spec.md list the exact set of Real Mode API call types
  SC-004/SC-005 must cover, and define what counts as "one call" for
  FR-010/SC-008's estimates? → A: Yes -- FR-016 now enumerates the
  canonical call types and defines "one call" as one HTTP request
  regardless of batch size.
- Q: Should spec.md state the numeric ranges/defaults for temperature,
  RAG-Fusion's N, and HyDE's hypothesis count? → A: Yes -- temperature
  0.0-1.0 step 0.1 default 0.3; RAG-Fusion N 2-5 step 1 default 3; HyDE
  count 1-3 step 1 default 1.
- Q: Should FR-008 name the exact algorithms RAG-Fusion and HyDE use in
  Real Mode? → A: Yes -- RAG-Fusion uses Reciprocal Rank Fusion (already
  named in the existing explanatory copy); HyDE averages its hypothesis
  embeddings into one vector and retrieves once against that average.

### Session 2026-08-05 (checklist follow-up, continued)

- Q: What should happen when a learner's API key is rejected -- by the
  local format check or a failed live call -- for correcting and
  resubmitting it? → A: Persistent inline error, edit in place -- the
  input retains its value, shows a distinct error per rejection type,
  and blocks submission only until a format-valid key is entered.
- Q: When a learner toggles Real Mode off and back on within one
  session, should the disclaimer reappear, and are the disclosure
  captions guaranteed to always reflect current mode? → A: Both --
  disclaimer and captions reappear/refresh on every toggle, not just the
  first activation.
- Q: What specific, checkable criteria should SC-007 ("effectively
  stable") and SC-008 ("measurably different" ranking) use? → A:
  Byte-identical text for SC-007; at least the top-1 retrieved chunk
  changes for SC-008.
- Q: Should the evaluation feature add rules for expected-chunk
  selection, zero-pairs behavior, and a pair-count bound? → A: Yes, all
  three -- expected chunk picked from real chunks (no free text), zero
  pairs disables the run control, and a maximum of 10 pairs is enforced.
- Q: Should spec.md add a per-call timeout and an explicit
  CORS-support Assumption for the configured provider? → A: Yes, both --
  a 30-second per-call timeout (Edge Cases) and a load-bearing
  Assumption naming direct browser-origin support as required.

### Session 2026-08-06 (checklist follow-up, remaining items)

- Q: For a partial multi-call failure mid-sequence (HyDE/RAG-Fusion),
  does FR-007's retry option resume from only the failed call, or
  restart the entire sequence? → A: Resume from the failed call only --
  calls that already succeeded are not re-issued, since FR-008's serial
  execution makes it unambiguous exactly which calls completed before
  the failure.
- Q: Beyond stating whether GraphRAG/Self-RAG/Agentic RAG are executable
  (FR-009), what's the actual UI treatment for them in Real Mode? → A: A
  disabled "Run" affordance with an inline explanation ("Explanatory
  only this milestone") -- the control stays visible but inert, rather
  than disappearing or looking identical to Simulated Mode's version.
- Q: Does SC-003's 60-second window start at Real Mode toggle activation
  or at key submission? → A: At key submission -- the clock starts once
  a format-valid key is entered and the first real API call is
  triggered, since typing/pasting time isn't something the system
  controls.
- Q: Does FR-011's evaluation feature need a pre-execution call-count
  disclosure parallel to FR-010's? → A: Yes -- before running an
  evaluation, the system shows the estimated total call count for the
  full run (every `EvalPair` against every configuration tested), using
  the same FR-016 call definition as FR-010.
- Q: Is there an acceptance scenario for switching back to a sample
  document after a custom one was entered? → A: Yes -- add it as User
  Story 3 Acceptance Scenario 3, symmetric with the existing Edge Case
  that requires stale sample questions to be cleared in the other
  direction.
- Q: Does FR-015's accessible-name/keyboard-operability requirement
  extend to dynamic content -- the key-format-validation error and
  FR-007's failure banners? → A: Yes -- each error MUST be
  programmatically associated with the control it describes (or
  announced via a live region for banners not tied to a single
  control), not conveyed by visual styling alone.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle into Real Mode without losing the free experience (Priority: P1)

A learner who has already worked through Simulated Mode wants to see how
retrieval looks with a real embedding model instead of the teaching
simulation, without being forced to get an API key just to open the
module at all.

**Why this priority**: This is the gate every other Real Mode story sits
behind. If toggling breaks the zero-setup promise of Simulated Mode
(spec.md 001's SC-001), Real Mode has cost the project its most
important existing property to gain a new one.

**Independent Test**: Open the RAG module with no API key configured,
confirm Simulated Mode works exactly as it does today (spec.md 001
unaffected), then locate and activate a clearly labeled Real Mode
control and confirm the app asks for an API key only at that point, not
before.

**Acceptance Scenarios**:

1. **Given** a learner has never touched Real Mode, **When** they open
   the RAG module, **Then** the experience is pixel-for-pixel identical
   to Milestone 1's Simulated Mode -- no new prompts, no new required
   input.
2. **Given** a learner activates the Real Mode toggle, **When** no API
   key is yet configured, **Then** they see a single, clear prompt to
   supply one, with an explicit, plain-language statement of where that
   key is sent and where it is not stored, plus a disclaimer that
   entering any key into a browser-based app carries inherent risk this
   project cannot fully eliminate and that the learner does so at their
   own risk.
3. **Given** a learner has supplied a key and is in Real Mode, **When**
   they toggle back to Simulated Mode, **Then** the key is retained for
   the session (not re-requested) but no further real API calls are made
   until they toggle back.

---

### User Story 2 - See real embedding geometry instead of the simulation (Priority: P1)

A learner or practitioner wants the Embedding and Retrieval steps to plot
real embedding-model output, not the bag-of-words projection, so the
chart reflects genuine semantic geometry.

**Why this priority**: This is the single highest-value fidelity gap
identified against tools like RAGxplorer -- without it, Real Mode is a
label with nothing behind it for the chart itself.

**Independent Test**: With a real embeddings API key configured and Real
Mode active, run the pipeline against a sample document and confirm the
chart's coordinates are computed from actual returned embedding vectors
(projected to 2D), not from `mockEmbedding.ts`, and that this is visibly
disclosed as real (the inverse disclosure of Constitution Principle II).

**Acceptance Scenarios**:

1. **Given** Real Mode is active with a valid key, **When** the learner
   reaches the Embedding step, **Then** the chart is computed from a real
   embeddings API response and a label states this plainly (e.g. "Real
   embeddings via [provider]"), replacing Simulated Mode's "simplified
   for teaching" disclosure with its real-mode equivalent.
2. **Given** the embeddings API call fails (bad key, rate limit, network
   error), **When** the learner is in Real Mode, **Then** the app shows a
   clear, specific error and offers to fall back to Simulated Mode rather
   than silently showing stale or fabricated data.
3. **Given** real embedding vectors are higher-dimensional than the 2D
   chart, **When** they are projected for display, **Then** the
   projection method used is named in the UI (e.g. "PCA" or "UMAP"), so
   the learner understands the chart is a projection of something
   higher-dimensional, not the raw thing itself.

---

### User Story 3 - Use your own document and question (Priority: P2)

A practitioner wants to paste their own text and ask their own question,
instead of only the two built-in sample documents.

**Why this priority**: Necessary for Real Mode to be useful for actual
evaluation work, but depends on User Story 2's real embeddings existing
first -- real embeddings of a fixed sample document are a smaller,
safer slice to ship before opening up arbitrary user input.

**Independent Test**: In Real Mode, paste a custom document and a custom
question, and confirm chunking, embedding, and retrieval all run against
that content with no code path still silently using the built-in sample
documents.

**Acceptance Scenarios**:

1. **Given** Real Mode is active, **When** the learner pastes their own
   document text, **Then** the Document step accepts it and every
   downstream step (Chunking, Embedding, Retrieval, Generation) uses it
   in place of the sample documents.
2. **Given** a pasted document exceeds 10,000 characters, **When** the
   learner submits it, **Then** the app rejects it with a clear message
   stating the limit, rather than silently truncating it or sending an
   oversized request to the API.
3. **Given** a learner has replaced a sample document with a custom one,
   **When** they switch back to a sample document, **Then** the custom
   document and question are cleared and the sample document's own
   question set is restored, rather than leaving the custom text mixed
   with sample-document state.

---

### User Story 4 - Get a real generated answer (Priority: P2)

A learner wants the Generation step's answer to come from an actual LLM
call using the real retrieved context, replacing the templated
Simulated-Mode summary.

**Why this priority**: Completes the pipeline's fidelity, but is scoped
below embeddings (User Story 2) because a real embedding chart is the
more novel, more differentiating capability -- a real generated answer is
valuable but conceptually less surprising to a learner who's already seen
real retrieval work.

**Independent Test**: With Real Mode active end-to-end, confirm the
prompt shown in the Generation step is sent to a real model and the
displayed answer is that model's actual response, clearly labeled as
real, not simulated.

**Acceptance Scenarios**:

1. **Given** Real Mode is active with retrieval results available,
   **When** the learner reaches the Generation step, **Then** an actual
   model call is made using the exact assembled prompt shown, and the
   label reads "Real answer via [provider]" in place of Simulated Mode's
   "Simulated, not a real model call" caption.
2. **Given** the generation API call fails, **When** the learner is in
   Real Mode, **Then** the failure is shown clearly with the option to
   retry or fall back to Simulated Mode's templated summary, explicitly
   labeled as a fallback if used.
3. **Given** Real Mode is active, **When** the learner adjusts a
   temperature control and re-runs generation twice at a high
   temperature setting with the exact same prompt, **Then** the two
   answers may differ in wording; **When** they instead run it twice at
   the lowest available temperature, **Then** the two answers are
   effectively stable -- the parameter's effect on output is directly
   observable within the session, not only described in prose.

---

### User Story 5 - Run a RAG variant for real, not just read about it (Priority: P2)

A practitioner who understands naive RAG wants to actually execute HyDE
or RAG-Fusion against their own document and see the real difference in
retrieved results, not just read the static flow-diagram explanation from
Milestone 1's Compare Variants view.

**Why this priority**: This is the single biggest lever for making an
expert take the tool seriously, per the earlier gap analysis -- but it
depends on User Stories 2-4 all existing first, since executing a variant
means running real embedding, retrieval, and generation calls in a
specific sequence.

**Independent Test**: In Real Mode, select HyDE from Compare Variants,
provide a document and question, and confirm the app actually generates
a hypothetical answer, embeds it, retrieves against it, and shows a
real, executed result -- distinct from naive RAG's result for the same
question -- rather than only showing the static explanatory flow diagram.

**Acceptance Scenarios**:

1. **Given** Real Mode is active, **When** the learner selects HyDE and
   runs it against a question, **Then** the intermediate hypothetical
   answer is shown before the final retrieval results, so the learner can
   see the extra step actually happening, not just executing invisibly.
2. **Given** Real Mode is active, **When** the learner selects RAG-Fusion
   and runs it, **Then** each generated query variant and its own
   retrieved ranking is shown before the fused final ranking, so the
   fusion step is inspectable rather than a black box.
3. **Given** a variant that requires more API calls than naive RAG
   (HyDE, RAG-Fusion), **When** the learner is about to run it, **Then**
   an estimated call count is shown before the calls are made, not only
   after (call count only -- no dollar estimate this milestone; see
   FR-010).
4. **Given** GraphRAG, Self-RAG, or Agentic RAG are selected in Real
   Mode, **When** the learner tries to run them, **Then** the app is
   explicit about which of these are actually executable in this
   milestone versus which remain explanatory-only (see Assumptions) --
   never implying a variant ran for real when it didn't.
5. **Given** RAG-Fusion is selected, **When** the learner raises the
   number of generated query variants (N), **Then** the estimated call
   count from Scenario 3 updates accordingly, and re-running with a
   different N produces a visibly different fused ranking for at least
   one shipped sample question -- N is a real parameter with a real
   effect, not a fixed constant dressed up as adjustable.
6. **Given** HyDE is selected and configured to generate more than one
   hypothetical answer, **When** the learner raises that count, **Then**
   each hypothetical answer is shown individually (not only an averaged
   result), so the learner can see how the hypothetical answers agree or
   disagree with each other before retrieval runs.

---

### User Story 6 - See a lightweight real evaluation, not just a vibe (Priority: P3)

A practitioner wants a basic precision/recall or faithfulness signal
against a small set of question/expected-chunk pairs they define, to
compare naive RAG against a variant with an actual number instead of
just eyeballing the results.

**Why this priority**: Valuable but the smallest slice of the fidelity
gap relative to build cost -- closes the gap with Google's rag-playground
partially, without needing its full evaluation-framework scope.

**Independent Test**: Define a small set of (question, expected chunk)
pairs in Real Mode, run naive RAG and one variant against all of them,
and see a simple recall@K number for each, side by side.

**Acceptance Scenarios**:

1. **Given** the learner has defined at least one (question, expected
   chunk) pair, **When** they run an evaluation, **Then** a recall@K
   score is shown per configuration tested, computed transparently (the
   method is named in the UI, e.g. "recall@3: expected chunk appears in
   top 3 results").

---

### Edge Cases

- What happens if a learner activates Real Mode, supplies a key, then
  closes the tab? (Key must not persist beyond the session/browser
  storage the learner explicitly controls -- see Requirements on key
  handling.)
- What happens if the pasted custom document contains no content
  relevant to the sample questions carried over from Simulated Mode?
  (Sample questions must be cleared or clearly marked stale when a
  custom document replaces the sample one.)
- What happens when a variant's real execution produces an error partway
  through a multi-call sequence (e.g. RAG-Fusion's third of five query
  variants fails)? (Calls within a sequence MUST run serially, one at a
  time, not in parallel -- so "fail closed" is unambiguous: no later call
  in the sequence has been issued yet when the failure is detected. Must
  fail closed with a clear partial-failure message, not silently proceed
  with incomplete results presented as complete.)
- How does the app behave if a learner enables Real Mode on a
  network-restricted machine that can't reach the configured API at all?
  (Must degrade to a clear connectivity error, with the Simulated Mode
  fallback still available.)
- What happens if a learner submits a key that's obviously the wrong
  shape for the single configured provider -- does the app validate key
  format before making a real call, or only discover an invalid key via
  a failed request? (Should validate obviously-malformed keys before
  spending a real API call.)
- What happens if a learner sets temperature to its lowest value
  expecting perfectly deterministic output, but the configured
  provider's API is not perfectly deterministic even at that setting?
  (The UI must disclose that near-zero temperature means "very
  consistent," not "guaranteed identical," rather than overpromising a
  guarantee Real Mode cannot make -- this is a known real-world provider
  characteristic, not a bug to engineer around.)
- What happens to the Embedding/Generation steps' disclosure captions
  and the key-entry disclaimer when a learner toggles Real Mode off and
  back on within one session? (Both MUST refresh on every toggle -- the
  disclaimer reappears each activation and the disclosure captions are
  always derived from current mode state, per FR-003/FR-004/FR-006 --
  so no stale simulated-vs-real caption can survive a mode switch, the
  same class of defect spec.md 001 found and fixed for its
  chunking-strategy switch.)
- How long should the app wait for a single Real Mode API call before
  giving up? (Each call MUST time out after 30 seconds and surface
  FR-007's error-and-fallback handling if exceeded -- consistent with
  SC-003's 60-second budget for the first single-call embedding chart,
  scaled per-call rather than per-sequence since HyDE/RAG-Fusion
  sequences have no fixed total call count.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT require an API key, real document, or
  any Real Mode setup to use Simulated Mode -- Milestone 1's zero-setup
  experience (spec.md 001) MUST remain fully intact and unaffected by
  this feature's existence.
- **FR-002**: The system MUST provide a single, clearly labeled control
  to toggle Real Mode on or off, visible from within the RAG module.
- **FR-003**: The system MUST request exactly one API key, for a single
  configured provider that supplies both embeddings and generation (not
  two independently-configured providers), only at the point Real Mode
  is first activated within a session (not re-requested on a later
  re-toggle within the same session, per User Story 1 Scenario 3), MUST
  state in plain language where the key is sent (directly from the
  browser to the configured provider) and where it is not stored (never
  sent to or persisted by any server this project controls, since
  Milestone 1-2 remain backend-free per tech-stack.md), MUST validate
  obviously malformed keys before making a real API call, and MUST
  display a disclaimer, alongside that statement, that browser-based key
  entry carries inherent risk (e.g. a compromised browser extension with
  page access) this project's design cannot fully eliminate, and that
  the learner uses Real Mode at their own risk. Unlike the key itself,
  this disclaimer MUST be shown every time Real Mode is activated within
  a session (every toggle-on), not only the first. If a key is rejected
  -- by the local format check or by a failed live call -- the input
  MUST retain the entered value (not clear it), show an inline error
  explaining why (malformed-shape and live-rejection MUST use distinct
  wording), and block submission only until a key passing the format
  check is entered, so the learner corrects and resubmits in place
  rather than restarting the whole activation flow.
- **FR-004**: The Embedding and Retrieval steps, when Real Mode is
  active, MUST use a real embeddings API response for chart coordinates
  and similarity scoring, MUST name both the provider and the
  dimensionality-reduction method used for the 2D projection in the UI,
  and MUST visibly disclose this as real, mirroring (not just removing)
  Simulated Mode's disclosure requirement from Constitution Principle II.
  This disclosure MUST be derived from the currently active mode on
  every render, never a value carried over from before a mode toggle, so
  switching modes mid-session can never leave a stale simulated-vs-real
  caption visible (Edge Cases).
- **FR-005**: The system MUST let a learner replace the built-in sample
  document and questions with pasted custom text and a custom question in
  Real Mode, subject to a 10,000-character limit enforced before any API
  call is made.
- **FR-006**: The Generation step, when Real Mode is active, MUST send
  the exact displayed assembled prompt to a real model and display its
  actual response, labeled as real. Like FR-004, this label MUST be
  derived from the currently active mode on every render, never carried
  over from before a mode toggle.
- **FR-007**: Any Real Mode API failure (embeddings, generation, or a
  variant's intermediate call) MUST surface a clear, specific error and
  MUST offer an explicit fallback to Simulated Mode -- never silently
  substituting simulated output while implying it is real. For a
  failure partway through a multi-call sequence (HyDE, RAG-Fusion), the
  retry option MUST resume from only the failed call, re-using the
  results already obtained from calls that succeeded earlier in that
  sequence, rather than restarting and re-incurring cost for calls that
  already completed.
- **FR-008**: HyDE and RAG-Fusion MUST be genuinely executable in Real
  Mode, with each variant's intermediate steps (HyDE's hypothetical
  answer; RAG-Fusion's per-variant queries and rankings before fusion)
  visibly surfaced, not hidden behind a single opaque "run" action.
  RAG-Fusion MUST fuse its per-variant rankings via Reciprocal Rank
  Fusion (the method already named in the Compare Variants explanatory
  copy for this variant, so Real Mode's execution cannot silently use a
  different method than what's taught). HyDE MUST combine its M
  hypothesis embeddings by averaging them into a single vector and
  retrieving once against that average, not by retrieving once per
  hypothesis. Calls within a variant's sequence MUST run serially (one at
  a time), not in parallel, so each intermediate step can be revealed
  progressively as its own call completes, and so a mid-sequence failure
  (Edge Cases) always occurs before any later call has been issued.
- **FR-009**: For GraphRAG, Self-RAG, and Agentic RAG, the system MUST
  clearly state in the UI whether each is executable in this milestone
  or remains explanatory-only (per Assumptions below), and MUST NOT let a
  learner run one expecting real execution if it isn't implemented yet.
  In Real Mode specifically, each of these three variants' "Run"
  affordance MUST remain visible but disabled, with an inline
  explanation (e.g. "Explanatory only this milestone") -- not removed
  outright and not left visually identical to Simulated Mode's version,
  so the learner sees explicitly why it can't be run rather than
  wondering why the control is missing or inert.
- **FR-010**: Before executing any variant requiring more than one
  embedding/generation call (HyDE, RAG-Fusion), the system MUST show an
  estimated call count to the learner before making any of those calls,
  using "call" as defined in FR-016.
  This milestone shows call count only, with no dollar-cost estimate --
  a static per-provider pricing table and $-denominated cost tracking
  are Milestone 4 scope (`specs/004-real-mode-depth/spec.md`), not
  duplicated here.
- **FR-011**: The system MUST let a learner define up to 10 (question,
  expected chunk) pairs -- a cap enforced to keep each evaluation run's
  real API cost bounded and predictable -- and compute a recall@K score,
  with the scoring method named in the UI, for naive RAG and at least
  one executable variant, shown side by side. K MUST be the same Top-K
  value currently set on the pipeline's Retrieval step (spec.md 001's
  Top-K slider), not a separate eval-only parameter -- so changing Top-K
  visibly changes the recall@K score, directly demonstrating the
  relationship between the two. Each pair's "expected chunk" MUST be
  selected from the active document's actual chunk list (a picker, not
  free text), so a pair can never be silently unscoreable due to a
  mistyped reference. Attempting to run an evaluation with zero pairs
  defined MUST be disabled, with an explanatory message, rather than
  silently producing an empty or broken result. Before executing an
  evaluation run, the system MUST show an estimated total call count for
  the full run (every `EvalPair` against every configuration tested),
  using "call" as defined in FR-016 -- the same pre-execution disclosure
  FR-010 requires for HyDE/RAG-Fusion, not a scope limited to variant
  execution alone.
- **FR-012**: The Generation step, when Real Mode is active, MUST expose
  a learner-adjustable temperature control ranging 0.0-1.0 in steps of
  0.1, default 0.3, that is passed through to the real model call.
- **FR-013**: RAG-Fusion's number of generated query variants (N) MUST be
  a learner-adjustable parameter ranging 2-5 in steps of 1, default 3
  (not a fixed constant), with the estimated-call-count disclosure from
  FR-010 updating live as N changes.
- **FR-014**: HyDE MUST support generating more than one hypothetical
  answer when configured to do so, via a learner-adjustable count ranging
  1-3 in steps of 1, default 1, with each generated hypothetical answer
  individually visible to the learner, not only a single averaged
  result.
- **FR-015**: Every new Real Mode control (the Real Mode toggle, the API
  key input, the temperature control, RAG-Fusion's N control, HyDE's
  hypothetical-answer-count control, and the custom document/question
  input) MUST be operable via keyboard alone and MUST have an accessible
  name that describes its specific effect, matching the standard set by
  spec.md 001's FR-011 rather than introducing a lower bar for
  Real-Mode-only controls. This extends to the dynamic content those
  controls produce: the key-format-validation error (FR-003) MUST be
  programmatically associated with the key input it describes, and
  FR-007's failure banners MUST be announced via a live region, so an
  assistive-technology user is not only aware of these errors visually.
- **FR-016**: "A call," for FR-010's estimate and SC-004/SC-005/SC-008's
  measurement, means one HTTP request to the configured provider,
  regardless of how many texts are batched into it (e.g. embedding all
  of a document's chunks in one batched request is one call, not one per
  chunk). The canonical call types this applies to are: corpus-embed,
  query-embed, hypothesis-embed, variant-embed, hypothesis-generate,
  variant-query-generate, final-generate, and eval-retrieve (which itself
  triggers no new call beyond whichever of the above the selected
  configuration already requires). SC-004's "100% of failure paths" and
  SC-005's "100% of intermediate execution steps" are scoped to exactly
  this list.

### Key Entities *(include if feature involves data)*

- **RealModeSession**: whether Real Mode is active, the single
  configured provider (which MUST supply both embeddings and
  generation -- not two independently-configured providers) and
  (session-only, non-persisted) API key for that provider, scoped to the
  current browser session only.
- **RealEmbeddingResult**: a chunk or query's real embedding vector (as
  returned by the configured provider) plus its projected 2D point and
  the named projection method, replacing `EmbeddedPoint` in Real Mode.
- **VariantExecutionTrace**: the ordered, inspectable intermediate
  outputs of an executed variant (e.g. HyDE's one-or-more hypothetical
  answers; RAG-Fusion's per-variant queries and rankings, and the N used
  to produce them), shown to the learner rather than only the final
  result.
- **EvalPair**: a learner-defined (question, expected chunk) pair used to
  compute recall@K -- up to 10 per document, with "expected chunk"
  selected from the active document's real chunk list, not free text
  (FR-011).
- **GenerationParams**: the learner-adjustable real-generation settings
  (temperature; RAG-Fusion's N; HyDE's hypothetical-answer count) that
  are passed through to real API calls and must be visible alongside
  their resulting output, not hidden as internal constants.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Simulated Mode's existing Milestone 1 success criteria
  (spec.md 001, SC-001 through SC-008 -- updated count reflects the
  similarity-threshold and chunking-strategy additions made alongside
  this feature) remain met, unmodified, with Real Mode present but
  inactive -- verified by re-running Milestone 1's full
  acceptance-scenario suite after this feature ships.
- **SC-002**: A learner who has never used Real Mode is not prompted for
  an API key, custom document input, or any Real-Mode-specific input at
  any point while using Simulated Mode.
- **SC-003**: With a valid API key configured, a learner can go from
  submitting that key (the moment a format-valid key is entered and the
  first real API call is triggered -- not from Real Mode toggle
  activation, since typing/pasting time isn't system-controlled) to
  seeing a real, disclosed-as-real embedding chart in under 60 seconds.
- **SC-004**: 100% of Real Mode API failure paths, scoped to FR-016's
  canonical call-type list, result in a specific visible error and a
  working fallback to Simulated Mode -- verified by deliberately
  triggering each failure path (invalid key, simulated network failure,
  rate limit response) in testing.
- **SC-005**: For HyDE and RAG-Fusion specifically, 100% of their
  intermediate execution steps, scoped to FR-016's canonical call-type
  list, are visible in the UI during a real run, not only the final
  retrieved result.
- **SC-006**: No API key is present in any request, log, or storage
  location controlled by this project outside the learner's own browser
  session -- verified by inspecting network requests and confirming no
  first-party server receives or logs the key (consistent with
  Milestone 1-2 remaining backend-free per tech-stack.md).
- **SC-007**: For at least one shipped sample question, running real
  generation twice at a high temperature setting produces two
  observably different answers, while running it twice at the lowest
  available temperature produces byte-identical text -- the strict,
  checkable bar for "effectively stable" -- the temperature parameter's
  effect is empirically demonstrated within a session, not merely
  asserted.
- **SC-008**: For at least one shipped sample question, changing
  RAG-Fusion's query-variant count (N) changes at least the top-1
  (highest-ranked) retrieved chunk in the fused ranking -- the checkable
  bar for "measurably different" -- and the estimated-call-count shown
  to the learner before execution matches the actual number of calls
  made.
- **SC-009**: Every new Real Mode control (FR-015) is reachable and
  operable via keyboard alone and exposes an accessible name -- verified
  by the same class of automated check used for spec.md 001's SC-005,
  extended to cover Real Mode's controls.

## Assumptions

- Real Mode remains entirely client-side: API calls go directly from the
  learner's browser to their configured provider, with no backend of
  this project's in between, consistent with tech-stack.md's current
  scope. A backend proxy (e.g. to avoid exposing keys in client-side
  network traffic) is explicitly out of scope for this milestone and
  would need its own spec if a concrete need for it emerges later.
- This entire client-only architecture depends on the configured
  provider supporting direct browser-origin (CORS) requests -- this is a
  load-bearing assumption, not an incidental detail; a provider that
  doesn't support this isn't usable as Real Mode's configured provider
  without the backend proxy explicitly ruled out above, so any future
  provider swap MUST be checked against this before being adopted. This
  extends spec.md 001's evergreen-browser Assumption (written before any
  real network call existed) to specifically cover cross-origin `fetch`
  behavior: the learner's browser itself must permit the cross-site
  request to the provider's API (some browsers apply stricter
  cross-site request handling than others), not just the provider's
  server accepting it.
- Of the six variants in Compare Variants, only naive RAG, HyDE, and
  RAG-Fusion are made genuinely executable in this milestone. GraphRAG
  (requires offline graph construction), Self-RAG (requires a
  self-critique loop), and Agentic RAG (requires a bounded agentic loop,
  which per this project's own roadmap is treated as a substantial
  capability in its own right) remain
  explanatory-only in Real Mode until a future milestone -- this is a
  deliberate scope boundary, not an oversight, and FR-009 requires the UI
  to say so plainly.
- The embeddings and generation providers supported are left
  unspecified in this spec and are a `/speckit.plan`-level decision, to
  be recorded in tech-stack.md once chosen.
- Cost to the learner for real API usage is the learner's own
  responsibility; this project does not proxy, subsidize, or cap
  spending beyond showing estimated call counts before execution
  (FR-010).
- This milestone does not require its own backend, database, or
  authentication -- it extends the existing client-only architecture
  rather than introducing server-side infrastructure.
