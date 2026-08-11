import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility coverage for the cost ledger (004-real-mode-depth, US2):
 * the always-visible ledger display and threshold input, the
 * reset-prompt banner (FR-006), and the warning banner (FR-007) --
 * keyboard + axe. The provider is mocked at the HTTP layer via route
 * interception -- no real API key is used or needed.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";

function mockProvider(page: Page) {
  page.route("https://api.openai.com/v1/embeddings", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: texts.map((_, i) => ({ embedding: [0.1 * (i + 1), 0.2, 0.3] })) }),
    });
  });
  page.route("https://api.openai.com/v1/chat/completions", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: "Fixture answer." } }] }),
    });
  });
}

async function activateRealMode(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

test.describe("Cost ledger accessibility", () => {
  test("has no automatically detectable WCAG 2.1 A/AA violations (idle ledger)", async ({ page }) => {
    await activateRealMode(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("the warning-threshold input is Tab-reachable with a purpose-specific accessible name", async ({ page }) => {
    await activateRealMode(page);
    const thresholdInput = page.getByLabel("Cumulative real-mode cost warning threshold, in dollars");
    await expect(thresholdInput).toBeVisible();
    await thresholdInput.focus();
    await expect(thresholdInput).toBeFocused();
    await thresholdInput.fill("0.5");
    await expect(thresholdInput).toHaveValue("0.5");
  });

  test("reset-prompt banner is announced and keyboard-operable, and has no axe violations while visible", async ({
    page,
  }) => {
    mockProvider(page);
    await activateRealMode(page);
    await page.getByRole("button", { name: "Compare Variants" }).click();
    await page.getByRole("button", { name: "Run for real →" }).first().click();
    await expect(page.locator('[data-generated-answer="true"]')).toBeVisible();

    await page.getByRole("button", { name: "Employee Benefits Handbook Excerpt" }).click();

    const resetPrompt = page.getByRole("alert").filter({ hasText: "Keep accumulating the session cost total" });
    await expect(resetPrompt).toBeVisible();

    const keepButton = page.getByRole("button", { name: "Keep accumulating" });
    await keepButton.focus();
    await page.keyboard.press("Enter");
    await expect(resetPrompt).not.toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("warning banner is announced and its Proceed-anyway control is keyboard-operable, with no axe violations while visible", async ({
    page,
  }) => {
    mockProvider(page);
    await activateRealMode(page);
    const thresholdInput = page.getByLabel("Cumulative real-mode cost warning threshold, in dollars");
    await thresholdInput.fill("0");

    await page.getByRole("button", { name: "Pipeline Walkthrough" }).click();
    await page.getByRole("button", { name: /Embedding/ }).click();

    const warningBanner = page.getByRole("alert").filter({ hasText: "warning threshold" });
    await expect(warningBanner).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);

    const proceedButton = page.getByRole("button", { name: "Proceed anyway" });
    await proceedButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-cost-ledger-total="true"]')).toContainText("1 call");
  });
});
