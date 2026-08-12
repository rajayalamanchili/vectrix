import { test, expect } from "@playwright/test";

/**
 * SC-001: from a fresh page load with no prior interaction, selecting a
 * shipped sample question renders a complete step sequence -- at least
 * one reasoning step and exactly one final-answer/gave-up step -- with
 * no setup or configuration action required first.
 */

test("selecting a shipped sample question renders a complete step sequence with no setup", async ({ page }) => {
  await page.goto("/concepts/agents-tool-use");

  await page.locator('[data-question-chip="distance"]').click();

  await expect(page.locator('[data-step-kind="reasoning"]').first()).toBeVisible();
  const terminalSteps = page.locator('[data-step-kind="final-answer"], [data-step-kind="gave-up"]');
  await expect(terminalSteps).toHaveCount(1);
  await expect(terminalSteps.first()).toBeVisible();
});
