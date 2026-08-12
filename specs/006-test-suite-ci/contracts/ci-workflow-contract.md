# Contract: CI Workflow (US1 -- supports FR-001, FR-002, FR-003, FR-007, FR-008, FR-010; SC-002, SC-003, SC-004, SC-005)

**Status**: New, this plan. See research.md items 1-2 for the platform
and job-structure decisions this contract implements.

## Trigger

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
    branches: [main]
```

`pull_request` (not `push`) so the workflow runs against the merge
commit GitHub would actually produce, and re-runs automatically on every
new commit pushed to the PR branch (FR-003) with no extra configuration.

## Job graph

```
discover-checks (reads package.json, emits JSON array of "check:*" script names)
        │
        ├──► module-checks (matrix: one run per discovered check name)
typecheck (fixed, independent)
lint (fixed, independent)
build (fixed, independent)
sc-coverage (fixed, independent -- see sc-traceability-contract.md)
```

```yaml
jobs:
  discover-checks:
    runs-on: ubuntu-latest
    outputs:
      checks: ${{ steps.list.outputs.checks }}
    steps:
      - uses: actions/checkout@v4
      - id: list
        run: |
          echo "checks=$(node -e "
            const pkg = require('./package.json');
            const names = Object.keys(pkg.scripts).filter(k => k.startsWith('check:'));
            console.log(JSON.stringify(names));
          ")" >> "$GITHUB_OUTPUT"

  module-checks:
    needs: discover-checks
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        check: ${{ fromJson(needs.discover-checks.outputs.checks) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run ${{ matrix.check }}

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx eslint .

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
```

- **`fail-fast: false`** on the matrix so one failing check (e.g.
  `check:a11y`) doesn't cancel the other in-flight checks -- a
  contributor sees every failure in one push, not one at a time across
  several rounds of "fix, push, wait, discover the next failure."
- **Each `matrix.check` value becomes its own named status check** on
  the PR (GitHub renders matrix jobs as `module-checks (check:a11y)`,
  `module-checks (check:real-mode)`, etc.) -- this is what satisfies
  FR-008/SC-004 without any custom reporting step.
- **`sc-coverage`** (its own fixed job, contract below) runs
  `tsx scripts/checks/sc-coverage.ts` the same way `typecheck`/`lint`
  run their tools -- omitted from the graph above only to avoid
  duplicating its own contract file's content.

## Branch protection (repository configuration, not code)

All jobs above -- `typecheck`, `lint`, `build`, `sc-coverage`, and every
matrix entry `module-checks (check:*)` that exists in `package.json` at
setup time -- are configured as **required status checks** on the `main`
branch's protection rule. This is what makes FR-002 actually true (a
contributor cannot merge with a red check through GitHub's normal merge
button) -- the workflow YAML alone only *reports* status, GitHub's
branch protection is what *enforces* it. **Setting up branch protection
is a one-time manual repository-settings step** (`tasks.md` will include
it as an explicit task, since it isn't expressible as a file in this
repo) -- future module checks discovered dynamically by `discover-checks`
still need their generated job name added to the required-checks list
once, the same one-time step every new job name (not just module
checks) already requires under GitHub's model.

## Non-goals

- No custom dashboard/reporting UI -- GitHub's native PR checks list is
  the entire FR-008/FR-010/SC-004 delivery mechanism.
- No retry/flake-quarantine logic in the workflow itself -- per spec.md's
  Edge Cases, a flaky check must be fixed at its source, not
  auto-retried into a false green.
- No workflow step runs against a real third-party API (FR-006) --
  every `check:*` script already runs against mocked providers per
  tech-stack.md's existing precedent; this contract adds no exception.
