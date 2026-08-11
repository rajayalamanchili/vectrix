/**
 * SC-002: the cumulative cost ledger's displayed total must never
 * silently drift from the pre-call estimate shown to the learner
 * beforehand. For each configuration (naive/hyde/fusion), issues the
 * exact call sequence that configuration's real orchestration logic
 * issues (mirroring VariantsComparison.tsx's runNaive/runHyde/runFusion
 * call order) against a fake resolving provider wrapped by
 * `createLedgerTrackingProvider`, then asserts the resulting ledger's
 * summed total and call count exactly match `costEstimateUsd()`/
 * `callsPerConfiguration()`'s own pre-call estimate for that same
 * sequence. Also verifies a call that rejects partway through a
 * sequence adds nothing to the ledger for that call (Edge Cases: "a
 * failed call that made no billable request should not be added to the
 * total"). See contracts/cost-ledger-contract.md.
 */
import { report, type CheckFailure } from "./lib/report";
import { createLedgerTrackingProvider } from "../../src/concepts/rag/costLedger/trackedProvider";
import { costEstimateUsd, embedCallsForConfiguration, generateCallsForConfiguration } from "../../src/concepts/rag/costLedger/costEstimate";
import { openaiPricing } from "../../src/concepts/rag/costLedger/pricing";
import { sumLedgerUsd, ledgerCallCount, type CostLedgerEntry, type SessionCostLedger } from "../../src/concepts/rag/costLedger/types";
import { callsPerConfiguration } from "../../src/concepts/rag/realMode/callEstimate";
import type { ConfigurationId, RealModeProvider } from "../../src/concepts/rag/realMode/types";

const failures: CheckFailure[] = [];

function newLedger(): SessionCostLedger {
  return { entries: [], warningThresholdUsd: 1, pendingResetPrompt: false };
}

function trackingProvider(base: RealModeProvider, ledger: SessionCostLedger): RealModeProvider {
  return createLedgerTrackingProvider(base, openaiPricing, (entry: CostLedgerEntry) => {
    ledger.entries.push(entry);
  });
}

function fakeResolvingProvider(): RealModeProvider {
  return {
    async embedBatch(texts) {
      return texts.map(() => [0.1, 0.2, 0.3]);
    },
    async generate() {
      return "fake generated text";
    },
  };
}

/** Issues the exact call sequence VariantsComparison.tsx's runNaive/runHyde/runFusion issue, in order. */
async function runConfigurationSequence(
  provider: RealModeProvider,
  configurationId: ConfigurationId,
  params: { hydeCount: number; fusionN: number },
): Promise<void> {
  if (configurationId === "naive") {
    await provider.embedBatch(["chunk-1", "chunk-2"]); // corpus-embed
    await provider.embedBatch(["query"]); // query-embed
    await provider.generate("prompt", { temperature: 0.3 }); // final-generate
    return;
  }
  if (configurationId === "hyde") {
    await provider.embedBatch(["chunk-1", "chunk-2"]); // corpus-embed
    for (let i = 0; i < params.hydeCount; i++) {
      await provider.generate("hypothesis prompt", { temperature: 0.3 }); // hypothesis-generate
    }
    await provider.embedBatch(["hypothesis-1"]); // hypotheses-batch-embed
    await provider.generate("prompt", { temperature: 0.3 }); // final-generate
    return;
  }
  // fusion
  await provider.embedBatch(["chunk-1", "chunk-2"]); // corpus-embed
  await provider.generate("query-variant prompt", { temperature: 0.3 }); // query-rewrite-generate
  for (let i = 0; i < params.fusionN; i++) {
    await provider.embedBatch(["variant-" + i]); // variant-embed
  }
  await provider.generate("prompt", { temperature: 0.3 }); // final-generate
}

const CASES: { configurationId: ConfigurationId; params: { hydeCount: number; fusionN: number } }[] = [
  { configurationId: "naive", params: { hydeCount: 1, fusionN: 3 } },
  { configurationId: "hyde", params: { hydeCount: 2, fusionN: 3 } },
  { configurationId: "fusion", params: { hydeCount: 1, fusionN: 3 } },
];

async function main() {
  for (const { configurationId, params } of CASES) {
    const ledger = newLedger();
    const provider = trackingProvider(fakeResolvingProvider(), ledger);
    await runConfigurationSequence(provider, configurationId, params);

    const expectedCost = costEstimateUsd(configurationId, params, openaiPricing);
    const expectedCalls =
      embedCallsForConfiguration(configurationId, params) + generateCallsForConfiguration(configurationId, params);
    const actualCost = sumLedgerUsd(ledger);
    const actualCalls = ledgerCallCount(ledger);

    if (actualCalls !== expectedCalls || actualCalls !== callsPerConfiguration(configurationId, params)) {
      failures.push({
        location: `${configurationId} call count`,
        message: `expected ${expectedCalls} calls (callsPerConfiguration: ${callsPerConfiguration(configurationId, params)}), ledger recorded ${actualCalls}`,
      });
    }
    if (Math.abs(actualCost - expectedCost) > 1e-12) {
      failures.push({
        location: `${configurationId} total cost`,
        message: `expected $${expectedCost}, ledger summed to $${actualCost} -- pre-call estimate has drifted from the ledger's actual total`,
      });
    }
  }

  // Edge Cases: a call that rejects partway through a sequence must not
  // be added to the ledger -- only calls that resolved before it count.
  {
    const ledger = newLedger();
    let callIndex = 0;
    const failingBase: RealModeProvider = {
      async embedBatch(texts) {
        callIndex += 1;
        if (callIndex === 2) throw new Error("simulated provider failure");
        return texts.map(() => [0.1, 0.2, 0.3]);
      },
      async generate() {
        callIndex += 1;
        if (callIndex === 2) throw new Error("simulated provider failure");
        return "fake generated text";
      },
    };
    const provider = trackingProvider(failingBase, ledger);

    try {
      await provider.embedBatch(["chunk-1"]); // call 1: resolves
      await provider.embedBatch(["query"]); // call 2: rejects
      await provider.generate("prompt", { temperature: 0.3 }); // never reached
    } catch {
      // expected -- the rejection should propagate to the caller
    }

    if (ledgerCallCount(ledger) !== 1) {
      failures.push({
        location: "partial-failure sequence",
        message: `expected exactly 1 ledger entry (the one call that resolved before the failure), got ${ledgerCallCount(ledger)}`,
      });
    }
    const expectedPartialCost = openaiPricing.embedCallUsd;
    if (Math.abs(sumLedgerUsd(ledger) - expectedPartialCost) > 1e-12) {
      failures.push({
        location: "partial-failure sequence total",
        message: `expected $${expectedPartialCost} (one embed call only), ledger summed to $${sumLedgerUsd(ledger)}`,
      });
    }
  }

  report("check:cost-ledger-sum", failures);
}

void main();
