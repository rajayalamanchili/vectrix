import { test, expect, type Page } from "@playwright/test";

/**
 * SC-002, FR-006: the session-wide cost/call ledger's displayed total
 * persists correctly across at least three real actions in different
 * steps/views, exactly equals the sum of those actions' own pre-shown
 * estimates, and survives navigation (but not a document/state-change
 * reset without the learner explicitly answering the reset prompt) or
 * toggling Real Mode off and back on. The provider is mocked at the
 * HTTP layer via route interception -- no real API key is used or
 * needed.
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

const ledgerTotal = (page: Page) => page.locator('[data-cost-ledger-total="true"]');

test("total persists across three real actions in different views and matches the sum of their own estimates", async ({
  page,
}) => {
  mockProvider(page);
  await activateRealMode(page);

  // Action 1 -- Compare Variants' naive run (corpus-embed + query-embed + generate = 3 calls, $0.00017).
  await page.getByRole("button", { name: "Compare Variants" }).click();
  await page.getByRole("button", { name: "Run for real →" }).first().click();
  await expect(page.locator('[data-generated-answer="true"]')).toBeVisible();
  await expect(ledgerTotal(page)).toContainText("3 calls");

  // Action 2 -- Compare Variants' HyDE run (corpus-embed + 1 hypothesis-generate +
  // hypotheses-batch-embed + final-generate = 4 calls, $0.00032, default hydeCount=1).
  await page.getByRole("button", { name: "Show real-execution panel for HyDE" }).click();
  await page.getByRole("button", { name: "Run HyDE" }).click();
  await expect(page.locator('[data-real-disclosure="true"]')).toContainText(/HyDE/);
  await expect(ledgerTotal(page)).toContainText("7 calls");

  // Action 3 -- Compare Simulated vs Real's naive run. This view compares
  // retrieval rankings only, not generated answers (contracts/comparison-
  // contract.md's Non-goals) -- corpus-embed + query-embed, 2 calls,
  // $0.00002, no final-generate call.
  await page.getByRole("button", { name: "Compare Simulated vs Real" }).click();
  await page.getByRole("button", { name: /Run Naive RAG for real/ }).click();
  await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();

  const expectedCalls = 3 + 4 + 2;
  const expectedCostUsd = 2 * 0.00001 + 1 * 0.00015 + (2 * 0.00001 + 2 * 0.00015) + 2 * 0.00001;
  await expect(ledgerTotal(page)).toContainText(`${expectedCalls} calls`);
  await expect(ledgerTotal(page)).toContainText(`$${expectedCostUsd.toFixed(5)}`);

  // Navigating between views/steps does not reset the total.
  await page.getByRole("button", { name: "Pipeline Walkthrough" }).click();
  await expect(ledgerTotal(page)).toContainText(`${expectedCalls} calls`);
  await page.getByRole("button", { name: "Compare Variants" }).click();
  await expect(ledgerTotal(page)).toContainText(`${expectedCalls} calls`);
});

test("FR-006: a document change asks before resetting the total -- Keep accumulating leaves it unchanged, Reset total zeroes it", async ({
  page,
}) => {
  mockProvider(page);
  await activateRealMode(page);

  await page.getByRole("button", { name: "Compare Variants" }).click();
  await page.getByRole("button", { name: "Run for real →" }).first().click();
  await expect(page.locator('[data-generated-answer="true"]')).toBeVisible();
  await expect(ledgerTotal(page)).not.toContainText("0 calls");

  // Switching the active document is a doc-change event.
  await page.getByRole("button", { name: "Employee Benefits Handbook Excerpt" }).click();

  const resetPrompt = page.getByText("Keep accumulating the session cost total, or reset it to zero?");
  await expect(resetPrompt).toBeVisible();

  await page.getByRole("button", { name: "Keep accumulating" }).click();
  await expect(resetPrompt).not.toBeVisible();
  await expect(ledgerTotal(page)).toContainText("3 calls");

  // Trigger the prompt again and this time reset.
  await page.getByRole("button", { name: "Home Coffee Brewing Guide" }).click();
  await expect(resetPrompt).toBeVisible();
  await page.getByRole("button", { name: "Reset total" }).click();
  await expect(resetPrompt).not.toBeVisible();
  await expect(ledgerTotal(page)).toContainText("0 calls");
  await expect(ledgerTotal(page)).toContainText("$0.00000");
});

test("Edge Case: toggling Real Mode off and back on leaves the displayed total unchanged", async ({ page }) => {
  mockProvider(page);
  await activateRealMode(page);

  await page.getByRole("button", { name: "Compare Variants" }).click();
  await page.getByRole("button", { name: "Run for real →" }).first().click();
  await expect(page.locator('[data-generated-answer="true"]')).toBeVisible();
  await expect(ledgerTotal(page)).toContainText("3 calls");

  await page.getByRole("switch", { name: "Real Mode" }).click(); // off
  await expect(ledgerTotal(page)).toContainText("3 calls");
  await page.getByRole("switch", { name: "Real Mode" }).click(); // back on
  await expect(ledgerTotal(page)).toContainText("3 calls");
});
