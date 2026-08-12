# Agent Engine (Determinism & Tool-Selection) Checklist: Agents & Tool Use Concept Module

**Purpose**: Validate that `spec.md`'s requirements around tool selection, determinism, the iteration cap, and tool/strategy non-overlap are complete, unambiguous, consistent, and testable enough to build and verify against -- the genuinely new risk surface this module introduces relative to the existing RAG module (Constitution Principle V).
**Created**: 2026-08-11
**Feature**: [spec.md](../spec.md)
**Audience/timing**: Author self-review, before `/speckit-tasks`.

**Note**: This checklist tests the requirements as written, not the implementation. Items reference `spec.md` sections directly; `[Gap]` marks a requirement dimension `spec.md` does not address at all.

## Requirement Completeness

- [ ] CHK001 Does the spec define what makes two tools' capabilities "non-overlapping" (FR-003), or is overlap left to be judged case by case? [Completeness, Spec §FR-003]
- [ ] CHK002 Is the exact number of reasoning/tool-call iterations the fixed cap allows specified anywhere, or only that a fixed cap exists (FR-006)? [Completeness, Spec §FR-006]
- [x] CHK003 Does the spec state whether the iteration cap applies uniformly to every strategy, or only to strategies capable of looping? [Gap, Spec §FR-006]
- [ ] CHK004 Are the criteria a tool uses to decide "this question is a good match" specified at the requirement level, or left entirely to each tool's own internal judgment (Key Entities: Tool)? [Completeness, Spec §Key Entities]
- [ ] CHK005 Does the spec define what "reflects the change" means for a re-run after a tool is disabled (FR-004) -- a different tool chosen, a different final answer, or either being sufficient? [Completeness, Spec §FR-004]

## Requirement Clarity

- [ ] CHK006 Is "a good enough match" (FR-005) quantified or otherwise made objectively evaluable, or does it rely on each tool's own undefined internal threshold? [Clarity, Spec §FR-005]
- [ ] CHK007 Is "identical sequence of steps" (Acceptance Scenario 3, User Story 1) defined precisely enough to know whether step text, step count, or both must match exactly? [Clarity, Spec §User Story 1]
- [ ] CHK008 Is "distinct 'gave up' outcome" (Edge Cases) described with enough specificity to distinguish it from a final-answer outcome in a UI-agnostic way? [Clarity, Spec §Edge Cases]
- [ ] CHK009 Is "consistently" in "the deterministic selection rule still picks exactly one, consistently" (Edge Cases) tied to a concrete rule, or left as an unspecified property the implementation must invent? [Ambiguity, Spec §Edge Cases]

## Requirement Consistency

- [x] CHK010 Are FR-002's determinism requirement and FR-006's iteration-cap requirement consistent about what "identical step sequence" means when a run ends in "gave up" rather than a final answer? [Consistency, Spec §FR-002, §FR-006]
- [ ] CHK011 Do the AgentRun and AgentStrategy entity definitions agree on what "the step flow" means -- is it the same shape for a completed run and a gave-up run? [Consistency, Spec §Key Entities]
- [ ] CHK012 Is the toolbox-state assumption for the comparison view (Assumptions: "fixed default toolbox... rather than inheriting" US2's state) consistent with FR-004's toggle scope, which does not explicitly name which view(s) it applies to? [Consistency, Spec §FR-004, §Assumptions]

## Acceptance Criteria Quality

- [ ] CHK013 Can SC-002 ("changes the visible step sequence in an observable way") be verified without a human judgment call about what counts as "observable"? [Measurability, Spec §SC-002]
- [ ] CHK014 Can SC-003's "identical every time" be checked mechanically, or does it depend on an unstated notion of which fields of a step are compared? [Measurability, Spec §SC-003]
- [ ] CHK015 Does SC-007 specify what counts as a "concrete difference" precisely enough to distinguish a real behavioral divergence from a superficial wording difference between two strategies' steps? [Measurability, Spec §SC-007]

## Scenario & Edge Case Coverage

- [ ] CHK016 Does the spec define behavior for a question where every enabled tool matches simultaneously (three-way tie), not just the two-tool case the Edge Cases section names? [Coverage, Gap, Spec §Edge Cases]
- [ ] CHK017 Are requirements defined for what happens if a learner disables a tool mid-run (after reasoning has started but before the final answer is shown), or only for disabling before a run starts (FR-004)? [Coverage, Gap, Spec §FR-004]
- [ ] CHK018 Are requirements defined for the multi-step reasoning loop's behavior when it finds a tool match on a later iteration after earlier iterations found none -- is this outcome distinguished from a first-iteration match anywhere in the spec? [Coverage, Gap, Spec §User Story 3]
- [x] CHK019 Is recovery/re-run behavior specified for a "gave up" outcome -- can the same run be retried without changing any input, and if so, must it deterministically gave up again (FR-002)? [Coverage, Gap, Spec §FR-002, §Edge Cases]

## Dependencies & Assumptions

- [ ] CHK020 Is the assumption that tools "can be computed honestly without fabrication" validated against every shipped tool type the spec anticipates, or only the two examples given (calculator, unit converter)? [Assumption, Spec §Assumptions]
- [ ] CHK021 Is the dependency between User Story 1's walkthrough and User Story 3's comparison view -- specifically, whether they are required to share the same underlying tool-selection logic -- stated explicitly, or only implied by both requiring determinism? [Assumption, Gap, Spec §User Story 1, §User Story 3]

## Ambiguities & Conflicts

- [ ] CHK022 Is there a stated tie-breaking rule for "two tools both reasonable fit" (Edge Cases), or does the spec only require that a rule exists without naming or constraining it? [Ambiguity, Spec §Edge Cases]
- [x] CHK023 Does FR-006's "fixed maximum" leave open whether the maximum is a single project-wide constant or may vary per strategy, and does anything elsewhere in the spec resolve that? [Ambiguity, Spec §FR-006]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Link to relevant resources or documentation
- Items are numbered sequentially for easy reference
- **2026-08-11 update**: `/speckit-clarify` resolved CHK003/CHK023 --
  spec.md's FR-006 now states explicitly that the iteration cap is "a
  single, fixed, project-wide maximum (not a per-strategy limit)" and
  that "only a strategy capable of looping can ever approach this cap."
  All other items are unchanged by that session (in particular, CHK009
  and CHK022 remain open: spec.md still asserts tie-breaking is
  deterministic without naming the concrete rule in spec.md itself --
  the fixed-declaration-order rule lives in research.md/contracts, not
  spec.md).
- **2026-08-11 update (2nd session)**: `/speckit-clarify` resolved
  CHK010/CHK019 -- SC-003 and the Edge Cases "gave up" bullet now state
  explicitly that the 10-run determinism guarantee covers the
  multi-step-loop/"gave up" outcome too, not only final-answer runs, and
  that retrying an identical run that gave up must give up again every
  time. This also expands `tasks.md` T012's scope (agent-determinism.ts
  must now cover both `single-tool-call` and `multi-step-loop`, not just
  the "division" question) -- flagged for a follow-up `tasks.md` edit.
  CHK001, CHK002, CHK005, CHK006, CHK007, CHK009, CHK016-018, CHK021,
  CHK022 remain open, judged low-impact/non-blocking (already resolved
  consistently downstream in research.md/contracts, or moot by the
  module's synchronous single-pass architecture) rather than requiring
  further spec.md changes.
