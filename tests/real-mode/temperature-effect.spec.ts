import { test, expect, type Page } from "@playwright/test";

/**
 * SC-007 (spec.md Acceptance Scenario 3, User Story 4): re-running
 * generation twice at a high temperature with the exact same prompt may
 * produce visibly different wording; re-running twice at the lowest
 * available temperature produces effectively stable (here: mocked
 * byte-identical) output. The provider is mocked at the HTTP layer via
 * route interception -- no real API key is used or needed.
 *
 * Reads settle via `data-generated-answer`'s text rather than counting
 * exact request totals: Next.js dev's double effect-invocation on mount
 * means one logical "run" can issue two identical real requests, and only
 * the last one to resolve is applied (the effect's own `cancelled` guard
 * discards the stale one) -- so asserting on settled displayed text is
 * the robust proxy for "one run happened," not a raw call count.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";
const SETTLE_MS = 800;

async function activateRealMode(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

function succeedEmbeddings(page: Page) {
  return page.route("https://api.openai.com/v1/embeddings", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const n = Array.isArray(body.input) ? body.input.length : 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3] })) }),
    });
  });
}

async function reachGenerationStep(page: Page) {
  await page.getByRole("button", { name: "Retrieval" }).click();
  const useResultsButton = page.getByRole("button", { name: /Use these results in the next step/i });
  await expect(useResultsButton).toBeEnabled();
  await useResultsButton.click();
  await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();
}

test("high temperature: two runs of the same prompt may produce visibly different wording", async ({ page }) => {
  await succeedEmbeddings(page);
  let call = 0;
  const seenTemperatures: number[] = [];
  await page.route("https://api.openai.com/v1/chat/completions", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    call += 1;
    seenTemperatures.push(body.temperature);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: `Mocked answer, call ${call}, temperature ${body.temperature}.` } }] }),
    });
  });

  await activateRealMode(page);
  await reachGenerationStep(page);

  const answer = page.locator('[data-generated-answer="true"]');
  await expect(answer).toBeVisible();

  const temperatureSlider = page.getByRole("slider", { name: "Temperature" });
  await temperatureSlider.focus();
  await page.keyboard.press("End"); // native range-input behavior: jumps to max (1.0)
  await page.waitForTimeout(SETTLE_MS);
  const firstHighTempAnswer = await answer.textContent();

  await page.getByRole("button", { name: "Regenerate at this temperature" }).click();
  await page.waitForTimeout(SETTLE_MS);
  const secondHighTempAnswer = await answer.textContent();

  expect(firstHighTempAnswer).not.toBe(secondHighTempAnswer);
  // Every request issued after the slider was set to max used that
  // temperature -- confirms the control's value actually reached the
  // provider call, not just the displayed slider position.
  expect(seenTemperatures.some((t) => t === 1)).toBe(true);
});

test("lowest temperature: two runs of the same prompt are effectively stable", async ({ page }) => {
  await succeedEmbeddings(page);
  const STABLE_ANSWER = "The same mocked answer every time, unchanged.";
  const seenTemperatures: number[] = [];
  await page.route("https://api.openai.com/v1/chat/completions", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    seenTemperatures.push(body.temperature);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: STABLE_ANSWER } }] }),
    });
  });

  await activateRealMode(page);
  await reachGenerationStep(page);

  const answer = page.locator('[data-generated-answer="true"]');
  await expect(answer).toBeVisible();

  const temperatureSlider = page.getByRole("slider", { name: "Temperature" });
  await temperatureSlider.focus();
  await page.keyboard.press("Home"); // native range-input behavior: jumps to min (0.0)
  await page.waitForTimeout(SETTLE_MS);
  const firstLowTempAnswer = await answer.textContent();

  await page.getByRole("button", { name: "Regenerate at this temperature" }).click();
  await page.waitForTimeout(SETTLE_MS);
  const secondLowTempAnswer = await answer.textContent();

  expect(firstLowTempAnswer).toBe(STABLE_ANSWER);
  expect(secondLowTempAnswer).toBe(STABLE_ANSWER);
  expect(seenTemperatures.some((t) => t === 0)).toBe(true);

  // The UI must disclose the "very consistent, not guaranteed identical"
  // caveat rather than overclaiming a guarantee Real Mode can't make
  // (spec.md Edge Cases).
  await expect(page.getByText(/very consistent, not guaranteed identical/i)).toBeVisible();
});
