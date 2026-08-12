import { test, expect, type Page } from "@playwright/test";

/**
 * SC-003 (002-real-mode): from key submission, a real, disclosed-as-real
 * embedding chart must appear -- previously only evidenced by a manual,
 * timed walkthrough against the live OpenAI API (roadmap.md T023/T058),
 * never a committed test. The literal "under 60 seconds against a live
 * provider" wall-clock claim genuinely requires a live provider call and
 * stays a manual, documented verification per FR-006/Edge Cases (006-
 * test-suite-ci/spec.md) -- this spec instead asserts the half that *is*
 * this app's own responsibility and *is* mockable: once the provider's
 * response resolves, the real chart and its "real" disclosure render
 * promptly, with no artificial UI-added delay on top of the network
 * call. The provider is mocked at the HTTP layer -- no real API key.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";

async function activateRealMode(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

test("submitting a valid key renders a real, disclosed-as-real embedding chart promptly once the provider responds", async ({
  page,
}) => {
  await page.route("https://api.openai.com/v1/embeddings", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const n = Array.isArray(body.input) ? body.input.length : 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3] })) }),
    });
  });

  await activateRealMode(page);
  await page.getByRole("button", { name: "Embedding" }).click();

  const disclosure = page.locator('[data-real-disclosure="true"]');
  await expect(disclosure).toBeVisible({ timeout: 5000 });
  await expect(disclosure).toContainText(/Real embeddings via/);
  await expect(page.getByRole("img", { name: "Embedding space star chart" })).toBeVisible();
});
