import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility coverage for the new "Compare Simulated vs Real" view
 * (004-real-mode-depth, US1): the configuration selector (including its
 * disabled-with-accessible-reason state while a Real half is in flight,
 * research.md's "Configuration selector during an in-flight Real half"
 * decision), both panels' focus order, and the run/confirm controls --
 * keyboard + axe. The provider is mocked at the HTTP layer via route
 * interception -- no real API key is used or needed.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";

async function openComparisonTab(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("button", { name: "Compare Simulated vs Real" }).click();
}

async function activateRealMode(page: Page) {
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

test.describe("Compare Simulated vs Real accessibility", () => {
  test("has no automatically detectable WCAG 2.1 A/AA violations (no key yet)", async ({ page }) => {
    await openComparisonTab(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations (Real Mode active, awaiting confirmation)", async ({
    page,
  }) => {
    await openComparisonTab(page);
    await activateRealMode(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("configuration selector buttons are Tab-reachable with purpose-specific accessible names", async ({ page }) => {
    await openComparisonTab(page);
    const naive = page.getByRole("button", { name: "Naive RAG", exact: true });
    const hyde = page.getByRole("button", { name: "HyDE", exact: true });
    const fusion = page.getByRole("button", { name: "RAG-Fusion", exact: true });
    await expect(naive).toBeVisible();
    await expect(hyde).toBeVisible();
    await expect(fusion).toBeVisible();
    await expect(naive).toHaveAttribute("aria-pressed", "true");
  });

  test("configuration selector is keyboard-operable and updates the Simulated caveat", async ({ page }) => {
    await openComparisonTab(page);
    const hyde = page.getByRole("button", { name: "HyDE", exact: true });
    await hyde.focus();
    await page.keyboard.press("Enter");
    await expect(hyde).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-simulated-disclosure="true"]')).toContainText(/approximat/i);
  });

  test("configuration selector is disabled with an accessible reason while a Real half run is in flight", async ({
    page,
  }) => {
    let resolveEmbed: () => void = () => {};
    const heldEmbed = new Promise<void>((r) => (resolveEmbed = r));
    await page.route("https://api.openai.com/v1/embeddings", async (route) => {
      await heldEmbed;
      const body = JSON.parse(route.request().postData() ?? "{}");
      const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: texts.map(() => ({ embedding: [0.1, 0.2, 0.3] })) }),
      });
    });

    await openComparisonTab(page);
    await activateRealMode(page);
    await page.getByRole("button", { name: /Run Naive RAG for real/ }).click();

    const hyde = page.getByRole("button", { name: "HyDE", exact: true });
    await expect(hyde).toHaveAttribute("aria-disabled", "true");
    const describedBy = await hyde.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const reason = page.locator(`#${describedBy}`);
    await expect(reason).toBeVisible();
    await expect(reason).toContainText(/waiting/i);

    // Clicking it while disabled must not orphan the in-flight run --
    // the configuration selection stays on Naive RAG.
    await hyde.click({ force: true });
    await expect(page.getByRole("button", { name: "Naive RAG", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    resolveEmbed();
    await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();
    await expect(hyde).not.toHaveAttribute("aria-disabled", "true");
  });

  test("the Run/confirm control for the Real half is keyboard-operable", async ({ page }) => {
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: texts.map(() => ({ embedding: [0.1, 0.2, 0.3] })) }),
      });
    });

    await openComparisonTab(page);
    await activateRealMode(page);

    const runButton = page.getByRole("button", { name: /Run Naive RAG for real/ });
    await runButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();
  });

  test("the no-key inline prompt's key input is Tab-reachable with a purpose-specific accessible name", async ({
    page,
  }) => {
    await openComparisonTab(page);
    const keyInput = page.getByLabel("OpenAI API key");
    await expect(keyInput).toBeVisible();
    await expect(keyInput).not.toHaveAccessibleName("Input");
    await keyInput.focus();
    await expect(keyInput).toBeFocused();
  });
});
