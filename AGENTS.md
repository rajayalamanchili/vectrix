<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vectrix

An interactive, extensible playground for learning AI engineering
concepts hands-on. See @constitution.md (at `.specify/memory/constitution.md`)
for governing principles, @roadmap.md for the milestone sequence and each
milestone's definition of done, and @tech-stack.md for locked technology
decisions.

## How to work in this repo

- **This is spec-driven, per Constitution Principle VI.** No new
  concept module's implementation begins without an approved `spec.md`
  under `specs/<feature-name>/`, followed by `plan.md` and `tasks.md`.
  Milestone 1 (`specs/001-core-platform-rag-module/`) was prototyped
  before the spec was formally written — see roadmap.md's "A note on
  sequencing" — but every milestone from here forward should not repeat
  that shortcut.
- **Always run `/speckit.analyze` before `/speckit.implement`.** Report
  what it flags against `constitution.md`; don't silently proceed past a
  flagged violation.
- **Check `roadmap.md` before starting work.** It's the source of truth
  for milestone order and dependencies, since that order has already
  changed twice as scope was added (Real Mode, then Parameter
  Exploration & Sharing and Real Mode Depth) — don't assume a milestone
  number from an earlier conversation or an older mental model is still
  correct without checking the file. Milestone 1's own Definition of
  Done gaps are the first thing to close regardless of what's added
  later — specifically the automated checks for SC-002 (zero
  cross-module conditionals), SC-003 (simulated-behavior disclosure),
  and SC-005 (keyboard accessibility), which do not exist yet as of this
  writing.
- **`tech-stack.md` is locked, not a suggestion.** Don't introduce a
  charting library, state management library, or alternate styling
  approach without first updating `tech-stack.md` and stating why.

## Non-negotiable engineering rules (see constitution.md for full rationale)

- **Never blur simulated AI behavior with real model behavior**
  (Constitution Principle II). The embedding projection and the
  generated answer are both deliberately simplified simulations — any
  UI surface showing their output must visibly disclose that, not bury
  it in a code comment.
- **Extensibility is structural** (Constitution Principle I). If you
  find yourself writing `if (concept.id === "rag")` — or the equivalent
  for any concept — anywhere outside that concept's own folder, stop:
  that's the exact anti-pattern this architecture exists to prevent.
- **Deterministic by default** (Constitution Principle V). No unseeded
  randomness in any simulated behavior — the same document, chunk
  settings, and query must always produce the same retrieval ranking.
- **Every control must teach something** (Constitution Principle III).
  Don't add a slider, toggle, or chart because it looks interactive;
  be able to say what it demonstrates.
- **Accessible and reduced-motion by default** (Constitution Principle
  VII). Every new interactive control needs an accessible name and
  keyboard operability from the start, not as a follow-up pass.

## When something seems ambiguous or underspecified

Prefer surfacing the ambiguity and proposing `/speckit.clarify` over
guessing and implementing, especially for anything touching the
`ConceptModule` contract itself (changing it later means touching every
existing module) or the disclosure language for simulated behavior.

## Useful context for any session

- Milestone 1 shipped one concept module: RAG, with two views (Pipeline
  Walkthrough, Compare Variants). See
  `specs/001-core-platform-rag-module/spec.md` for full scope and
  acceptance scenarios.
- The known, tracked gaps in Milestone 1 as of this writing: no
  automated test for SC-002/SC-003/SC-005 yet (currently true "by
  inspection," not by a regression-proof check), and SC-006
  (determinism across ten repeated runs) hasn't been explicitly
  re-verified since the last code change. Treat these as the first
  backlog items, not as already-closed.

