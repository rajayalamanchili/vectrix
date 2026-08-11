# Quickstart: Validating Agents & Tool Use

**Feature**: `005-agents-tool-use` | **Date**: 2026-08-11

## Prerequisites

```bash
npm install
npm run dev   # http://localhost:3000
```

No API key, no Real Mode -- this module is Simulated Mode only (spec.md
Assumptions). Nothing here requires network access.

## 0. Regression pass (run first)

With this feature's own controls untouched, re-run
`specs/001-core-platform-rag-module/quickstart.md` through
`specs/004-real-mode-depth/quickstart.md`'s scenarios and `npm run
check:all` as it existed before this feature. Confirm the RAG module's
behavior is byte-for-byte unchanged, and confirm the home page now shows
**two** concept cards (RAG, Agents & Tool Use) -- this is the first real
test of `check:extensibility`'s registry-uniqueness rule and the shared
home-page/route code against more than one entry.

## Manual scenario validation (spec.md User Stories 1-3)

1. **US1 clean tool match** (Acceptance Scenario 1) -- from the home
   page, open "Agents & Tool Use," and pick the sample question "What is
   128 divided by 4?" Confirm you see, as separate legible steps: an
   initial reasoning step naming Calculator and why, a tool-call step, an
   observation step showing `32`, and a final answer stating "128 / 4 =
   32."
2. **US1 no-tool-fits question** (Acceptance Scenario 2) -- pick "What's
   the weather like on Mars today?" Confirm the agent shows an explicit
   "no tool needed, answering directly" reasoning step (as visible/
   legible as a tool-call step would be) and still produces a final
   answer -- never a blank state.
3. **US1 determinism** (Acceptance Scenario 3) -- run the division
   question three times in a row without changing anything. Confirm the
   step sequence and its text are identical every time.
4. **US1 custom question** (Acceptance Scenario 4) -- type your own
   question (e.g. "Convert 12 kg to lb") into the custom-question input
   and run it. Confirm it produces a real step sequence and final
   answer, routed through the same engine as the sample questions.
5. **US2 disable the used tool** (Acceptance Scenario 1) -- with the
   division question's run visible (Calculator was used), disable
   Calculator, then re-run the identical question. Confirm the agent
   either falls back to a direct answer or picks a different tool, and
   the step sequence visibly changes from step 1's run.
6. **US2 disable every tool** (Acceptance Scenario 2) -- disable all
   three tools and run any question. Confirm the agent always falls back
   to a direct answer (never an error), with the "no tools available"
   condition shown plainly.
7. **US2 re-enable returns to the original path** (Acceptance Scenario
   3) -- re-enable Calculator, re-run the division question, and confirm
   the step sequence matches step 1's run exactly again.
8. **US3 all three strategies rendered together** (Acceptance Scenario
   1) -- open Compare Strategies with a question selected. Confirm all
   three strategies (Direct Answer, Single Tool Call, Multi-Step
   Reasoning Loop) each show their own step flow plus a plain-language
   problem/trade-off explanation.
9. **US3 added cost is legible, not hidden** (Acceptance Scenario 2) --
   with the division question selected (a single tool call answers it
   completely), confirm Multi-Step Reasoning Loop reaches the same final
   answer but visibly takes more steps than Single Tool Call (the extra
   "double-checking" verify step) -- not silently identical, and not a
   fabricated different answer.
10. **SC-007: a concrete divergence between strategies, no-fit question**
    -- with the "no-fit" ("What's the weather like on Mars today?")
    sample question selected in Compare Strategies (default toolbox,
    independent of whatever US2 last left disabled), confirm Multi-Step
    Reasoning Loop's panel alone shows a distinct "gave up" outcome,
    while Direct Answer and Single Tool Call both still show a completed
    (if low-confidence) final answer.
11. **Edge Case: switching sample questions mid-walkthrough resets
    state** -- start the division question's walkthrough, then switch to
    a different sample question before finishing. Confirm the step
    position/results reset (mirrors the RAG module's own document-change
    invalidation rule).
12. **FR-009: disclosure is visible, not just in source** -- on both
    views, confirm a plainly-worded "this is a simplified simulation,
    not a real model" disclosure is visibly rendered (not only present as
    a code comment) -- Constitution Principle II.
13. **FR-010: keyboard operability** -- using only the keyboard (Tab,
    Shift+Tab, Enter/Space, Arrow keys where applicable), reach and
    operate every sample-question chip, the custom-question input, every
    tool toggle, and the view-tab switcher on both views. Confirm each
    control's accessible name is specific to that control (e.g. each
    tool's toggle names that tool, not a generic "Toggle").

## Automated checks (this feature's additions to `npm run check:all`)

```bash
npm run check:agents-tool-use
# = tsx scripts/checks/agent-determinism.ts
#   && tsx scripts/checks/agent-tool-toggle-effect.ts
#   && playwright test tests/agents-tool-use/
```

- `agent-determinism.ts` (SC-003) -- runs the division sample question
  through `single-tool-call` ten times, asserts every run's `AgentRun`
  (including step text) is identical.
- `agent-tool-toggle-effect.ts` (SC-002) -- runs the division question
  with Calculator enabled, then disabled, asserts the step sequences
  differ and Calculator is never called in the second run.
- `tests/agents-tool-use/walkthrough.spec.ts` (SC-001) -- a fresh page
  load through a complete sample-question run, no setup needed.
- `tests/agents-tool-use/strategy-comparison.spec.ts` (SC-007) -- the
  "no-fit" question's three-way divergence (scenario 10 above),
  verified in the browser.
- `check:disclosure` (extended, SC-004) and `check:a11y` (extended via
  the new `tests/a11y/agents-tool-use.spec.ts`, SC-005) run under their
  existing commands -- no new npm script needed for either.
- `check:extensibility` (unmodified, SC-006) -- passes against the
  now-two-entry registry; see `contracts/concept-module-contract.md`.

See `contracts/tool-engine-contract.md` and
`contracts/automated-checks-contract.md` for the exact function
signatures and check assertions above exercise.
