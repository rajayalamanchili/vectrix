# Contract: Milestone 5 automated checks (SC-001 through SC-007)

**Status**: New, this plan, following the same "standalone script/spec,
pass/fail exit code, independently runnable" shape
`001-core-platform-rag-module/contracts/automated-checks-contract.md`
established. SC-006 is verified by an existing, unmodified check
(`check:extensibility`) -- see `concept-module-contract.md`.

## `check:disclosure` (extended) -- SC-004

- **Input**: `AgentWalkthrough` rendered via `renderToStaticMarkup` with
  a fixture question and the default toolbox; `StrategyComparison`
  rendered the same way with a fixture question.
- **Rule**: fail if `AgentWalkthrough`'s rendered markup is missing a
  non-empty `data-simulated-disclosure="true"` element, OR if any of
  `StrategyComparison`'s three strategy panels (identified by
  `data-strategy-panel="<strategyId>"`) is missing its own non-empty
  `data-simulated-disclosure="true"` element.
- **Exit code**: `0` = both surfaces (all four disclosure elements
  combined) present and non-empty. `1` = at least one missing/empty,
  printed per surface.
- **Supports**: SC-004, FR-009, Constitution Principle II. Reuses
  `simulated-disclosure.ts`'s existing `checkSurface` helper --
  research.md's "Disclosure marker granularity" decision.

## `check:agents-tool-use` -- `scripts/checks/agent-determinism.ts` (SC-003)

- **Input**: the shipped `"division"` sample question
  (`SAMPLE_QUESTIONS`), `single-tool-call` strategy, default toolbox.
- **Rule**: run `runSingleToolCall(question, DEFAULT_TOOLBOX)` ten
  times; fail if any run's `AgentRun` (deep-compared, including every
  step's `content`) differs from run 1's.
- **Exit code**: `0` = all ten runs identical (SC-003 satisfied). `1` =
  at least one run diverged, printed with the diverging run index and
  the first differing step.
- **Supports**: SC-003, Constitution Principle V.

## `check:agents-tool-use` -- `scripts/checks/agent-tool-toggle-effect.ts` (SC-002)

- **Input**: the shipped `"division"` sample question (whose
  `expectedToolId` is `"calculator"`), `single-tool-call` strategy, run
  once with the default toolbox and once with `"calculator"` filtered
  out.
- **Rule**: fail if the two resulting `AgentRun.steps` are deep-equal
  (i.e. disabling the tool the agent would otherwise use produced no
  observable change) or if the second run still contains a
  `tool-call` step with `toolId === "calculator"`.
- **Exit code**: `0` = the step sequence visibly differs, and the
  disabled tool is never called (SC-002 satisfied against a live run of
  the real engine, not a stored expectation). `1` = otherwise, printed
  with both runs' step sequences.
- **Supports**: SC-002, FR-004.

Both of the above are bundled as:

```jsonc
// package.json
"check:agents-tool-use": "tsx scripts/checks/agent-determinism.ts && tsx scripts/checks/agent-tool-toggle-effect.ts && playwright test tests/agents-tool-use/"
```

## `check:a11y` (extended) -- `tests/a11y/agents-tool-use.spec.ts` (SC-005)

Same file-glob mechanism as every prior milestone's a11y spec -- no
`package.json` change needed beyond this new file existing under
`tests/a11y/`, since `check:a11y` already runs `playwright test
tests/a11y/`.

- **Input**: the running app at `/concepts/agents-tool-use`.
- **Rule**: fail if any control this module introduces -- the
  sample-question chips, the custom-question text input, each tool's
  enable/disable toggle, and the view-tab switcher (Walkthrough /
  Compare Strategies) -- fails any of:
  - (a) `Tab` cannot reach it in DOM order;
  - (b) it lacks a visible focus indicator (reuses the platform's
    existing global focus-indicator style, `roadmap.md`'s Phase 6.5
    work -- no new CSS expected);
  - (c) `Enter`/`Space` does not activate a focused button/toggle/chip;
  - (d) `@axe-core/playwright` reports it missing an accessible name, or
    the name is generic/shared across same-type controls (e.g. every
    tool toggle must be individually named by tool, not "Toggle") --
    FR-010's "distinct from any other control on the same view";
  - (e) `@axe-core/playwright`'s default ruleset reports any other WCAG
    2.1 A/AA violation on either view.
- **Exit code**: `0` = every introduced control passes (a)-(e) (SC-005
  satisfied). `1` = any control fails, printed with its selector and the
  failing rule letter.
- **Supports**: SC-005, FR-010, Constitution Principle VII.

## `tests/agents-tool-use/walkthrough.spec.ts` (SC-001)

- **Rule**: from a fresh page load with no prior interaction, select a
  shipped sample question and confirm a complete step sequence (at least
  one reasoning step and exactly one final-answer or gave-up step)
  renders with no setup/configuration action required first.
- **Supports**: SC-001.

## `tests/agents-tool-use/strategy-comparison.spec.ts` (SC-007)

- **Rule**: open Compare Strategies with the shipped `"no-fit"` sample
  question selected; assert the three rendered strategy panels are not
  identical -- specifically, that `multi-step-loop`'s panel shows a
  `"gave-up"`-outcome marker that neither `direct-answer`'s nor
  `single-tool-call`'s panel shows, all visible without leaving the
  view.
- **Supports**: SC-007, User Story 3 Acceptance Scenario 2.
