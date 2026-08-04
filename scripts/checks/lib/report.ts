/**
 * Shared pass/fail reporting helper for scripts/checks/*.ts. Each check
 * script collects zero or more `CheckFailure`s and calls `report()` once
 * at the end -- this is the one place that owns the printed format and
 * the `process.exit(0|1)` contract every check script promises in
 * contracts/automated-checks-contract.md.
 */

export interface CheckFailure {
  /** "file:line", a DOM selector, or a diverging-run index -- whatever locates the failure. */
  location: string;
  message: string;
}

export function report(checkName: string, failures: CheckFailure[]): never {
  if (failures.length === 0) {
    console.log(`[${checkName}] PASS`);
    process.exit(0);
  }

  console.error(`[${checkName}] FAIL -- ${failures.length} issue${failures.length > 1 ? "s" : ""}:`);
  for (const f of failures) {
    console.error(`  ${f.location}: ${f.message}`);
  }
  process.exit(1);
}
