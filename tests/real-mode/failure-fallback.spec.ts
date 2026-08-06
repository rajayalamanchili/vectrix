import { test, expect, type Page } from "@playwright/test";

/**
 * SC-004: every one of FR-016's canonical Real Mode call types must fail
 * with a specific, clear error and a working fallback to Simulated Mode
 * -- never silently substituting simulated output while implying it's
 * real. This spec covers this phase's two call types (`corpus-embed`,
 * `query-embed` -- both issued from the Embedding/Retrieval steps); the
 * remaining five (hypothesis-embed, variant-embed, hypothesis-generate,
 * variant-query-generate, final-generate) are added alongside the User
 * Story that makes each call exist (US4/US5/US6), per
 * contracts/real-mode-automated-checks-contract.md.
 *
 * The provider is mocked at the HTTP layer via route interception -- no
 * real API key is used or needed.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";

async function activateRealMode(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

function failEmbeddings(page: Page, status: number) {
  return page.route("https://api.openai.com/v1/embeddings", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { message: "mocked failure" } }) }),
  );
}

test.describe("Real Mode failure -> fallback (corpus-embed, query-embed)", () => {
  test("corpus-embed: a 401 shows an invalid-key error and a working Simulated Mode fallback", async ({ page }) => {
    await failEmbeddings(page, 401);
    await activateRealMode(page);
    await page.getByRole("button", { name: "Embedding" }).click();

    // Excludes Next.js's own route-announcer live region, which also
    // carries role="alert".
    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/rejected this API key/i);

    await banner.getByRole("button", { name: "Switch to Simulated Mode" }).click();
    await expect(page.getByRole("switch", { name: "Real Mode" })).toHaveAttribute("aria-checked", "false");
    // Simulated Mode's own disclosure is back, proving the fallback actually
    // restores working (simulated) output rather than a dead end.
    await expect(page.locator('[data-simulated-disclosure="true"]')).toBeVisible();
  });

  test("corpus-embed: a 429 shows a rate-limit error", async ({ page }) => {
    await failEmbeddings(page, 429);
    await activateRealMode(page);
    await page.getByRole("button", { name: "Embedding" }).click();

    // Excludes Next.js's own route-announcer live region, which also
    // carries role="alert".
    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toContainText(/rate-limiting/i);
  });

  test("corpus-embed: a network failure shows a network error", async ({ page }) => {
    await page.route("https://api.openai.com/v1/embeddings", (route) => route.abort("failed"));
    await activateRealMode(page);
    await page.getByRole("button", { name: "Embedding" }).click();

    // Excludes Next.js's own route-announcer live region, which also
    // carries role="alert".
    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toContainText(/could not reach the provider/i);
  });

  test("query-embed: fails independently of a succeeded corpus-embed, with its own banner and fallback", async ({
    page,
  }) => {
    let call = 0;
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      call += 1;
      if (call === 1) {
        // Corpus-embed succeeds (Embedding step's own call).
        const body = JSON.parse(route.request().postData() ?? "{}");
        const n = Array.isArray(body.input) ? body.input.length : 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3] })) }),
        });
      }
      // Retrieval step's own corpus-embed (call 2) also succeeds; its
      // query-embed (call 3) is the one under test and fails.
      if (call === 2) {
        const body = JSON.parse(route.request().postData() ?? "{}");
        const n = Array.isArray(body.input) ? body.input.length : 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3] })) }),
        });
      }
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: {} }) });
    });

    await activateRealMode(page);
    await page.getByRole("button", { name: "Embedding" }).click();
    await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();

    await page.getByRole("button", { name: "Retrieval" }).click();
    // Excludes Next.js's own route-announcer live region, which also
    // carries role="alert".
    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/rejected this API key/i);

    await banner.getByRole("button", { name: "Switch to Simulated Mode" }).click();
    await expect(page.getByRole("switch", { name: "Real Mode" })).toHaveAttribute("aria-checked", "false");
  });
});
