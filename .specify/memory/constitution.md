# Vectrix Constitution

An interactive, extensible playground for learning AI engineering
concepts hands-on -- starting with Retrieval-Augmented Generation, and
designed from the start to hold many more concepts without becoming a
pile of one-off pages.

## Core Principles

### I. Extensibility Is Structural, Not Aspirational
Every concept (RAG, and whatever comes after it) MUST satisfy a single
`ConceptModule` contract and be added to one central registry. No file
outside a concept's own folder may contain a conditional keyed on a
specific concept's id. "Domain-agnostic core, many configurations" is the
whole reason this is a platform instead of a single page, and it must be
true of the code, not just the pitch -- verified by an automated
regression check, not by memory or code review alone.

**Rationale**: A playground that requires editing core files to add a
new concept will, in practice, never get a second concept added. The
constraint has to be load-bearing from the first module, not retrofitted
once a second one is wanted.

### II. Never Blur Simulated Behavior With Real Model Behavior
Where the app simulates something a real embedding model or LLM would
normally do (the 2D embedding projection, a generated answer), the UI
MUST disclose, in plain sight, that this is a simplified simulation for
teaching -- never presented as if it were real model output. Code
comments alone do not satisfy this principle; the disclosure must be
visible to the person using the app.

**Rationale**: The entire point of this tool is building accurate
intuition about how these systems behave. A convincing-looking fake that
isn't labeled teaches the wrong lesson as confidently as a real one --
worse, actually, since the learner has no way to tell the difference.

### III. Every Interaction Teaches Something, Not Just Looks Interactive
A slider, chart, or toggle only earns a place in a module if moving it
changes something the learner is meant to understand -- retrieval ranking
shifting as Top-K changes, a fact splitting across a chunk boundary when
size shrinks. Interactivity added for its own sake, without a concept it
demonstrates, does not belong.

**Rationale**: This distinguishes a genuine playground from a dashboard
that merely looks like one. Every control should be answerable with "and
that teaches the learner ___."

### IV. Guided, Not Just Dense
Every interactive surface ships with adjacent, plain-language explanation
of what's happening and why -- not dense controls a learner has to
reverse-engineer. Numbered steps are used only where the underlying
process genuinely is sequential (e.g. the RAG pipeline); they are not
applied as decoration to content with no real order.

**Rationale**: This was an explicit, deliberate choice over a denser
playground.tensorflow.org-style "figure it out from the knobs" approach,
made when this project was scoped -- the guided style is a requirement,
not a stylistic default to revisit per module.

### V. Deterministic By Default
For a fixed input (document, chunk settings, query), every module's
output MUST be identical every time it runs -- no unseeded randomness in
any simulated behavior. Learners build intuition by changing one variable
at a time and observing the effect; a pipeline that produces different
results on identical inputs undermines that entirely.

**Rationale**: This is a teaching tool, not a product demo -- reproducibility
of "why did retrieval pick these chunks" matters more here than it would
in a system optimizing for perceived liveliness.

### VI. Spec Before Code, Same Discipline as Prior Work
No module's implementation begins without an approved `spec.md`, followed
by `plan.md` and `tasks.md`. This mirrors the discipline already applied
to this project's sibling effort (the Steward governed-text-to-SQL
platform) and exists for the same reason: catching real design gaps on
paper is cheaper than catching them after code exists.

**Rationale**: Consistency across projects lowers the cost of context-switching
and keeps the discipline itself from being treated as optional
per-project.

### VII. Accessible and Reduced-Motion by Default
Every interactive control must be operable via keyboard alone and carry
an accessible name. Any animation or transition must respect the user's
reduced-motion preference. This is a baseline requirement for every
module, not a follow-up task.

**Rationale**: A learning tool that only works for mouse users or that
ignores accessibility preferences excludes exactly the audience it's
trying to reach, and retrofitting accessibility is far more expensive
than building it in from the first module.

## Technology Constraints

Cross-module technology choices (framework, styling approach, chart
implementation, testing tools) are recorded in `tech-stack.md` at the
project root, not restated per-module. A `plan.md` that deviates from
`tech-stack.md` without first amending it fails the Constitution Check.

## Development Workflow

- `roadmap.md` at the project root records the milestone sequence and
  each milestone's definition of done. A milestone does not begin until
  the previous milestone's Success Criteria, as written in its `spec.md`,
  are met.
- `/speckit.analyze` MUST be run before `/speckit.implement` for every
  feature, and any flagged violation of this constitution MUST be
  resolved before implementation proceeds.
- Amendments to this constitution require a written rationale and a
  version bump below.

**Version**: 1.0.0 -- Ratified 2026-08-03
