import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * SC-009 (Real Mode's controls, starting with User Story 1's toggle and
 * API key input) + FR-015: every new Real Mode control must be
 * Tab-reachable, keyboard-activatable, and expose a non-generic
 * accessible name; dynamic content it produces (the key-format error)
 * must be programmatically associated with the control it describes.
 * See contracts/real-mode-automated-checks-contract.md.
 */

test.describe("Real Mode toggle + API key input accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations with the key prompt open", async ({ page }) => {
    await page.getByRole("switch", { name: "Real Mode" }).click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("toggle is Tab-reachable, keyboard-activatable, and has a non-generic accessible name", async ({ page }) => {
    const toggle = page.getByRole("switch", { name: "Real Mode" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(toggle).not.toHaveAccessibleName("Switch");

    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("no key prompt appears until the toggle is activated (zero-setup preserved)", async ({ page }) => {
    await expect(page.locator('[data-key-disclaimer="true"]')).toHaveCount(0);
    await page.getByRole("switch", { name: "Real Mode" }).click();
    await expect(page.locator('[data-key-disclaimer="true"]')).toHaveCount(1);
  });

  test("key input is Tab-reachable and has a purpose-specific accessible name", async ({ page }) => {
    await page.getByRole("switch", { name: "Real Mode" }).click();
    const keyInput = page.getByLabel("OpenAI API key");
    await expect(keyInput).toBeVisible();
    await expect(keyInput).not.toHaveAccessibleName("Input");
  });

  test("a malformed key keeps its typed value and shows an error programmatically associated with the input", async ({
    page,
  }) => {
    await page.getByRole("switch", { name: "Real Mode" }).click();
    const keyInput = page.getByLabel("OpenAI API key");
    await keyInput.fill("not-a-valid-key");
    await page.getByRole("button", { name: "Activate Real Mode" }).click();

    await expect(keyInput).toHaveValue("not-a-valid-key");
    const describedBy = await keyInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const error = page.locator(`#${describedBy}`);
    await expect(error).toBeVisible();
    await expect(error).toContainText(/valid OpenAI API key/i);
  });

  test("submission unblocks the moment the value passes the format check, without re-clicking submit", async ({
    page,
  }) => {
    await page.getByRole("switch", { name: "Real Mode" }).click();
    const keyInput = page.getByLabel("OpenAI API key");
    await keyInput.fill("not-a-valid-key");
    await page.getByRole("button", { name: "Activate Real Mode" }).click();
    const describedBy = await keyInput.getAttribute("aria-describedby");
    await expect(page.locator(`#${describedBy}`)).toBeVisible();

    await keyInput.fill("sk-validlookingkey1234");
    await expect(page.locator(`#${describedBy}`)).toHaveCount(0);
  });

  test("a valid key clears the prompt, and toggling off then back on does not re-request it", async ({ page }) => {
    await page.getByRole("switch", { name: "Real Mode" }).click();
    const keyInput = page.getByLabel("OpenAI API key");
    await keyInput.fill("sk-validlookingkey1234");
    await page.getByRole("button", { name: "Activate Real Mode" }).click();
    await expect(page.locator('[data-key-disclaimer="true"]')).toHaveCount(0);

    const toggle = page.getByRole("switch", { name: "Real Mode" });
    await toggle.click(); // off
    await toggle.click(); // back on
    await expect(page.locator('[data-key-disclaimer="true"]')).toHaveCount(0);
  });
});

/**
 * SC-009 + FR-015: User Story 3's custom document/question input
 * (`CustomDocumentInput.tsx`, rendered by `DocumentStep` whenever
 * `realMode.active` is true, independent of whether a key has been
 * accepted yet). Mirrors the key-format error's correction-in-place
 * pattern -- an over-limit document keeps its typed value and surfaces
 * an `aria-describedby`-associated error, per T012's precedent.
 */
test.describe("Custom document input accessibility (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
    await page.getByRole("switch", { name: "Real Mode" }).click();
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations with the custom document panel open", async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("custom document textarea and question input are Tab-reachable with purpose-specific accessible names", async ({
    page,
  }) => {
    const textarea = page.getByLabel("Paste your own document (Real Mode)");
    await expect(textarea).toBeVisible();
    await expect(textarea).not.toHaveAccessibleName("Textarea");

    const questionInput = page.getByLabel("Custom question");
    await expect(questionInput).toBeVisible();
    await expect(questionInput).not.toHaveAccessibleName("Input");

    await textarea.focus();
    await expect(textarea).toBeFocused();
  });

  test("an over-limit document keeps its typed value and shows an error programmatically associated with the textarea", async ({
    page,
  }) => {
    const textarea = page.getByLabel("Paste your own document (Real Mode)");
    const longText = "a".repeat(10_001);
    await textarea.fill(longText);
    await page.getByRole("button", { name: "Use this document" }).click();

    await expect(textarea).toHaveValue(longText);
    const describedBy = await textarea.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const error = page.locator(`#${describedBy}`);
    await expect(error).toBeVisible();
    await expect(error).toContainText(/10,000-character limit/i);
  });

  test("using a valid custom document reveals a keyboard-activatable revert control", async ({ page }) => {
    const textarea = page.getByLabel("Paste your own document (Real Mode)");
    await textarea.fill("A short custom document about tea brewing.");
    await page.getByLabel("Custom question").fill("How long should tea steep?");
    await page.getByRole("button", { name: "Use this document" }).click();

    const revertButton = page.getByRole("button", { name: "Revert to sample document" });
    await expect(revertButton).toBeVisible();
    await expect(revertButton).not.toHaveAccessibleName("Button");

    await revertButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Paste your own document (Real Mode)")).toBeVisible();
  });
});

