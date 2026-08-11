import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * SC-003 (spec.md Acceptance Scenarios 1, 3): generate a permalink with
 * non-default values across every FR-005 parameter, open it in a fresh
 * browser context with no prior state, and confirm every value
 * reproduces exactly. Also covers the Edge Case of generating a
 * permalink while a sweep is active/awaiting-confirmation: only
 * pre-sweep parameters must be encoded (quickstart.md scenario 8).
 */

async function setNonDefaultParams(page: Page) {
  await page.goto("/concepts/rag");

  await page.getByRole("button", { name: "Chunking" }).click();
  const chunkSizeSlider = page.getByRole("slider", { name: "Chunk size" });
  await chunkSizeSlider.focus();
  await chunkSizeSlider.fill("85");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");

  const overlapSlider = page.getByRole("slider", { name: "Overlap" });
  await overlapSlider.focus();
  await overlapSlider.fill("30");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");

  await page.getByRole("button", { name: "Sentence-boundary chunking strategy" }).click();

  await page.getByRole("button", { name: "Retrieval" }).click();
  const queryInput = page.getByPlaceholder("Or type your own question...");
  await queryInput.fill("a non-default permalink test question");

  const thresholdSlider = page.getByRole("slider", { name: "Minimum similarity score" });
  await thresholdSlider.focus();
  await thresholdSlider.fill("0.2");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");

  const topKSlider = page.getByRole("slider", { name: "Top-K retrieved" });
  await topKSlider.focus();
  await topKSlider.fill("5");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
}

async function copyPermalink(page: Page, context: BrowserContext): Promise<URL> {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Generate permalink" }).click();
  await expect(page.getByText("Copied to clipboard")).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  return new URL(clip);
}

test("every encoded parameter round-trips exactly in a fresh browser context", async ({ page, context }) => {
  await setNonDefaultParams(page);
  const url = await copyPermalink(page, context);

  const fresh = await context.newPage();
  await fresh.goto(url.pathname + url.search);

  await fresh.getByRole("button", { name: "Chunking" }).click();
  await expect(fresh.getByRole("slider", { name: "Chunk size" })).toHaveValue("85");
  await expect(fresh.getByRole("slider", { name: "Overlap" })).toHaveValue("30");
  await expect(fresh.getByRole("button", { name: "Sentence-boundary chunking strategy" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await fresh.getByRole("button", { name: "Retrieval" }).click();
  await expect(fresh.getByPlaceholder("Or type your own question...")).toHaveValue(
    "a non-default permalink test question",
  );
  await expect(fresh.getByRole("slider", { name: "Minimum similarity score" })).toHaveValue("0.2");
  await expect(fresh.getByRole("slider", { name: "Top-K retrieved" })).toHaveValue("5");
});

test("a permalink generated while a sweep is running encodes only pre-sweep parameters", async ({ page, context }) => {
  await page.goto("/concepts/rag");
  await page.getByRole("button", { name: "Retrieval" }).click();
  await page.getByRole("button", { name: "Sweep chunk size (9 points)" }).click();

  // Sweep points are now "done" (Simulated Mode is synchronous), but the
  // pipeline's own chunkSize state hasn't changed -- no point was
  // activated. The permalink must reflect that pre-sweep state, not any
  // point on the curve.
  const url = await copyPermalink(page, context);
  expect(url.searchParams.get("cs")).toBe("60"); // the pipeline's own default chunk size, untouched by the sweep
});

test("a permalink generated while a Real Mode sweep is awaiting confirmation encodes only pre-sweep parameters", async ({
  page,
  context,
}) => {
  const TEST_KEY = "sk-test-fixture-key-1234567890";
  await page.route("https://api.openai.com/v1/embeddings", (route) => {
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
  await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Sweep chunk size (9 points)" }).click();
  await expect(page.getByText(/Estimated calls for this sweep:\s*10/)).toBeVisible();

  const url = await copyPermalink(page, context);
  expect(url.searchParams.get("cs")).toBe("60");
  expect(url.searchParams.get("mode")).toBe("real");
});
