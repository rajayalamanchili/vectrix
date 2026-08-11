import { test, expect, type Page } from "@playwright/test";

/**
 * SC-001, SC-003, FR-004: both halves of the new "Compare Simulated vs
 * Real" view render for the same document/question, the merged rank
 * table is readable without additional clicks, the cost/call disclosure
 * appears before the Real half's call fires, and the table applies no
 * conditional styling based on how closely a row's simulated/real ranks
 * agree or diverge. The provider is mocked at the HTTP layer via route
 * interception -- no real API key is used or needed.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";

async function activateRealModeOnComparison(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("button", { name: "Compare Simulated vs Real" }).click();
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

function succeedEmbeddings(page: Page) {
  return page.route("https://api.openai.com/v1/embeddings", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      // Distinct-but-arbitrary vectors per input, so the real ranking's
      // order doesn't trivially mirror Simulated Mode's bag-of-words one.
      body: JSON.stringify({
        data: texts.map((t, i) => ({ embedding: [Math.sin(i + t.length), Math.cos(i), 0.05 * i] })),
      }),
    });
  });
}

test("both halves render for the same document/question, and the merged rank table is readable without extra clicks", async ({
  page,
}) => {
  await succeedEmbeddings(page);
  await activateRealModeOnComparison(page);

  await expect(page.locator('[data-simulated-disclosure="true"]')).toBeVisible();
  await expect(page.getByRole("table", { name: /Chunk ranks/ })).toBeVisible();
  await expect(page.locator("table tbody tr").first()).toBeVisible();

  await page.getByRole("button", { name: /Run Naive RAG for real/ }).click();
  await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();

  // Both halves' rankings are visible in the same table without any
  // further interaction (SC-001's "readable without additional clicks").
  const rowCount = await page.locator("table tbody tr").count();
  expect(rowCount).toBeGreaterThan(0);
});

test("cost/call disclosure appears before the Real half's call fires, not after", async ({ page }) => {
  let embedCalled = false;
  await page.route("https://api.openai.com/v1/embeddings", (route) => {
    embedCalled = true;
    const body = JSON.parse(route.request().postData() ?? "{}");
    const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: texts.map(() => ({ embedding: [0.1, 0.2, 0.3] })) }),
    });
  });

  await activateRealModeOnComparison(page);

  await expect(page.getByText(/Estimated calls for this run:/)).toBeVisible();
  expect(embedCalled).toBe(false);

  await page.getByRole("button", { name: /Run Naive RAG for real/ }).click();
  await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();
  expect(embedCalled).toBe(true);
});

test("the rank table applies no conditional styling based on rank agreement or divergence (FR-004)", async ({
  page,
}) => {
  await succeedEmbeddings(page);
  await activateRealModeOnComparison(page);
  await page.getByRole("button", { name: /Run Naive RAG for real/ }).click();
  await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();

  const rows = page.locator("table tbody tr");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(1);

  const classNames = await rows.evaluateAll((els) => els.map((el) => el.className));
  // Every row -- whether its simulated/real ranks happen to agree or
  // diverge for that chunk -- shares the exact same class list.
  expect(new Set(classNames).size).toBe(1);
});

test("HyDE/RAG-Fusion selection shows the Simulated-approximation caveat", async ({ page }) => {
  await activateRealModeOnComparison(page);
  await page.getByRole("button", { name: "HyDE", exact: true }).click();
  await expect(page.locator('[data-simulated-disclosure="true"]')).toContainText(/approximat/i);

  await page.getByRole("button", { name: "RAG-Fusion", exact: true }).click();
  await expect(page.locator('[data-simulated-disclosure="true"]')).toContainText(/approximat/i);
});

test("no-key state renders the Simulated half immediately with an inline key prompt for the Real half", async ({
  page,
}) => {
  await page.goto("/concepts/rag");
  await page.getByRole("button", { name: "Compare Simulated vs Real" }).click();

  await expect(page.locator('[data-simulated-disclosure="true"]')).toBeVisible();
  await expect(page.locator('[data-key-disclaimer="true"]')).toBeVisible();
});
