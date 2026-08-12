import { test, expect } from "@playwright/test";

/**
 * SC-007: with the "no-fit" sample question selected in Compare
 * Strategies, `multi-step-loop`'s panel alone shows a "gave-up" outcome
 * while `direct-answer` and `single-tool-call` both still show a
 * completed (if low-confidence) final answer -- all visible without
 * leaving the view.
 */

test("multi-step-loop alone reaches gave-up on the no-fit question, the other two strategies still answer", async ({
  page,
}) => {
  await page.goto("/concepts/agents-tool-use");
  await page.getByRole("button", { name: "Compare Strategies" }).click();
  await page.locator('[data-question-chip="no-fit"]').click();

  const directAnswer = page.locator('[data-strategy-panel="direct-answer"]');
  const singleToolCall = page.locator('[data-strategy-panel="single-tool-call"]');
  const multiStepLoop = page.locator('[data-strategy-panel="multi-step-loop"]');

  await expect(directAnswer.locator('[data-step-kind="final-answer"]')).toBeVisible();
  await expect(directAnswer.locator('[data-step-kind="gave-up"]')).toHaveCount(0);

  await expect(singleToolCall.locator('[data-step-kind="final-answer"]')).toBeVisible();
  await expect(singleToolCall.locator('[data-step-kind="gave-up"]')).toHaveCount(0);

  await expect(multiStepLoop.locator('[data-step-kind="gave-up"]')).toBeVisible();
  await expect(multiStepLoop.locator('[data-step-kind="final-answer"]')).toHaveCount(0);
});
