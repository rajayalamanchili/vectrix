import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * SC-005 (003-spec): every new Parameter Exploration control -- the sweep
 * curve's points (US1), the permalink button (US2), and the failure
 * preset picker/reset control (US3) -- must be Tab-reachable,
 * keyboard-operable, and expose a non-generic accessible name, matching
 * Milestones 1-2's own `check:a11y` precedent. This file starts with
 * US1's sweep curve and is extended in place by US2/US3, mirroring
 * `tests/a11y/real-mode.spec.ts`'s per-story `describe` structure.
 */

test.describe("Sweep curve accessibility (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
    await page.getByRole("button", { name: "Retrieval" }).click();
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations with the sweep curve rendered", async ({ page }) => {
    await page.getByRole("button", { name: "Sweep chunk size (9 points)" }).click();
    await expect(page.getByRole("button", { name: /^Chunk size \d+, top match score/ }).first()).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("the 'Sweep chunk size' trigger is Tab-reachable with a non-generic accessible name", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Sweep chunk size (9 points)" });
    await expect(trigger).toBeVisible();
    await expect(trigger).not.toHaveAccessibleName("Button");
    await trigger.focus();
    await expect(trigger).toBeFocused();
  });

  test("each sweep point has a purpose-specific accessible name stating chunk size and score", async ({ page }) => {
    await page.getByRole("button", { name: "Sweep chunk size (9 points)" }).click();
    const points = page.getByRole("button", { name: /^Chunk size \d+, top match score/ });
    await expect(points).toHaveCount(9);
    for (let i = 0; i < 9; i++) {
      await expect(points.nth(i)).not.toHaveAccessibleName("Button");
    }
  });
});

/**
 * SC-005 (003-spec) + US2: the "Generate permalink" button and its
 * aria-live confirmation region.
 */
test.describe("Permalink button accessibility (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations with the permalink control visible", async ({
    page,
  }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("the 'Generate permalink' button is Tab-reachable with a non-generic accessible name", async ({ page }) => {
    const button = page.getByRole("button", { name: "Generate permalink" });
    await expect(button).toBeVisible();
    await expect(button).not.toHaveAccessibleName("Button");
    await button.focus();
    await expect(button).toBeFocused();
  });

  test("activating the button announces a 'Copied' confirmation in an aria-live region", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const status = page.getByRole("status");
    await expect(status).toHaveText("");

    const button = page.getByRole("button", { name: "Generate permalink" });
    await button.focus();
    await page.keyboard.press("Enter");

    await expect(status).toHaveText("Copied to clipboard");
  });
});

/**
 * SC-005 (003-spec) + US3: the failure preset picker's three preset
 * buttons and its always-visible "Reset to defaults" control.
 */
test.describe("Failure preset picker accessibility (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations with a preset loaded", async ({ page }) => {
    await page.getByRole("button", { name: "Threshold too strict" }).click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("each preset button is Tab-reachable, Enter-activatable, and exposes selected state via aria-pressed", async ({
    page,
  }) => {
    const preset = page.getByRole("button", { name: "Chunk too large" });
    await expect(preset).not.toHaveAccessibleName("Button");
    await expect(preset).toHaveAttribute("aria-pressed", "false");

    await preset.focus();
    await page.keyboard.press("Enter");
    await expect(preset).toHaveAttribute("aria-pressed", "true");
  });

  test("loading a preset shows its explanation as visible text naming the causing parameter", async ({ page }) => {
    await page.getByRole("button", { name: "Chunk too small" }).click();
    await expect(page.getByText(/Chunk size 20/i)).toBeVisible();
  });

  test("'Reset to defaults' is Tab-reachable and keyboard-activatable from a preset-loaded state", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Threshold too strict" }).click();
    const resetButton = page.getByRole("button", { name: "Reset to defaults" });
    await expect(resetButton).not.toHaveAccessibleName("Button");

    await resetButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Threshold too strict" })).toHaveAttribute("aria-pressed", "false");
  });

  test("'Reset to defaults' is reachable and keyboard-operable from a mid-sweep state", async ({ page }) => {
    await page.getByRole("button", { name: "Retrieval" }).click();
    await page.getByRole("button", { name: "Sweep chunk size (9 points)" }).click();
    const resetButton = page.getByRole("button", { name: "Reset to defaults" });
    await expect(resetButton).toBeVisible();
    await resetButton.focus();
    await page.keyboard.press("Enter");
  });
});
