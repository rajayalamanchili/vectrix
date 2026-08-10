import { test, expect } from "@playwright/test";

/**
 * SC-006 (dynamic half): the learner's API key must never appear, in any
 * header/body/query string, in a request to anything other than the
 * configured provider's own origin. The static half (no server-route
 * file exists at all) lives in scripts/checks/key-isolation.ts -- this
 * spec is the behavioral proof, captured via `page.on('request')` over a
 * real Real Mode flow through the Embedding step, provider responses
 * mocked so no real key/network is needed.
 * See contracts/real-mode-automated-checks-contract.md.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";
const PROVIDER_ORIGIN = "https://api.openai.com";

test("no request containing the API key targets a non-provider origin", async ({ page }) => {
  await page.route("https://api.openai.com/v1/embeddings", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const n = Array.isArray(body.input) ? body.input.length : 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3] })) }),
    });
  });

  const offendingRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    const headers = request.headers();
    const containsKey =
      url.includes(TEST_KEY) ||
      (request.postData() ?? "").includes(TEST_KEY) ||
      Object.values(headers).some((v) => v.includes(TEST_KEY));
    if (containsKey && !url.startsWith(PROVIDER_ORIGIN)) {
      offendingRequests.push(url);
    }
  });

  await page.goto("/concepts/rag");
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
  await page.getByRole("button", { name: "Embedding" }).click();
  await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Retrieval" }).click();
  await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();

  expect(offendingRequests, `key-containing requests to a non-provider origin: ${offendingRequests.join(", ")}`).toEqual(
    [],
  );
});
