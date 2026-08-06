/**
 * SC-006 (static half): the API key a learner enters in Real Mode must
 * never be able to reach a first-party server -- structurally true only
 * if this project defines no server-side route at all. This script
 * fails if any file exists matching Next.js's Route Handler convention
 * (`route.ts`/`route.tsx`/`route.js` anywhere under `src/app/`), which
 * is the only way this project could ever receive the key server-side.
 * See contracts/real-mode-automated-checks-contract.md. The dynamic half
 * (tests/real-mode/key-isolation.spec.ts) is the primary proof -- this
 * is cheap, always-on regression insurance.
 */
import { readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { report, type CheckFailure } from "./lib/report";

const ROOT = join(__dirname, "..", "..");
const APP_DIR = join(ROOT, "src", "app");

const ROUTE_HANDLER_RE = /^route\.(ts|tsx|js|jsx)$/;

function walk(dir: string, found: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, found);
    } else if (ROUTE_HANDLER_RE.test(entry)) {
      found.push(full);
    }
  }
}

const foundRouteFiles: string[] = [];
walk(APP_DIR, foundRouteFiles);

const failures: CheckFailure[] = foundRouteFiles.map((f) => ({
  location: relative(ROOT, f),
  message:
    "a Next.js Route Handler exists -- Real Mode's design requires zero first-party server routes so an API key can never reach one (SC-006)",
}));

report("check:key-isolation", failures);
