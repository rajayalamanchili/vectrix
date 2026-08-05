/**
 * SC-002 + FR-001: the home page, the dynamic concept route, and the
 * registry itself must render/behave purely from the `conceptRegistry`
 * array -- no file outside a concept's own folder may contain a
 * per-concept conditional (a hardcoded-literal-id comparison, per
 * FR-002's definition), and every `ConceptModule.id` in the registry
 * must be unique. See contracts/automated-checks-contract.md.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { report, type CheckFailure } from "./lib/report";
import { conceptRegistry } from "../../src/lib/concept-registry";

const ROOT = join(__dirname, "..", "..");

const TARGET_FILES = [
  "src/app/page.tsx",
  "src/app/concepts/[conceptId]/page.tsx",
  "src/lib/concept-registry.ts",
  "src/lib/concept-types.ts",
];

// A per-concept conditional is a branch selected by comparing a value
// against a *hardcoded literal* concept id -- `id === "rag"`, `"rag" ===
// id`, or `case "rag":`. Comparisons against a runtime-supplied id
// (`c.id === id` inside `getConcept(id)`) have no quoted literal on
// either side and correctly do NOT match these patterns.
const CONDITIONAL_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "literal-id comparison (id on the left)", re: /\bid\s*===?\s*["'][\w-]+["']/ },
  { name: "literal-id comparison (id on the right)", re: /["'][\w-]+["']\s*===?\s*[\w.]*\bid\b/ },
  { name: "switch case naming a literal id", re: /\bcase\s+["'][\w-]+["']\s*:/ },
];

// Known-good fixture / self-check: the exact pattern concept-registry.ts's
// own getConcept(id) uses (a runtime-id comparison) must NEVER be flagged
// by the patterns above. If this assertion itself fails, the patterns are
// too aggressive and the real scan below cannot be trusted.
const KNOWN_GOOD_FIXTURE = 'conceptRegistry.find((c) => c.id === id)';
for (const { name, re } of CONDITIONAL_PATTERNS) {
  if (re.test(KNOWN_GOOD_FIXTURE)) {
    console.error(
      `[check:extensibility] SELF-CHECK FAILED: pattern "${name}" incorrectly flags the known-good runtime-id fixture "${KNOWN_GOOD_FIXTURE}"`,
    );
    process.exit(1);
  }
}

const failures: CheckFailure[] = [];

for (const relPath of TARGET_FILES) {
  let content: string;
  try {
    content = readFileSync(join(ROOT, relPath), "utf8");
  } catch {
    continue; // file not present -- nothing to scan
  }
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    for (const { name, re } of CONDITIONAL_PATTERNS) {
      if (re.test(line)) {
        failures.push({ location: `${relPath}:${i + 1}`, message: `${name} -- "${line.trim()}"` });
      }
    }
  });
}

// FR-001: every ConceptModule.id in the registry must be unique.
const idCounts = new Map<string, number[]>();
conceptRegistry.forEach((c, i) => {
  const positions = idCounts.get(c.id) ?? [];
  positions.push(i);
  idCounts.set(c.id, positions);
});
for (const [id, positions] of idCounts) {
  if (positions.length > 1) {
    failures.push({
      location: `conceptRegistry id "${id}"`,
      message: `duplicate id at array positions [${positions.join(", ")}] -- every ConceptModule.id must be unique (FR-001)`,
    });
  }
}

report("check:extensibility", failures);
