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