/**
 * SC-009 + FR-015: User Story 4's temperature control
 * (`GenerationStep.tsx`, rendered only once Real Mode is active). The
 * provider's embeddings/chat-completions calls are mocked so the
 * Generation step -- and therefore the slider -- can be reached without a
 * real key.
 */
test.describe("Generation temperature control accessibility (US4)", () => {
  const TEST_KEY = "sk-test-fixture-key-1234567890";

  test.beforeEach(async ({ page }) => {
    await page.route("https://api.openai.com/v1/embeddings", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const n = Array.isArray(body.input) ? body.input.length : 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3] })) }),
      });
    });
    await page.route("https://api.openai.com/v1/chat/completions", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: "A mocked real answer." } }] }),
      }),
    );

    await page.goto("/concepts/rag");
    await page.getByRole("switch", { name: "Real Mode" }).click();
    await page.getByLabel("OpenAI API key").fill(TEST_KEY);
    await page.getByRole("button", { name: "Activate Real Mode" }).click();
    await page.getByRole("button", { name: "Retrieval" }).click();
    const useResultsButton = page.getByRole("button", { name: /Use these results in the next step/i });
    await expect(useResultsButton).toBeEnabled();
    await useResultsButton.click();
    await expect(page.locator('[data-real-disclosure="true"]')).toBeVisible();
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations with the temperature control visible", async ({
    page,
  }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("temperature slider is Tab-reachable, keyboard-operable, and has a purpose-specific accessible name", async ({
    page,
  }) => {
    const slider = page.getByRole("slider", { name: "Temperature" });
    await expect(slider).toBeVisible();
    await expect(slider).not.toHaveAccessibleName("Slider");

    await slider.focus();
    await expect(slider).toBeFocused();
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("1");
    await page.keyboard.press("Home");
    await expect(slider).toHaveValue("0");
  });

  test("the near-zero-temperature disclaimer is present alongside the control", async ({ page }) => {
    await expect(page.getByText(/very consistent, not guaranteed identical/i)).toBeVisible();
  });
});

/**
 * SC-009 + FR-015: User Story 5's Compare Variants real-execution
 * controls -- the HyDE hypothesis-count slider, RAG-Fusion's N slider,
 * and the disabled Run affordance FR-009 requires for GraphRAG/Self-RAG/
 * Agentic RAG once Real Mode is active.
 */
