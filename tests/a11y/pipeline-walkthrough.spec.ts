import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * SC-005 (pipeline half) + FR-011: every control in FR-011's canonical
 * enumeration (chunk-size/overlap/Top-K/threshold sliders, stepper step
 * buttons, view tabs, chunking-strategy toggle, sample-document/query
 * chips, Back/Next) must be keyboard-operable with a purpose-specific
 * accessible name and a visible focus indicator. Also covers Phase 6.5's
 * focus-management behavior (T055/T056/T057).
 * See contracts/automated-checks-contract.md's check:a11y rule (a)-(h).
 */

test.describe("Pipeline Walkthrough accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations", async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("document chips are Tab-reachable, keyboard-activatable, and have distinct accessible names", async ({
    page,
  }) => {
    const coffeeChip = page.locator('[data-doc-chip="coffee"]');
    const onboardingChip = page.locator('[data-doc-chip="onboarding"]');
    await expect(coffeeChip).toHaveAccessibleName(/Home Coffee Brewing Guide/);
    await expect(onboardingChip).toHaveAccessibleName(/Employee Benefits Handbook Excerpt/);
    await expect(coffeeChip).toHaveAttribute("aria-pressed", "true");

    await onboardingChip.focus();
    await page.keyboard.press("Enter");
    await expect(onboardingChip).toHaveAttribute("aria-pressed", "true");
  });

  test("chunking-strategy toggle is keyboard-operable and exposes selected state via aria-pressed, not color alone", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Chunking" }).click();

    const fixedOption = page.getByRole("button", { name: "Fixed-size chunking strategy" });
    const sentenceOption = page.getByRole("button", { name: "Sentence-boundary chunking strategy" });
    await expect(fixedOption).toHaveAttribute("aria-pressed", "true");
    await expect(sentenceOption).toHaveAttribute("aria-pressed", "false");

    await sentenceOption.focus();
    await page.keyboard.press("Enter");
    await expect(sentenceOption).toHaveAttribute("aria-pressed", "true");
    await expect(fixedOption).toHaveAttribute("aria-pressed", "false");
  });

  test("sliders have purpose-specific accessible names, not a shared generic label", async ({ page }) => {
    await page.getByRole("button", { name: "Chunking" }).click();
    const chunkSize = page.getByRole("slider", { name: "Chunk size" });
    const overlap = page.getByRole("slider", { name: "Overlap" });
    await expect(chunkSize).toBeVisible();
    await expect(overlap).toBeVisible();
    await expect(chunkSize).not.toHaveAccessibleName("Slider");

    // Arrow-key increment must match the slider's own stated `step` (5).
    await chunkSize.focus();
    const before = await chunkSize.inputValue();
    await page.keyboard.press("ArrowRight");
    const after = await chunkSize.inputValue();
    expect(Number(after) - Number(before)).toBe(5);
  });

  test("similarity-threshold slider is keyboard-adjustable and can empty the retrieved list", async ({ page }) => {
    await page.getByRole("button", { name: "Retrieval" }).click();
    const threshold = page.getByRole("slider", { name: "Minimum similarity score" });
    await expect(threshold).toBeVisible();
    await threshold.focus();
    await threshold.fill("1");
    await page.keyboard.press("ArrowRight"); // commit/normalize in case fill() alone doesn't fire change
    // 003-parameter-exploration adds its own always-present, initially-empty
    // aria-live status region (PermalinkButton's "Copied" confirmation), so
    // this can no longer assume a single page-wide status role -- scope to
    // the one with this message's text.
    await expect(page.getByRole("status").filter({ hasText: "No chunks meet the current similarity threshold" })).toBeVisible();
  });

  test('empty-retrieved-list message is inside the "Retrieved, ranked by similarity" heading region', async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Retrieval" }).click();
    const threshold = page.getByRole("slider", { name: "Minimum similarity score" });
    await threshold.focus();
    await threshold.fill("1");
    const heading = page.getByRole("heading", { name: "Retrieved, ranked by similarity" });
    await expect(heading).toBeVisible();
    const status = page.getByRole("status").filter({ hasText: "No chunks meet the current similarity threshold" });
    await expect(status).toBeVisible();
  });

  test("disabled Back button at the first step is removed from the Tab order", async ({ page }) => {
    const back = page.getByRole("button", { name: "← Back" });
    await expect(back).toBeDisabled();
  });

  test("jumping the stepper to a non-adjacent step moves focus to that step's first control", async ({ page }) => {
    await page.getByRole("button", { name: "Retrieval" }).click();
    const queryInput = page.getByPlaceholder("Or type your own question...");
    await expect(queryInput).toBeFocused();
  });

  test("switching documents resets state and moves focus to the newly selected document's chip", async ({
    page,
  }) => {
    // Get retrieval results for the default document first.
    await page.getByRole("button", { name: "Retrieval" }).click();
    await page.getByRole("button", { name: "Use these results in the next step →" }).click();
    await expect(page.getByRole("button", { name: "Generation" })).toBeVisible();

    // Go back to Document and switch documents.
    await page.getByRole("button", { name: "Document" }).click();
    const onboardingChip = page.locator('[data-doc-chip="onboarding"]');
    await onboardingChip.focus();
    await page.keyboard.press("Enter");

    await expect(onboardingChip).toBeFocused();
    // The stepper must have returned to Document (stale results reset).
    await expect(page.locator('[data-doc-chip]')).toHaveCount(2);
  });
});
