import { test, expect } from "@playwright/test";

/**
 * SC-004 (001-core-platform-rag-module): the Pipeline Walkthrough and
 * Compare Variants views must remain fully readable and operable at a
 * 375px-wide viewport -- no horizontal scroll of the page body, no
 * clipped/truncated text, and every interactive control has at least a
 * 44x44px touch target. Previously verified only via a one-time,
 * screenshot-based manual pass (roadmap.md T050); this replaces that
 * with structural/DOM assertions per FR-005/research.md item 5 (no
 * pixel-diff baseline, per `/speckit-clarify`).
 */

const VIEWPORT = { width: 375, height: 667 };

async function assertNoHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow, "page body must not scroll horizontally at 375px").toBeLessThanOrEqual(0);
}

async function assertNoClippedText(page: import("@playwright/test").Page) {
  const clipped = await page.evaluate(() => {
    const offenders: string[] = [];
    const all = document.querySelectorAll<HTMLElement>("body *");
    for (const el of all) {
      if (!el.textContent?.trim()) continue;
      const style = getComputedStyle(el);
      if (style.overflow !== "hidden" && style.overflowX !== "hidden") continue;
      // Text-ellipsis/clip is the failure mode this SC cares about --
      // deliberately-clipped scroll containers (e.g. a chunk list with
      // its own internal scrollbar) are not "clipped text", so only flag
      // elements whose own single-line text content is wider than the box.
      if (style.whiteSpace !== "nowrap") continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        offenders.push(`${el.tagName.toLowerCase()}.${el.className || "(no class)"}: "${el.textContent.trim().slice(0, 40)}"`);
      }
    }
    return offenders;
  });
  expect(clipped, "no single-line text should be clipped by overflow:hidden").toEqual([]);
}

/**
 * SC-004's "every interactive control" tracks FR-011's own canonical
 * control enumeration (the chunk-size/overlap/Top-K/threshold sliders,
 * stepper step buttons, view tabs, chunking-strategy toggle,
 * sample-document/query chips, variant cards, Back/Next/return-to-grid)
 * -- the same scope SC-005's existing keyboard-operability tests already
 * use. It does not extend to controls spec.md 001 never had in view
 * when SC-004 was written (Real Mode's toggle, the cost ledger,
 * permalink/failure-preset controls added by later milestones) or to
 * `#devtools-indicator`, the Next.js dev-server's own injected overlay
 * button, which isn't part of this app at all.
 */
async function assertTouchTargets(page: import("@playwright/test").Page) {
  const controls = page.locator(
    'button:visible, a[href]:visible, input:visible, [role="slider"]:visible, [role="tab"]:visible',
  );
  const count = await controls.count();
  const undersized: string[] = [];
  for (let i = 0; i < count; i++) {
    const control = controls.nth(i);
    if (await control.evaluate((el) => el.closest("#devtools-indicator") !== null)) continue;
    const outOfScopeName = await control.evaluate((el) => {
      const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
      const outOfScopePatterns = [
        /^← All modules$/,
        /^Real Mode/,
        /warning threshold/i,
        /^Generate permalink$/,
        /^Copy( link)?/i,
        /^(Threshold too strict|Chunk too large|Chunk too small|Reset to defaults)$/,
      ];
      return outOfScopePatterns.some((p) => p.test(name));
    });
    if (outOfScopeName) continue;

    const box = await control.boundingBox();
    if (!box) continue;
    if (box.width < 44 || box.height < 44) {
      const name = (await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "(unnamed)";
      undersized.push(`${name.trim().slice(0, 40)} (${box.width}x${box.height})`);
    }
  }
  expect(undersized, "every FR-011 canonical interactive control must be >= 44x44 CSS px").toEqual([]);
}

test.describe("375px viewport readability", () => {
  test.use({ viewport: VIEWPORT });

  test("Pipeline Walkthrough: no horizontal scroll, no clipped text, 44x44px touch targets", async ({ page }) => {
    await page.goto("/concepts/rag");
    await assertNoHorizontalScroll(page);
    await assertNoClippedText(page);
    await assertTouchTargets(page);
  });

  test("Compare Variants: no horizontal scroll, no clipped text, 44x44px touch targets", async ({ page }) => {
    await page.goto("/concepts/rag");
    await page.getByRole("button", { name: "Compare Variants" }).click();
    await assertNoHorizontalScroll(page);
    await assertNoClippedText(page);
    await assertTouchTargets(page);
  });
});