test.describe("Compare Variants real-execution accessibility (US5)", () => {
  const TEST_KEY = "sk-test-fixture-key-1234567890";

  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
    await page.getByRole("button", { name: "Compare Variants" }).click();
    await page.getByRole("switch", { name: "Real Mode" }).click();
    await page.getByLabel("OpenAI API key").fill(TEST_KEY);
    await page.getByRole("button", { name: "Activate Real Mode" }).click();
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations with the real-execution panel visible", async ({
    page,
  }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("HyDE hypothesis-count slider is Tab-reachable, keyboard-operable, and has a purpose-specific accessible name", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Show real-execution panel for HyDE" }).click();
    const slider = page.getByRole("slider", { name: "HyDE hypothesis count" });
    await expect(slider).toBeVisible();
    await expect(slider).not.toHaveAccessibleName("Slider");

    await slider.focus();
    await expect(slider).toBeFocused();
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("3");
    await page.keyboard.press("Home");
    await expect(slider).toHaveValue("1");
  });

  test("RAG-Fusion query-variant slider is Tab-reachable, keyboard-operable, and has a purpose-specific accessible name", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Show real-execution panel for RAG-Fusion" }).click();
    const slider = page.getByRole("slider", { name: "RAG-Fusion query variants (N)" });
    await expect(slider).toBeVisible();
    await expect(slider).not.toHaveAccessibleName("Slider");

    await slider.focus();
    await expect(slider).toBeFocused();
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("5");
    await page.keyboard.press("Home");
    await expect(slider).toHaveValue("2");
  });

  test("GraphRAG/Self-RAG/Agentic RAG's Run control is disabled (removed from the Tab order) with an inline explanation", async ({
    page,
  }) => {
    for (const name of ["GraphRAG", "Self-RAG", "Agentic RAG"]) {
      const card = page.locator("div.transition-colors", { has: page.getByRole("heading", { name, exact: true }) });
      await expect(card.getByRole("button", { name: "Run for real" })).toBeDisabled();
      await expect(card.getByText("Explanatory only this milestone")).toBeVisible();
    }
  });

  test("Naive RAG/HyDE/RAG-Fusion's Run control stays enabled and reachable", async ({ page }) => {
    for (const name of ["Naive RAG", "HyDE", "RAG-Fusion"]) {
      const card = page.locator("div.transition-colors", { has: page.getByRole("heading", { name, exact: true }) });
      await expect(card.getByRole("button", { name: "Run for real →" })).toBeEnabled();
    }
  });
});

/**
 * SC-009 + FR-015: User Story 6's evaluation controls (`EvalPanel.tsx`) --
 * the `EvalPair` question input, expected-chunk picker, pair-removal
 * control, and evaluation Run control (`/speckit.analyze` finding C1,
 * 2026-08-06: previously the only story with zero accessibility-check
 * coverage, and a Constitution Principle VII gap).
 */
test.describe("Evaluation panel accessibility (US6)", () => {
  const TEST_KEY = "sk-test-fixture-key-1234567890";

  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
    await page.getByRole("button", { name: "Compare Variants" }).click();
    await page.getByRole("switch", { name: "Real Mode" }).click();
    await page.getByLabel("OpenAI API key").fill(TEST_KEY);
    await page.getByRole("button", { name: "Activate Real Mode" }).click();
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations with an evaluation pair defined", async ({ page }) => {
    await page.getByLabel("Evaluation question").fill("What grind size for French press?");
    await page.getByLabel("Expected chunk").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Add pair" }).click();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("evaluation question input and expected-chunk picker are Tab-reachable with purpose-specific accessible names", async ({
    page,
  }) => {
    const questionInput = page.getByLabel("Evaluation question");
    await expect(questionInput).toBeVisible();
    await expect(questionInput).not.toHaveAccessibleName("Input");
    await questionInput.focus();
    await expect(questionInput).toBeFocused();

    const chunkPicker = page.getByLabel("Expected chunk");
    await expect(chunkPicker).toBeVisible();
    await expect(chunkPicker).not.toHaveAccessibleName("Select");
    await chunkPicker.focus();
    await expect(chunkPicker).toBeFocused();
  });

  test("pair-removal control is keyboard-operable with an accessible name naming the specific pair", async ({ page }) => {
    await page.getByLabel("Evaluation question").fill("What grind size for French press?");
    await page.getByLabel("Expected chunk").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Add pair" }).click();

    const removeButton = page.getByRole("button", {
      name: "Remove evaluation pair: What grind size for French press?",
    });
    await expect(removeButton).toBeVisible();

    await removeButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("What grind size for French press?")).toHaveCount(0);
  });

  test("evaluation Run control is disabled (removed from the Tab order) with zero pairs, and becomes enabled and keyboard-focusable once a pair is defined", async ({
    page,
  }) => {
    const runButton = page.getByRole("button", { name: "Run evaluation" });
    await expect(runButton).toBeDisabled();
    await expect(page.getByText(/Add at least one .* pair to run an evaluation/i)).toBeVisible();

    await page.getByLabel("Evaluation question").fill("What grind size for French press?");
    await page.getByLabel("Expected chunk").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Add pair" }).click();

    await expect(runButton).toBeEnabled();
    await expect(runButton).not.toHaveAccessibleName("Button");
    await runButton.focus();
    await expect(runButton).toBeFocused();
  });
});
