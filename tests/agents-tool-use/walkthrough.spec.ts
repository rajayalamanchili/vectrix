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

/**
 * Edge Case (spec.md, quickstart.md scenario 11): switching sample
 * questions mid-walkthrough resets state -- mirrors the RAG module's own
 * document-change invalidation rule. Previously verified only via an ad
 * hoc script against the dev server (roadmap.md Milestone 5 status).
 */
test("switching sample questions replaces the step sequence -- no stale content from the previous question", async ({
  page,
}) => {
  await page.goto("/concepts/agents-tool-use");

  await page.locator('[data-question-chip="division"]').click();
  const finalAnswer = page.locator('[data-step-kind="final-answer"], [data-step-kind="gave-up"]').first();
  await expect(finalAnswer).toContainText("128 / 4");

  await page.locator('[data-question-chip="distance"]').click();
  await expect(finalAnswer).not.toContainText("128 / 4");
  await expect(finalAnswer).toContainText("5 kilometers");
});
