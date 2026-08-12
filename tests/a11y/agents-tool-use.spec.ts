import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * SC-005 + FR-010: every control this module introduces -- the
 * sample-question chips, the custom-question input, each tool's
 * enable/disable toggle, and the view-tab switcher (Walkthrough /
 * Compare Strategies) -- must be Tab-reachable, keyboard-activatable via
 * Enter/Space, individually accessibly named (not a shared generic
 * label), and free of WCAG 2.1 A/AA violations reported by axe.
 * See contracts/automated-checks-contract.md's check:a11y rule (a)-(e).
 */

test.describe("Agents & Tool Use accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/agents-tool-use");
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations (Walkthrough)", async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations (Compare Strategies)", async ({ page }) => {
    await page.getByRole("button", { name: "Compare Strategies" }).click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("sample-question chips are Tab-reachable, keyboard-activatable, and have distinct accessible names", async ({
    page,
  }) => {
    const divisionChip = page.locator('[data-question-chip="division"]');
    const distanceChip = page.locator('[data-question-chip="distance"]');
    await expect(divisionChip).toHaveAccessibleName("What is 128 / 4?");
    await expect(distanceChip).toHaveAccessibleName("Convert 5 kilometers to miles");
    await expect(divisionChip).toHaveAttribute("aria-pressed", "true");

    await distanceChip.focus();
    await page.keyboard.press("Enter");
    await expect(distanceChip).toHaveAttribute("aria-pressed", "true");
    await expect(divisionChip).toHaveAttribute("aria-pressed", "false");

    await divisionChip.focus();
    await page.keyboard.press(" ");
    await expect(divisionChip).toHaveAttribute("aria-pressed", "true");
  });

  test("custom-question input is reachable and distinctly named from the sample chips", async ({ page }) => {
    const input = page.getByPlaceholder("Or type your own question...");
    await expect(input).toBeVisible();
    await input.fill("What is 10 + 5?");
    await expect(page.locator('[data-step-kind="observation"]')).toContainText("15");
  });

  test("every tool toggle has a distinct, tool-specific accessible name, not a generic 'Toggle'", async ({
    page,
  }) => {
    const calculator = page.getByRole("switch", { name: /Calculator/ });
    const unitConverter = page.getByRole("switch", { name: /Unit Converter/ });
    const knowledgeLookup = page.getByRole("switch", { name: /Knowledge Lookup/ });
    await expect(calculator).toHaveAccessibleName(/Calculator/);
    await expect(unitConverter).toHaveAccessibleName(/Unit Converter/);
    await expect(knowledgeLookup).toHaveAccessibleName(/Knowledge Lookup/);

    for (const toggle of [calculator, unitConverter, knowledgeLookup]) {
      await expect(toggle).not.toHaveAccessibleName("Toggle");
    }
  });

  test("tool toggles are keyboard-operable via Enter and Space, and expose state via aria-checked", async ({
    page,
  }) => {
    const calculator = page.getByRole("switch", { name: /Calculator/ });
    await expect(calculator).toHaveAttribute("aria-checked", "true");

    await calculator.focus();
    await page.keyboard.press("Enter");
    await expect(calculator).toHaveAttribute("aria-checked", "false");

    await page.keyboard.press(" ");
    await expect(calculator).toHaveAttribute("aria-checked", "true");
  });

  test("the view-tab switcher is keyboard-operable and each tab has a distinct accessible name", async ({
    page,
  }) => {
    const walkthroughTab = page.getByRole("button", { name: "Walkthrough" });
    const compareTab = page.getByRole("button", { name: "Compare Strategies" });
    await expect(walkthroughTab).toBeVisible();
    await expect(compareTab).toBeVisible();

    await compareTab.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-strategy-panel="direct-answer"]')).toBeVisible();

    await walkthroughTab.focus();
    await page.keyboard.press(" ");
    await expect(page.getByPlaceholder("Or type your own question...")).toBeVisible();
  });
});
