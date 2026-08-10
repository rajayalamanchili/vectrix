import { test, expect, type Page } from "@playwright/test";

/**
 * SC-005: for HyDE and RAG-Fusion, 100% of their intermediate execution
 * steps (scoped to FR-016's canonical call-type list) are visible in the
 * UI during a real run, not only the final result -- this spec asserts
 * every intermediate element (each hypothesis; each query variant + its
 * own per-variant ranking) is present in the DOM *before* the final
 * averaged/fused result renders, for a mocked HyDE run (M >= 2) and a
 * mocked RAG-Fusion run (N >= 2). The provider is mocked at the HTTP
 * layer via route interception -- no real API key is used or needed.
 */

const TEST_KEY = "sk-test-fixture-key-1234567890";

async function activateRealModeOnVariants(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("button", { name: "Compare Variants" }).click();
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

function succeedEmbeddings(page: Page) {
  return page.route("https://api.openai.com/v1/embeddings", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const n = Array.isArray(body.input) ? body.input.length : 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3] })) }),
    });
  });
}

test("HyDE: every hypothesis is visible before the final averaged retrieval/answer renders", async ({ page }) => {
  await succeedEmbeddings(page);

  // Each hypothesis-generate call resolves only after this test has
  // already checked the DOM state *before* it -- see the two `checkpoint`
  // promises below -- so "before the final result renders" is asserted
  // structurally, not just by final-state inspection after the fact.
  let hypothesisCalls = 0;
  let resolveAfterFirstHypothesis: () => void = () => {};
  const afterFirstHypothesis = new Promise<void>((r) => (resolveAfterFirstHypothesis = r));

  await page.route("https://api.openai.com/v1/chat/completions", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const content = body.messages[0].content as string;
    if (content.includes("hypothetical answer")) {
      hypothesisCalls += 1;
      const n = hypothesisCalls;
      if (n === 1) {
        // Hold this response open until the test has captured the DOM
        // state with zero hypotheses visible yet.
        await afterFirstHypothesis;
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: `Hypothesis #${n}` } }] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: "Final HyDE answer." } }] }),
    });
  });

  await activateRealModeOnVariants(page);
  await page.getByRole("button", { name: "Show real-execution panel for HyDE" }).click();
  const hydeSlider = page.getByRole("slider", { name: "HyDE hypothesis count" });
  await hydeSlider.focus();
  await page.keyboard.press("ArrowRight"); // 1 -> 2

  await page.getByRole("button", { name: "Run HyDE" }).click();

  // Before the first hypothesis-generate call even resolves, nothing is
  // visible yet -- confirms the final result truly can't appear before
  // any intermediate step has.
  await expect(page.getByText("Final HyDE answer.")).toHaveCount(0);
  await expect(page.getByText(/Hypothesis #/)).toHaveCount(0);
  resolveAfterFirstHypothesis();

  await expect(page.getByText("Hypothesis #1")).toBeVisible();
  // Hypothesis #1 is visible while #2 is still in flight and the final
  // result doesn't exist yet -- the core SC-005 claim for HyDE.
  await expect(page.getByText("Final HyDE answer.")).toHaveCount(0);

  await expect(page.getByText("Hypothesis #2")).toBeVisible();
  await expect(page.locator('[data-generated-answer="true"]')).toHaveText("Final HyDE answer.");
});

test("RAG-Fusion: every query variant and its own ranking is visible before the fused ranking/answer renders", async ({
  page,
}) => {
  // Variant embeds happen serially with essentially no async gap before
  // the (synchronous, local) fusion step -- holding the 2nd variant's
  // embed request open, the same way the HyDE test above holds its first
  // hypothesis-generate call, is what makes "variant A visible, fused
  // ranking absent" a deterministic checkpoint rather than a timing race.
  let resolveSecondVariantEmbed: () => void = () => {};
  const beforeSecondVariantEmbed = new Promise<void>((r) => (resolveSecondVariantEmbed = r));
  let singleTextEmbedCalls = 0;

  await page.route("https://api.openai.com/v1/embeddings", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
    if (texts.length === 1) {
      singleTextEmbedCalls += 1;
      if (singleTextEmbedCalls === 2) {
        await beforeSecondVariantEmbed;
      }
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: texts.map(() => ({ embedding: [0.1, 0.2, 0.3] })) }),
    });
  });

  await page.route("https://api.openai.com/v1/chat/completions", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    const content = body.messages[0].content as string;
    if (content.includes("different phrasings")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: "Variant query A?\nVariant query B?" } }] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: "Final fusion answer." } }] }),
    });
  });

  await activateRealModeOnVariants(page);
  await page.getByRole("button", { name: "Show real-execution panel for RAG-Fusion" }).click();
  const nSlider = page.getByRole("slider", { name: "RAG-Fusion query variants (N)" });
  await nSlider.focus();
  await page.keyboard.press("ArrowLeft"); // default 3 -> 2

  await page.getByRole("button", { name: "Run RAG-Fusion" }).click();

  // Variant A's own ranking is visible while variant B is still in
  // flight, so the fused ranking provably doesn't exist yet.
  await expect(page.getByText("Variant query A?")).toBeVisible();
  await expect(page.locator('[data-fused-rank="1"]')).toHaveCount(0);
  resolveSecondVariantEmbed();

  await expect(page.getByText("Variant query B?")).toBeVisible();
  await expect(page.locator('[data-fused-rank="1"]')).toBeVisible();
  await expect(page.locator('[data-generated-answer="true"]')).toHaveText("Final fusion answer.");
});
