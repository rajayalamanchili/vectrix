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

function failChatCompletions(page: Page, status: number) {
  return page.route("https://api.openai.com/v1/chat/completions", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { message: "mocked failure" } }) }),
  );
}

test.describe("Real Mode failure -> fallback (final-generate)", () => {
  test("final-generate: a 401 shows an invalid-key error and a working Simulated Mode fallback, after successful retrieval", async ({
    page,
  }) => {
    await succeedEmbeddings(page);
    await failChatCompletions(page, 401);
    await activateRealMode(page);

    await page.getByRole("button", { name: "Retrieval" }).click();
    const useResultsButton = page.getByRole("button", { name: /Use these results in the next step/i });
    await expect(useResultsButton).toBeEnabled();
    await useResultsButton.click();

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

  test("final-generate: retry resumes with the same displayed prompt, not a discarded one", async ({ page }) => {
    await succeedEmbeddings(page);
    // A flag, not a call counter: React 19's Strict Mode double-invokes
    // effects on mount in dev, which issues two real network requests for
    // one logical "run" -- a counter that expects exactly one failing
    // call before success is flaky against that, since both StrictMode
    // invocations can race and resolve out of order. Every call fails
    // until the test explicitly flips this after observing the error.
    let shouldFail = true;
    await page.route("https://api.openai.com/v1/chat/completions", (route) => {
      if (shouldFail) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: { message: "mocked failure" } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: "A real, mocked answer." } }] }),
      });
    });
    await activateRealMode(page);

    await page.getByRole("button", { name: "Retrieval" }).click();
    await page.getByRole("button", { name: /Use these results in the next step/i }).click();

    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/rejected this API key/i);

    shouldFail = false;
    await banner.getByRole("button", { name: "Retry" }).click();

    await expect(page.locator('[data-real-disclosure="true"]')).toContainText(/Real answer via OpenAI/i);
    await expect(page.getByText("A real, mocked answer.")).toBeVisible();
  });
});

/**
 * US5 (Compare Variants' real HyDE/RAG-Fusion execution): the remaining
 * four of FR-016's canonical call types, `/speckit.analyze` finding E1's
 * "individually test each type" bar. Unlike Pipeline Walkthrough's
 * embedding/generation calls (issued from a `useEffect` on mount, subject
 * to Next dev's double effect-invocation -- see the `final-generate`
 * retry test above), every call here is issued from a click handler, so
 * plain request counting is reliable -- no settle-wait/flag workaround
 * needed.
 */

async function activateRealModeOnVariants(page: Page) {
  await page.goto("/concepts/rag");
  await page.getByRole("button", { name: "Compare Variants" }).click();
  await page.getByRole("switch", { name: "Real Mode" }).click();
  await page.getByLabel("OpenAI API key").fill(TEST_KEY);
  await page.getByRole("button", { name: "Activate Real Mode" }).click();
}

function succeedEmbeddingsOf(n: number) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: Array.from({ length: n }, (_, i) => ({ embedding: [0.1 + i * 0.01, 0.2, 0.3] })) }),
  } as const;
}

