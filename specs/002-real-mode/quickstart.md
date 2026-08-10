# Quickstart: Validating Real Mode

**Feature**: `002-real-mode` | **Date**: 2026-08-05, re-synced 2026-08-06

Three layers: a regression pass proving Milestone 1 is untouched, manual
scenario walkthroughs against a real OpenAI key (proving the spec's
acceptance scenarios work end-to-end for real), and the automated checks
this plan adds (mocked provider, no key needed, CI-safe).

## Prerequisites

```bash
npm install
npm run dev   # http://localhost:3000
```

For the manual walkthroughs below, an OpenAI API key with access to
`text-embedding-3-small` and `gpt-4o-mini`. Never commit this key; enter
it only in the running app's Real Mode prompt.

## 0. Regression pass (SC-001, 002-spec -- run first)

With Real Mode untouched (never toggled on), re-run every manual
scenario and automated check from
`specs/001-core-platform-rag-module/quickstart.md`. All eight scenarios
and all four `npm run check:*` commands must behave exactly as they did
at Milestone 1's close -- any difference is a regression this feature
introduced and must be fixed before continuing.

## Manual scenario validation (spec.md 002 User Stories 1-6, real API)

1. **US1 zero-setup preserved** -- open the RAG module fresh, confirm no
   prompt/input appears until the Real Mode toggle is explicitly
   activated (Acceptance Scenario 1).
2. **US1 key prompt + disclaimer** -- activate Real Mode, confirm a
   single clear prompt appears stating where the key goes/doesn't go
   *and* the "use at your own risk" disclaimer (FR-003; data-model.md's
   disclaimer copy), enter a valid key (Acceptance Scenario 2), toggle
   back to Simulated Mode and confirm the key isn't re-requested when
   toggling Real Mode back on (Acceptance Scenario 3). Also submit an
   obviously malformed key first and confirm the input keeps its typed
   value, shows an inline error programmatically associated with the
   input (not just visually adjacent -- FR-015, checklist follow-up
   2026-08-06), and that submission unblocks the moment the value passes
   the format check (FR-003).
3. **US2 real embedding chart, timed** -- starting the clock at key
   submission (not at toggling Real Mode on -- SC-003's start point per
   the checklist follow-up), reach the Embedding step with Real Mode
   active and confirm the chart renders in under 60 seconds, is computed
   from a real API response, labeled "Real embeddings via OpenAI," and
   the projection method ("PCA") is named (Acceptance Scenarios 1, 3;
   SC-003).
4. **US2 embedding failure fallback** -- temporarily use an invalid key,
   confirm a clear, specific error appears with a working fallback to
   Simulated Mode (Acceptance Scenario 2), and that the error banner is
   announced without requiring the learner to already be focused on it
   (`role="alert"`/`aria-live`, FR-015).
5. **US3 custom document** -- paste a custom document and question,
   confirm every downstream step (Chunking, Embedding, Retrieval,
   Generation) uses it, and confirm a document over 10,000 characters is
   rejected with a clear message before any API call (Acceptance
   Scenarios 1-2).
6. **US3 revert to sample** -- with a custom document/question active,
   switch back to a sample document and confirm the custom text and
   question are cleared and the sample document's own question set is
   restored (Acceptance Scenario 3, checklist follow-up 2026-08-06).
7. **US4 real generation + temperature** -- reach Generation with Real
   Mode active, confirm the exact displayed prompt is sent and the
   answer is labeled "Real answer via OpenAI" (Scenario 1); run twice at
   the highest temperature setting and confirm the two answers visibly
   differ, then twice at the lowest setting and confirm they're
   effectively stable (Scenario 3, SC-007).
8. **US5 HyDE for real** -- in Compare Variants with Real Mode active,
   select HyDE, provide a document/question, confirm each hypothetical
   answer appears individually before retrieval runs (Scenario 1, 6),
   and the call-count estimate is shown before execution (Scenario 3).
9. **US5 RAG-Fusion for real** -- select RAG-Fusion, confirm each query
   variant and its own ranking appear before the fused ranking
   (Scenario 2), and that raising N changes both the call-count estimate
   and produces a visibly different fused ranking (Scenario 5, SC-008).
10. **US5 retry resumes, not restarts** -- with RAG-Fusion configured for
    N >= 3, force a failure on an intermediate query-variant call (e.g. a
    temporarily invalid key swapped in mid-run, or a throttled/offline
    network for one call), confirm the partial-failure error names which
    call failed, then correct the condition and press Retry: confirm
    exactly one new call is made (the failed one) and the query
    variants/rankings already shown before the failure remain visible
    unchanged, not re-run (FR-007, checklist follow-up 2026-08-06).
11. **US5 non-executable variants labeled honestly** -- select GraphRAG,
    Self-RAG, or Agentic RAG in Real Mode, confirm the Run control is
    visible but disabled with inline text ("Explanatory only this
    milestone") rather than hidden or unchanged from Simulated Mode, so
    the UI states plainly these remain explanatory-only without implying
    real execution (Scenario 4; FR-009's UI treatment, checklist
    follow-up 2026-08-06).
12. **US6 recall@K** -- define at least one (question, expected chunk)
    pair, confirm the estimated total call count for the evaluation run
    is shown before Run is pressed (FR-011, checklist follow-up
    2026-08-06), run the evaluation, confirm a recall@K score (with
    method named in the UI) appears per configuration, side by side, and
    confirm changing the pipeline's Top-K changes the recall@K score
    shown (FR-011). With at least three pairs defined, force one pair's
    retrieval call to fail mid-run (e.g. a temporarily invalid key
    swapped in partway through): confirm the run stops there (fail
    closed), the `RecallResult`s for pairs that already scored stay
    visible, the error names the specific failed pair/configuration, and
    pressing Retry re-scores only that one combination rather than
    re-running the pairs that already succeeded (FR-011 Edge Case,
    `/speckit.analyze` finding C3, 2026-08-06).

## Automated checks (mocked provider, no key needed)

```bash
npm run check:extensibility   # unchanged, regression only
npm run check:disclosure      # extended -- simulated AND real-mode disclosure
npm run check:a11y            # extended -- adds tests/a11y/real-mode.spec.ts
npm run check:determinism     # unchanged, scoped to Simulated Mode only
npm run check:key-isolation   # new -- SC-006, static + dynamic halves
npm run check:real-mode       # new -- SC-004, SC-007, SC-008
npm run check:all             # runs everything above, non-zero exit if any fails
```

Each check's pass/fail contract is documented in
`contracts/real-mode-automated-checks-contract.md` (this feature) and
`contracts/automated-checks-contract.md` (spec.md 001, for the three
unchanged/extended checks).

## Expected outcome

The regression pass (step 0) shows zero behavioral difference from
Milestone 1's close. All twelve manual scenarios above behave as
described against a real OpenAI key. All seven `npm run check:*`
commands exit `0`. That combination is what closes spec.md 002's
Definition of Done per roadmap.md: every acceptance scenario passes,
SC-001/SC-002 (002-spec) confirm Milestone 1 is unaffected, and SC-006 is
verified -- not assumed -- via `check:key-isolation`.
