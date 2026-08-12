/**
 * SC-001 (006-test-suite-ci): 100% of Success Criteria defined across
 * Milestones 1-5's spec.md files must have at least one committed,
 * automated test. Extracts every SC-### heading from the five spec.md
 * files via a textual regex scan (no markdown-parsing dependency,
 * matching no-cross-module-conditionals.ts's existing style), then
 * cross-checks against SC_TRACEABILITY_MANIFEST: every extracted SC must
 * have a manifest entry, every manifest coveredBy path must exist on
 * disk, and every manifest entry must still exist in its spec's current
 * heading list. See contracts/sc-traceability-contract.md.
 */
import fs from "node:fs";
import path from "node:path";
import { report, type CheckFailure } from "./lib/report";
import { SC_TRACEABILITY_MANIFEST } from "./lib/sc-traceability-manifest";

const REPO_ROOT = path.resolve(__dirname, "../..");

const SPEC_PATHS = [
  "specs/001-core-platform-rag-module/spec.md",
  "specs/002-real-mode/spec.md",
  "specs/003-parameter-exploration/spec.md",
  "specs/004-real-mode-depth/spec.md",
  "specs/005-agents-tool-use/spec.md",
];

const SC_HEADING_PATTERN = /-\s+\*\*(SC-\d+)\*\*/g;

function extractScIds(specPath: string): string[] {
  const fullPath = path.join(REPO_ROOT, specPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  const ids = new Set<string>();
  for (const match of content.matchAll(SC_HEADING_PATTERN)) {
    ids.add(match[1]);
  }
  return [...ids];
}

const failures: CheckFailure[] = [];

const specScIds = new Map<string, string[]>();
for (const specPath of SPEC_PATHS) {
  specScIds.set(specPath, extractScIds(specPath));
}

// Every extracted (specPath, scId) has exactly one manifest entry.
for (const [specPath, scIds] of specScIds) {
  for (const scId of scIds) {
    const entries = SC_TRACEABILITY_MANIFEST.filter((e) => e.specPath === specPath && e.scId === scId);
    if (entries.length === 0) {
      failures.push({
        location: `${specPath} ${scId}`,
        message: `${specPath} ${scId} has no traceability-manifest entry`,
      });
    } else if (entries.length > 1) {
      failures.push({
        location: `${specPath} ${scId}`,
        message: `${specPath} ${scId} has ${entries.length} manifest entries, expected exactly 1`,
      });
    }
  }
}

// Every manifest entry's coveredBy paths exist on disk, and its
// (specPath, scId) still appears in that spec's current heading list.
for (const entry of SC_TRACEABILITY_MANIFEST) {
  for (const coveredByPath of entry.coveredBy) {
    if (!fs.existsSync(path.join(REPO_ROOT, coveredByPath))) {
      failures.push({
        location: `${entry.specPath} ${entry.scId}`,
        message: `${entry.specPath} ${entry.scId}'s coveredBy path ${coveredByPath} does not exist`,
      });
    }
  }

  const currentIds = specScIds.get(entry.specPath);
  if (!currentIds) {
    failures.push({
      location: `${entry.specPath} ${entry.scId}`,
      message: `${entry.specPath} is not one of the five tracked spec files`,
    });
  } else if (!currentIds.includes(entry.scId)) {
    failures.push({
      location: `${entry.specPath} ${entry.scId}`,
      message: `${entry.specPath} ${entry.scId} in the manifest no longer exists in that spec`,
    });
  }
}

report("check:sc-coverage", failures);
