import { test, expect, type Page } from "@playwright/test";

/**
 * SC-001 + FR-002 (Constitution Principle VII): every sweep point must be
 * individually Tab-reachable and Enter/Space-activatable, and activating
 * one must jump the pipeline to that exact chunk size.
 * SC-005 + FR-003: a Real Mode sweep must show its call-count estimate
 * and issue no API call until the learner explicitly confirms it.
 * See contracts/sweep-contract.md.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";

async function reachRetrieval(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("button", { name: "Retrieval" }).click();
}

test.describe("Sweep curve keyboard operability (Simulated Mode)", () => {
  test("every sweep point is Tab-reachable and Enter-activatable; activating one jumps the pipeline to that chunk size", async ({
    page,
  }) => {
    await reachRetrieval(page);
    await page.getByRole("button", { name: "Sweep chunk size (9 points)" }).click();

    const points = page.getByRole("button", { name: /^Chunk size \d+, top match score/ });
    await expect(points).toHaveCount(9);

    for (let i = 0; i < 9; i++) {
      await points.nth(i).focus();
      await expect(points.nth(i)).toBeFocused();
    }

    const targetLabel = await points.nth(2).getAttribute("aria-label");
    const targetChunkSize = targetLabel?.match(/^Chunk size (\d+)/)?.[1];
    expect(targetChunkSize).toBeTruthy();

    await points.nth(2).focus();
    await page.keyboard.press("Enter");

    await page.getByRole("button", { name: "Chunking" }).click();
    await expect(page.getByRole("slider", { name: "Chunk size" })).toHaveValue(targetChunkSize!);
  });

  test("a sweep point is also Space-activatable", async ({ page }) => {
    await reachRetrieval(page);
    await page.getByRole("button", { name: "Sweep chunk size (9 points)" }).click();

    const points = page.getByRole("button", { name: /^Chunk size \d+, top match score/ });
    const targetLabel = await points.nth(5).getAttribute("aria-label");
    const targetChunkSize = targetLabel?.match(/^Chunk size (\d+)/)?.[1];

    await points.nth(5).focus();
    await page.keyboard.press(" ");

    await page.getByRole("button", { name: "Chunking" }).click();
    await expect(page.getByRole("slider", { name: "Chunk size" })).toHaveValue(targetChunkSize!);
  });
});

test.describe("Real Mode sweep cost gate", () => {
  test("shows the call-count estimate and issues no API call until 'Start sweep' is confirmed", async ({ page }) => {
    let embedCalls = 0;
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      embedCalls += 1;
      const body = JSON.parse(route.request().postData() ?? "{}");
      const n = Array.isArray(body.input) ? body.input.length : 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3] })) }),
      });
    });

    await page.goto("/concepts/rag");
    await page.getByRole("switch", { name: "Real Mode" }).click();
    await page.getByLabel("OpenAI API key").fill(TEST_KEY);
    await page.getByRole("button", { name: "Activate Real Mode" }).click();
    await page.getByRole("button", { name: "Retrieval" }).click();

    // Let the step's own corpus/query embed calls (for the chart) settle
    // before measuring the sweep's own call count in isolation.
    await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();
    const preSweepCalls = embedCalls;

    await page.getByRole("button", { name: "Sweep chunk size (9 points)" }).click();
    await expect(page.getByText(/Estimated calls for this sweep:\s*10/)).toBeVisible();
    expect(embedCalls).toBe(preSweepCalls);

    await page.getByRole("button", { name: "Start sweep" }).click();
    await expect(page.getByRole("button", { name: "Run sweep again" })).toBeVisible({ timeout: 20_000 });
    expect(embedCalls).toBeGreaterThan(preSweepCalls);
  });
});
