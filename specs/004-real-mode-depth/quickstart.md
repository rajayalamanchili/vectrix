# Quickstart: Validating Real Mode Depth

**Feature**: `004-real-mode-depth` | **Date**: 2026-08-10

## Prerequisites

```bash
npm install
npm run dev   # http://localhost:3000/concepts/rag
```

Real Mode scenarios (2-9) additionally need an OpenAI API key with
access to `text-embedding-3-small`/`gpt-4o-mini` -- never commit it;
enter it only in the running app's Real Mode prompt.

## 0. Regression pass (run first)

With this feature's controls untouched, re-run every manual scenario
and automated check from `specs/001-core-platform-rag-module/
quickstart.md`, `specs/002-real-mode/quickstart.md`, and
`specs/003-parameter-exploration/quickstart.md`. Nothing here should
change existing behavior when unused -- in particular, confirm every
existing real-call site (Retrieval step, Embedding step, Generation
step, Compare Variants, recall@K eval, the chunk-size sweep) still
behaves identically now that its provider construction routes through
`createTrackedProvider` -- the wrapper must be invisible to callers.

## Manual scenario validation (spec.md User Stories 1-2)

1. **US1 comparison view renders, both halves labeled** (Acceptance
   Scenario 1) -- with a document and question set, open the new
   "Compare Simulated vs Real" tab. Confirm both the Simulated chart and
   (once a key is entered) the Real chart render for the same
   document/question, each still carrying its own existing mode-
   disclosure marker.
2. **US1 ranks are side-by-side readable** (Acceptance Scenario 2) --
   confirm a merged rank table/list is visible without needing to
   cross-reference two separate charts by eye; pick a chunk that ranks
   differently in each mode and confirm both ranks are legible together.
3. **US1 cost/call disclosure before the Real half fires** (Acceptance
   Scenario 3) -- with Real Mode active and a valid key, activate the
   Real half. Confirm an estimated call count *and* dollar figure (with
   its pricing-assumption basis named) appear before any call fires, and
   no call fires until explicitly confirmed.
4. **US1 close agreement shown honestly** (Acceptance Scenario 4) --
   find or construct a document/question where Simulated and Real
   rankings happen to closely agree; confirm the view presents this
   plainly, with no visual cue implying divergence was expected.
5. **US1 HyDE/RAG-Fusion Simulated-approximation caveat** (FR-002a,
   research.md) -- select HyDE, then RAG-Fusion, in the configuration
   selector. Confirm the Simulated panel explicitly states it's
   approximating with plain retrieval (not silently showing a ranking
   that looks like a real HyDE/Fusion result).
6. **US1 no-key state** (FR-004a) -- in a fresh session with Real Mode
   never activated, open the comparison view. Confirm the Simulated half
   renders immediately and the Real half shows the same inline key-entry
   prompt used elsewhere, not a blocked/greyed-out whole view.
7. **US2 cumulative ledger persists and sums correctly** (Acceptance
   Scenario 1, SC-002) -- make at least three real calls across
   different steps/views (e.g. one Retrieval-step embed, one Compare
   Variants naive run, one comparison-view Real half). Confirm a running
   total (call count + estimated cost) is visible from every step/view
   and equals the sum of each action's own pre-shown estimate.
8. **US2 reset prompt on document/state change** (Acceptance Scenario
   2) -- with a non-zero ledger total, switch the active document (in
   any view) or use "Reset to defaults." Confirm the app asks whether to
   reset the cumulative total or keep accumulating, rather than doing
   either silently.
9. **US2 warning threshold** (Acceptance Scenario 3, SC-004) -- set a
   low custom warning threshold (or use the $1.00 default with enough
   cheap actions to cross it); confirm a visible warning appears
   *before* the next real call fires once the threshold is crossed, and
   that "Proceed anyway" still allows the call to go through.
10. **US2 cost figures always labeled as estimates** (Acceptance
    Scenario 4) -- inspect any displayed cost figure; confirm it reads
    as an estimate with its pricing basis named (e.g. embed/generate
    $/call and the assumed token counts behind them), never as an exact
    bill.
11. **Edge Case: failed call doesn't inflate the ledger** -- force a
    real call to fail partway (e.g. an invalid key mid-session, or a
    mocked 429 in the automated spec below); confirm the ledger's total
    does not include a charge for the call that never completed.
12. **Edge Case: ledger survives navigation, not refresh** -- accumulate
    a non-zero total, navigate between all three views and pipeline
    steps (confirm the total is unchanged and still visible), then
    refresh the page (confirm the total resets to zero, matching the
    API key's own reset-on-refresh behavior).

## Automated checks (this feature's additions to `npm run check:all`)

```bash
npm run check:real-mode-depth
# = tsx scripts/checks/cost-ledger-sum.ts
#   && playwright test tests/real-mode-depth/
#   && playwright test tests/a11y/compare-simulated-vs-real.spec.ts tests/a11y/cost-ledger.spec.ts
```

- `cost-ledger-sum.ts` (SC-002) -- for each configuration
  (naive/hyde/fusion) at a representative parameter value, runs a fake
  resolving provider through `createLedgerTrackingProvider` and asserts
  the resulting ledger's summed total and call count exactly match
  `costEstimateUsd()`/`callsPerConfiguration()`'s own pre-call estimate
  for that same call sequence -- fails if the two have drifted apart.
- `tests/real-mode-depth/comparison-view.spec.ts` (SC-001, SC-003) --
  mocked provider: both charts render for the same input, ranks are
  readable in one table, and the cost/call disclosure appears before the
  Real half's call fires.
- `tests/real-mode-depth/cost-ledger-accumulation.spec.ts` (SC-002) --
  mocked provider: 3+ real actions across different steps/views,
  displayed total matches the sum of individual estimates, persists
  across navigation.
- `tests/real-mode-depth/warning-threshold.spec.ts` (SC-004) -- mocked
  provider: deliberately cross a low custom threshold, assert the
  warning appears before, not after, the next call.
- `tests/a11y/compare-simulated-vs-real.spec.ts` -- extends the existing
  `check:a11y` coverage with the configuration selector, both charts'
  focus order, and run/confirm controls.
- `tests/a11y/cost-ledger.spec.ts` -- extends `check:a11y` with the
  ledger display, reset-prompt banner, and warning banner.

See `contracts/comparison-contract.md` and `contracts/cost-ledger-
contract.md` for the exact function signatures and check assertions
above exercise.