test.describe("Real Mode failure -> fallback (HyDE/RAG-Fusion intermediate calls)", () => {
  test("hypothesis-generate: fails on the 2nd of 2 hypotheses, retry resumes without re-generating the 1st", async ({
    page,
  }) => {
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const n = Array.isArray(body.input) ? body.input.length : 1;
      return route.fulfill(succeedEmbeddingsOf(n));
    });
    let hypothesisCalls = 0;
    await page.route("https://api.openai.com/v1/chat/completions", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const content = body.messages[0].content as string;
      if (content.includes("hypothetical answer")) {
        hypothesisCalls += 1;
        if (hypothesisCalls === 2) {
          return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: {} }) });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ choices: [{ message: { content: `Hypothesis from call ${hypothesisCalls}` } }] }),
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

    await expect(page.getByText("Hypothesis from call 1")).toBeVisible();
    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/rejected this API key/i);
    // Already-succeeded first hypothesis stays visible through the failure.
    await expect(page.getByText("Hypothesis from call 1")).toBeVisible();

    await banner.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByText("Hypothesis from call 3")).toBeVisible();
    // The first hypothesis was never re-issued/re-rendered under a new call number.
    await expect(page.getByText("Hypothesis from call 1")).toBeVisible();
    await expect(page.getByText(/Hypothesis from call 2/)).toHaveCount(0);
    await expect(page.locator('[data-generated-answer="true"]')).toHaveText("Final HyDE answer.");
    expect(hypothesisCalls).toBe(3); // 1 (succeeded) + 1 (failed) + 1 (retry succeeded)
  });

  test("hypothesis-embed: fails once, retry re-issues exactly one embeddings request for it", async ({ page }) => {
    let hypothesisEmbedShouldFail = true;
    let hypothesisEmbedAttempts = 0;
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
      if (texts.length === 1) {
        hypothesisEmbedAttempts += 1;
        if (hypothesisEmbedShouldFail) {
          hypothesisEmbedShouldFail = false;
          return route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: {} }) });
        }
      }
      return route.fulfill(succeedEmbeddingsOf(texts.length));
    });
    await page.route("https://api.openai.com/v1/chat/completions", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const content = body.messages[0].content as string;
      const answer = content.includes("hypothetical answer") ? "The only hypothesis." : "Final HyDE answer.";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: answer } }] }),
      });
    });

    await activateRealModeOnVariants(page);
    await page.getByRole("button", { name: "Show real-execution panel for HyDE" }).click();
    await page.getByRole("button", { name: "Run HyDE" }).click();

    await expect(page.getByText("The only hypothesis.")).toBeVisible();
    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/rate-limiting/i);

    await banner.getByRole("button", { name: "Retry" }).click();

    await expect(page.locator('[data-generated-answer="true"]')).toHaveText("Final HyDE answer.");
    expect(hypothesisEmbedAttempts).toBe(2); // 1 failed + 1 retry-succeeded
  });

  test("variant-query-generate: fails once, retry re-issues exactly one request and the run completes", async ({
    page,
  }) => {
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const n = Array.isArray(body.input) ? body.input.length : 1;
      return route.fulfill(succeedEmbeddingsOf(n));
    });
    let variantQueryGenerateCalls = 0;
    await page.route("https://api.openai.com/v1/chat/completions", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const content = body.messages[0].content as string;
      if (content.includes("different phrasings")) {
        variantQueryGenerateCalls += 1;
        if (variantQueryGenerateCalls === 1) {
          return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: {} }) });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ choices: [{ message: { content: "Phrasing A?\nPhrasing B?\nPhrasing C?" } }] }),
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
    await page.getByRole("button", { name: "Run RAG-Fusion" }).click();

    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/rejected this API key/i);
    await expect(page.getByText("Phrasing A?")).toHaveCount(0);

    await banner.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByText("Phrasing A?")).toBeVisible();
    await expect(page.locator('[data-generated-answer="true"]')).toHaveText("Final fusion answer.");
    expect(variantQueryGenerateCalls).toBe(2); // 1 failed + 1 retry-succeeded
  });

  test("variant-embed: fails on the 2nd of 3 variants, retry resumes without re-embedding the 1st", async ({ page }) => {
    let variantEmbedCalls = 0;
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
      if (texts.length === 1) {
        variantEmbedCalls += 1;
        if (variantEmbedCalls === 2) {
          return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: {} }) });
        }
      }
      return route.fulfill(succeedEmbeddingsOf(texts.length));
    });
    await page.route("https://api.openai.com/v1/chat/completions", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const content = body.messages[0].content as string;
      const answer = content.includes("different phrasings")
        ? "Phrasing A?\nPhrasing B?\nPhrasing C?"
        : "Final fusion answer.";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: answer } }] }),
      });
    });

    await activateRealModeOnVariants(page);
    await page.getByRole("button", { name: "Show real-execution panel for RAG-Fusion" }).click();
    await page.getByRole("button", { name: "Run RAG-Fusion" }).click();

    await expect(page.getByText("Phrasing A?")).toBeVisible();
    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/rejected this API key/i);
    // Variant 1's own text (already embedded+retrieved) stays visible through the failure.
    await expect(page.getByText("Phrasing A?")).toBeVisible();

    await banner.getByRole("button", { name: "Retry" }).click();

    await expect(page.locator('[data-generated-answer="true"]')).toHaveText("Final fusion answer.");
    await expect(page.getByText("Phrasing A?")).toBeVisible();
    expect(variantEmbedCalls).toBe(4); // variant1(1) + variant2 failed(2) + variant2 retried(3) + variant3(4)
  });
});

/**
 * US6 (EvalPanel's recall@K evaluation): FR-011's partial-failure handling
 * reuses `RealModeError`'s existing `"partial-failure"` mechanism, the same
 * shape as the HyDE/RAG-Fusion tests above -- `/speckit.analyze` finding N5,
 * 2026-08-06, closing the one call type (`eval-retrieve`) that previously
 * had no automated regression coverage.
 */
test.describe("Real Mode failure -> fallback (evaluation partial failure)", () => {
  test("eval-retrieve: fails on the 2nd of 3 pairs, retry re-scores only that pair and the first pair's result stays visible", async ({
    page,
  }) => {
    // Naive is the first configuration EvalPanel scores, so its corpus-embed
    // (a batched, multi-text call) plus one query-embed (single-text) per
    // pair is what's under test here -- HyDE/RAG-Fusion are never reached
    // since the run fails closed before advancing past naive.
    let queryEmbedCalls = 0;
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const texts: string[] = Array.isArray(body.input) ? body.input : [body.input];
      if (texts.length === 1) {
        queryEmbedCalls += 1;
        if (queryEmbedCalls === 2) {
          return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: {} }) });
        }
      }
      return route.fulfill(succeedEmbeddingsOf(texts.length));
    });

    await activateRealModeOnVariants(page);

    const questionInput = page.getByLabel("Evaluation question");
    const chunkPicker = page.getByLabel("Expected chunk");
    for (let i = 1; i <= 3; i++) {
      await questionInput.fill(`Eval question ${i}?`);
      await chunkPicker.selectOption({ index: 1 });
      await page.getByRole("button", { name: "Add pair" }).click();
    }

    await page.getByRole("button", { name: "Run evaluation" }).click();

    // First pair's score is visible before the second pair fails.
    await expect(page.getByText(/Scoring\.\.\. 1\/3/)).toBeVisible();

    const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/rejected this API key/i);
    // First pair's partial result is still shown, not discarded by the failure.
    await expect(page.getByText(/Scoring\.\.\. 1\/3/)).toBeVisible();

    await banner.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByText(/3\/3 pairs scored/)).toBeVisible();
    expect(queryEmbedCalls).toBe(4); // pair1(1) + pair2 failed(2) + pair2 retried(3) + pair3(4)
  });
});
