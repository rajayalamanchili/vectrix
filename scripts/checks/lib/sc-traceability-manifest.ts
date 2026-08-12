/**
 * Maps every SC-### across specs 001-005 to the test/check file(s) that
 * cover it (contracts/sc-traceability-contract.md). Built by an audit of
 * every existing scripts/checks/*.ts and tests/**\/*.spec.ts file's
 * SC-### header comment against all 33 SC-### entries, cross-referenced
 * with roadmap.md's own status notes. research.md's Phase 0 audit
 * identified 5 gaps up front (001 SC-001/SC-004/SC-008, 005
 * SC-001/SC-007); this audit surfaced two more genuinely uncovered
 * criteria the Phase 0 pass didn't catch (002 SC-003, 003 SC-001's own
 * numeric claim) -- all 7 are now closed, see tasks.md T006-T010, T010a,
 * T010b.
 */

export interface ScCoverageEntry {
  specPath: string;
  scId: string;
  coveredBy: string[];
  note?: string;
}

export const SC_TRACEABILITY_MANIFEST: ScCoverageEntry[] = [
  // -- 001-core-platform-rag-module --
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-001",
    coveredBy: ["tests/smoke/first-time-visitor-journey.spec.ts"],
    note: "closed 2026-08-12 -- previously only a historical, uncommitted verification (roadmap.md T051)",
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-002",
    coveredBy: ["scripts/checks/no-cross-module-conditionals.ts"],
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-003",
    coveredBy: ["scripts/checks/simulated-disclosure.ts"],
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-004",
    coveredBy: ["tests/a11y/viewport-readability.spec.ts"],
    note: "closed 2026-08-12 -- previously screenshot-only (roadmap.md T050), never a committed regression test. Closing this surfaced a genuine touch-target defect (several FR-011 canonical controls a few px under 44px), fixed in the same pass -- see tasks.md Notes.",
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-005",
    coveredBy: ["tests/a11y/pipeline-walkthrough.spec.ts", "tests/a11y/compare-variants.spec.ts"],
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-006",
    coveredBy: ["scripts/checks/determinism.ts"],
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-007",
    coveredBy: ["tests/a11y/pipeline-walkthrough.spec.ts"],
  },
  {
    specPath: "specs/001-core-platform-rag-module/spec.md",
    scId: "SC-008",
    coveredBy: ["tests/a11y/pipeline-walkthrough.spec.ts"],
    note: "closed 2026-08-12 -- previously an ad hoc script run (roadmap.md 2026-08-05 entry); confirmed 6 fixed-size vs. 10 sentence-boundary chunks against the live pipeline",
  },

  // -- 002-real-mode --
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-001",
    coveredBy: [
      "tests/a11y/pipeline-walkthrough.spec.ts",
      "tests/a11y/compare-variants.spec.ts",
      "tests/smoke/first-time-visitor-journey.spec.ts",
      "scripts/checks/determinism.ts",
    ],
    note: "Real Mode defaults to inactive (RagConcept.tsx's INACTIVE_REAL_MODE_SESSION) and none of these tests ever toggle it on, so the existing Milestone 1 suite passing against the current codebase (which now includes Real Mode) is itself the evidence that Milestone 1's criteria remain met with Real Mode present but inactive.",
  },
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-002",
    coveredBy: ["tests/a11y/real-mode.spec.ts"],
    note: "\"no key prompt appears until the toggle is activated (zero-setup preserved)\" test",
  },
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-003",
    coveredBy: ["tests/real-mode/embedding-chart-renders.spec.ts"],
    note: "closed 2026-08-12 (T010b) -- previously only manual (roadmap.md T023/T058). Covers the mockable UI-mechanics half (chart renders promptly once the response resolves); the literal <60s-against-a-live-provider wall-clock claim genuinely requires a live call and stays a manual, documented verification per FR-006/Edge Cases of this feature's own spec.md, evidenced by roadmap.md T023/T058.",
  },
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-004",
    coveredBy: ["tests/real-mode/failure-fallback.spec.ts"],
  },
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-005",
    coveredBy: ["tests/real-mode/intermediate-steps-visible.spec.ts"],
  },
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-006",
    coveredBy: ["scripts/checks/key-isolation.ts", "tests/real-mode/key-isolation.spec.ts"],
  },
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-007",
    coveredBy: ["tests/real-mode/temperature-effect.spec.ts"],
  },
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-008",
    coveredBy: ["tests/real-mode/fusion-n-effect.spec.ts"],
  },
  {
    specPath: "specs/002-real-mode/spec.md",
    scId: "SC-009",
    coveredBy: ["tests/a11y/real-mode.spec.ts"],
  },

  // -- 003-parameter-exploration --
  {
    specPath: "specs/003-parameter-exploration/spec.md",
    scId: "SC-001",
    coveredBy: ["tests/parameter-exploration/sweep-keyboard-and-confirmation.spec.ts", "scripts/checks/sweep-shape.ts"],
    note: "closed 2026-08-12 (T010a) -- the Playwright spec covers keyboard-operability; sweep-shape.ts is what newly covers the SC's own numeric claim (flat 70-85 delta ~0.003, meaningful 45-60 delta ~0.09), previously asserted only in spec.md prose",
  },
  {
    specPath: "specs/003-parameter-exploration/spec.md",
    scId: "SC-002",
    coveredBy: ["scripts/checks/permalink-safety.ts"],
  },
  {
    specPath: "specs/003-parameter-exploration/spec.md",
    scId: "SC-003",
    coveredBy: ["tests/parameter-exploration/permalink-roundtrip.spec.ts"],
  },
  {
    specPath: "specs/003-parameter-exploration/spec.md",
    scId: "SC-004",
    coveredBy: ["scripts/checks/failure-presets.ts"],
  },
  {
    specPath: "specs/003-parameter-exploration/spec.md",
    scId: "SC-005",
    coveredBy: ["tests/parameter-exploration/sweep-keyboard-and-confirmation.spec.ts"],
  },

  // -- 004-real-mode-depth --
  {
    specPath: "specs/004-real-mode-depth/spec.md",
    scId: "SC-001",
    coveredBy: ["tests/real-mode-depth/comparison-view.spec.ts"],
  },
  {
    specPath: "specs/004-real-mode-depth/spec.md",
    scId: "SC-002",
    coveredBy: ["scripts/checks/cost-ledger-sum.ts", "tests/real-mode-depth/cost-ledger-accumulation.spec.ts"],
  },
  {
    specPath: "specs/004-real-mode-depth/spec.md",
    scId: "SC-003",
    coveredBy: ["tests/real-mode-depth/comparison-view.spec.ts"],
  },
  {
    specPath: "specs/004-real-mode-depth/spec.md",
    scId: "SC-004",
    coveredBy: ["tests/real-mode-depth/warning-threshold.spec.ts"],
  },

  // -- 005-agents-tool-use --
  {
    specPath: "specs/005-agents-tool-use/spec.md",
    scId: "SC-001",
    coveredBy: ["tests/agents-tool-use/walkthrough.spec.ts"],
    note: "closed 2026-08-12 -- the question-switch state-reset scenario (quickstart.md scenario 11) was previously only ad hoc-verified (roadmap.md Milestone 5 status)",
  },
  {
    specPath: "specs/005-agents-tool-use/spec.md",
    scId: "SC-002",
    coveredBy: ["scripts/checks/agent-tool-toggle-effect.ts"],
  },
  {
    specPath: "specs/005-agents-tool-use/spec.md",
    scId: "SC-003",
    coveredBy: ["scripts/checks/agent-determinism.ts"],
  },
  {
    specPath: "specs/005-agents-tool-use/spec.md",
    scId: "SC-004",
    coveredBy: ["scripts/checks/simulated-disclosure.ts"],
  },
  {
    specPath: "specs/005-agents-tool-use/spec.md",
    scId: "SC-005",
    coveredBy: ["tests/a11y/agents-tool-use.spec.ts"],
  },
  {
    specPath: "specs/005-agents-tool-use/spec.md",
    scId: "SC-006",
    coveredBy: ["scripts/checks/no-cross-module-conditionals.ts"],
  },
  {
    specPath: "specs/005-agents-tool-use/spec.md",
    scId: "SC-007",
    coveredBy: ["tests/agents-tool-use/strategy-comparison.spec.ts"],
    note: "closed 2026-08-12 -- the same-final-answer-more-steps scenario (quickstart.md scenario 9) was previously only ad hoc-verified (roadmap.md Milestone 5 status)",
  },
];
