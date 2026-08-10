import { test, expect, type Page } from "@playwright/test";

/**
 * SC-008: raising RAG-Fusion's N (query-variant count) is a real
 * parameter with a real effect -- re-running with a different N produces
 * a visibly different fused ranking, and the captured request count for
 * each run matches the `N + 3` formula (`callEstimate.ts`'s
 * `fusionCallCount`). The provider is mocked at the HTTP layer via route
 * interception -- no real API key is used or needed.
 *
 * The corpus ("coffee" doc, chunk size 60/overlap 15 -- Compare
 * Variants' fixed defaults) produces exactly 6 chunks; corpus vectors
 * are one-hot per chunk index so cosine similarity is unambiguous (each
 * variant vector is also one-hot, so its own top-1 match is always
 * exactly the chunk sharing its index, with every other chunk at
 * similarity 0 -- no near-ties to worry about).
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";
const CHUNK_COUNT = 6;
// Distinct chunk-0 vs. chunk-4 text fragments (see sampleDocs.ts's "coffee" doc).
const CHUNK_0_FRAGMENT = "Pour-over brewing relies";
const CHUNK_4_FRAGMENT = "coarse grind steeped in cold";

function oneHot(index: number, dim: number): number[] {
  return Array.from({ length: dim }, (_, i) => (i === index ? 1 : 0));
}

async function activateRealModeOnVariants(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("button", { name: "Compare Variants" }).click();
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

function mockProvider(page: Page) {
  page.route("https://api.openai.com/v1/embeddings", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
    if (texts.length > 1) {
      // corpus-embed: chunk i -> one-hot at position i.
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: texts.map((_, i) => ({ embedding: oneHot(i, texts.length) })) }),
      });
    }
    // variant-embed: every phrasing this test generates names its target
    // chunk index directly in its own text (see mockProvider's chat
    // handler below), so it can be echoed straight into a one-hot vector.
    const match = texts[0].match(/chunk(\d)/);
    const idx = match ? Number(match[1]) : 0;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [{ embedding: oneHot(idx, CHUNK_COUNT) }] }),
    });
  });

  page.route("https://api.openai.com/v1/chat/completions", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const content = body.messages[0].content as string;
    const nMatch = content.match(/into (\d+) different phrasings/);
    if (nMatch) {
      const n = Number(nMatch[1]);
      // N=2 run: every phrasing targets chunk 0. N=4 run: every phrasing
      // targets chunk 4. Each variant is one-hot, so within one run every
      // phrasing's own top-1 is identical (the whole point: to prove the
      // *fused* ranking's top-1 differs only because N itself changed
      // which target chunk this run's phrasings all point at).
      const targetChunk = n === 2 ? 0 : 4;
      const lines = Array.from({ length: n }, (_, i) => `Phrasing ${i + 1} for chunk${targetChunk}?`);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: lines.join("\n") } }] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: "Final fusion answer." } }] }),
    });
  });
}

test("raising N changes the fused top-1 chunk, and each run's request count matches N + 3", async ({ page }) => {
  mockProvider(page);

  let totalRequests = 0;
  page.on("request", (req) => {
    if (req.url().startsWith("https://api.openai.com")) totalRequests += 1;
  });

  await activateRealModeOnVariants(page);
  await page.getByRole("button", { name: "Show real-execution panel for RAG-Fusion" }).click();

  const nSlider = page.getByRole("slider", { name: "RAG-Fusion query variants (N)" });
  await nSlider.focus();
  await page.keyboard.press("ArrowLeft"); // default 3 -> 2

  await page.getByRole("button", { name: "Run RAG-Fusion" }).click();
  // Wait for the *final answer* specifically (not just any intermediate
  // per-variant text) -- that's the last of the N+3 calls to complete, so
  // its presence is the ground truth that this run has fully settled
  // before the request count is checked.
  await expect(page.locator('[data-generated-answer="true"]')).toBeVisible();
  const fusedRank1N2 = page.locator('[data-fused-rank="1"]');
  await expect(fusedRank1N2).toContainText(CHUNK_0_FRAGMENT);

  const requestsAfterN2 = totalRequests;
  expect(requestsAfterN2).toBe(5); // corpus-embed(1) + variant-query-generate(1) + variant-embed(2) + final-generate(1) = N+3 = 5

  await nSlider.focus();
  await page.keyboard.press("ArrowRight"); // 2 -> 3
  await page.keyboard.press("ArrowRight"); // 3 -> 4
  await page.getByRole("button", { name: "Run RAG-Fusion" }).click();

  // The fused top-1 changes from chunk 0 (N=2 run) to chunk 4 (N=4 run) --
  // a visibly different ranking for a different N, not the old one
  // lingering. `data-fused-rank="1"` re-renders in place, so waiting for
  // its *content* to change is the correct way to detect this run has
  // also fully completed (a plain visibility check would pass instantly
  // on the still-mounted N=2 element before the new run even starts).
  const fusedRank1N4 = page.locator('[data-fused-rank="1"]');
  await expect(fusedRank1N4).toContainText(CHUNK_4_FRAGMENT, { timeout: 10_000 });
  await expect(fusedRank1N4).not.toContainText(CHUNK_0_FRAGMENT);

  const requestsAfterN4 = totalRequests - requestsAfterN2;
  expect(requestsAfterN4).toBe(7); // corpus-embed(1) + variant-query-generate(1) + variant-embed(4) + final-generate(1) = N+3 = 7
});
