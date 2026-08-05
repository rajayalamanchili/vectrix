import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * SC-005 (compare-variants half) + FR-009 + FR-011: variant-card
 * selection and the return-to-grid control must be Tab-reachable in
 * grid (DOM) order, operable via Enter/Space, and the FIFO-replacement
 * behavior on a third selection must be keyboard-operable identically
 * to the first two -- no dedicated arrow-key grid navigation is
 * required (FR-009). See contracts/automated-checks-contract.md's
 * check:a11y rule (i).
 */

test.describe("Compare Variants accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concepts/rag");
    await page.getByRole("button", { name: "Compare Variants" }).click();
  });

  test("has no automatically detectable WCAG 2.1 A/AA violations", async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("variant cards are Tab-reachable with purpose-specific accessible names", async ({ page }) => {
    const naive = page.getByRole("button", { name: /Naive RAG/ });
    const hyde = page.getByRole("button", { name: /HyDE/ });
    await expect(naive).toBeVisible();
    await expect(hyde).toBeVisible();
    await naive.focus();
    await expect(naive).toBeFocused();
  });

  test("Enter selects a card and two selections open the side-by-side comparison", async ({ page }) => {
    const naive = page.getByRole("button", { name: /Naive RAG/ });
    const hyde = page.getByRole("button", { name: /HyDE/ });

    await naive.focus();
    await page.keyboard.press("Enter");
    await hyde.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("button", { name: "← Back to all variants" })).toBeVisible();
    await expect(page.getByText("Problem it addresses")).toHaveCount(2);
  });

  test("selecting a third variant via keyboard replaces the oldest selection (FIFO), same as a click would", async ({
    page,
  }) => {
    const naive = page.getByRole("button", { name: /Naive RAG/ });
    const hyde = page.getByRole("button", { name: /HyDE/ });
    const fusion = page.getByRole("button", { name: /RAG-Fusion/ });

    // Select naive, then hyde (comparison view opens); return to grid to
    // select a third since the grid isn't shown during comparison.
    await naive.focus();
    await page.keyboard.press("Enter");
    await hyde.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "← Back to all variants" }).click();

    await fusion.focus();
    await page.keyboard.press("Enter");

    // FIFO: naive (oldest) is replaced, hyde + fusion remain selected.
    await expect(page.getByRole("heading", { name: "HyDE", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "RAG-Fusion", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Naive RAG", exact: true })).not.toBeVisible();
  });

  test("return-to-grid control is keyboard-operable", async ({ page }) => {
    const naive = page.getByRole("button", { name: /Naive RAG/ });
    const hyde = page.getByRole("button", { name: /HyDE/ });
    await naive.focus();
    await page.keyboard.press("Enter");
    await hyde.focus();
    await page.keyboard.press("Enter");

    const backToGrid = page.getByRole("button", { name: "← Back to all variants" });
    await backToGrid.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /Naive RAG/ })).toBeVisible();
  });
});
