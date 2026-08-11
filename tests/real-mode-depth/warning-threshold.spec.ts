import { test, expect, type Page } from "@playwright/test";

/**
 * SC-004, FR-007: crossing a configured warning threshold surfaces a
 * visible warning before, not after, the next real call is made, and
 * "Proceed anyway" still lets that call through. Covers both an
 * auto-firing real call (EmbeddingStep's corpus-embed effect) and a
 * click-triggered multi-call action (Compare Variants' naive run). The
 * provider is mocked at the HTTP layer via route interception -- no
 * real API key is used or needed.
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

async function setThreshold(page: Page, value: string) {
  const input = page.getByLabel("Cumulative real-mode cost warning threshold, in dollars");
  await input.fill(value);
}

test("effect-triggered call (Embedding step): warning appears before the call fires, Proceed anyway lets it through", async ({
  page,
}) => {
  mockProvider(page);
  let embedRequests = 0;
  page.on("request", (req) => {
    if (req.url() === "https://api.openai.com/v1/embeddings") embedRequests += 1;
  });

  await activateRealMode(page);
  // A threshold of $0 is already "crossed" the instant any cost exists,
  // so even the very first real call on this page is gated.
  await setThreshold(page, "0");

  await page.getByRole("button", { name: "Pipeline Walkthrough" }).click();
  await page.getByRole("button", { name: /Embedding/ }).click();

  await expect(page.getByRole("alert").getByText(/warning threshold/)).toBeVisible();
  expect(embedRequests).toBe(0);

  await page.getByRole("button", { name: "Proceed anyway" }).click();
  await expect(page.locator('[data-cost-ledger-total="true"]')).toContainText("1 call");
  expect(embedRequests).toBe(1);
});

test("click-triggered multi-call run (Compare Variants naive): warning appears before any request fires", async ({
  page,
}) => {
  mockProvider(page);
  await activateRealMode(page);

  await page.getByRole("button", { name: "Compare Variants" }).click();

  // First run accumulates a non-zero total under the default $1 threshold.
  await page.getByRole("button", { name: "Run for real →" }).first().click();
  await expect(page.locator('[data-generated-answer="true"]')).toBeVisible();
  await expect(page.locator('[data-cost-ledger-total="true"]')).toContainText("3 calls");

  // Now lower the threshold below the accumulated total.
  await setThreshold(page, "0.0001");

  let requestsSinceLowering = 0;
  page.on("request", (req) => {
    if (req.url().startsWith("https://api.openai.com")) requestsSinceLowering += 1;
  });

  await page.getByRole("button", { name: "Run for real →" }).first().click();
  await expect(page.getByRole("alert").getByText(/warning threshold/)).toBeVisible();
  expect(requestsSinceLowering).toBe(0);

  await page.getByRole("button", { name: "Proceed anyway" }).click();
  await expect(page.locator('[data-cost-ledger-total="true"]')).toContainText("6 calls");
  expect(requestsSinceLowering).toBeGreaterThan(0);
});
