import { test, expect } from "@playwright/test";

/**
 * SC-001 (001-core-platform-rag-module): a first-time visitor can go
 * from the home page, through the RAG concept card, to seeing a ranked,
 * scored set of retrieved chunks, an assembled prompt, and a disclosed
 * simulated answer -- with no manual/dev-tool intervention. Previously
 * only a one-time historical verification (roadmap.md T051, "against a
 * real browser for the first time... no further defects found"), never
 * a committed regression test.
 */

test("home page -> RAG card -> ranked retrieval -> assembled prompt -> disclosed simulated answer", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /Retrieval-Augmented Generation/i }).click();

  await expect(page).toHaveURL(/\/concepts\/rag$/);
  await expect(page.getByRole("button", { name: "Pipeline Walkthrough" })).toBeVisible();

  // Step 4 -- Retrieval: a ranked, scored set of retrieved chunks.
  await page.getByRole("button", { name: "Retrieval" }).click();
  await expect(page.getByRole("heading", { name: "Retrieved, ranked by similarity" })).toBeVisible();
  const firstResult = page.getByText(/^1\. 0\.\d{3}$/);
  await expect(firstResult).toBeVisible();

  // Step 5 -- Generation: the assembled prompt and a disclosed simulated answer.
  await page.getByRole("button", { name: "Use these results in the next step →" }).click();
  await expect(page.getByRole("button", { name: "Generation" })).toBeVisible();
  await expect(page.getByText("Assembled prompt sent to the model")).toBeVisible();
  await expect(page.locator("pre")).not.toBeEmpty();
  await expect(page.locator('[data-generated-answer="true"]')).toBeVisible();
  await expect(page.locator('[data-generated-answer="true"]')).not.toBeEmpty();
  await expect(page.locator('[data-simulated-disclosure="true"]').first()).toBeVisible();
  await expect(page.locator('[data-simulated-disclosure="true"]').first()).toContainText(/simulat/i);
});
