/**
 * SC-003: every simulated/mocked AI behavior surface (the embedding
 * projection, the generated answer) must carry a visible "simulated"
 * disclosure in the rendered UI, not just a code comment. This script
 * statically renders the two surfaces that make this claim
 * (EmbeddingStep, GenerationStep) and asserts each contains a non-empty
 * `data-simulated-disclosure="true"` element -- see data-model.md's
 * "Disclosure marker contract" and contracts/automated-checks-contract.md.
 *
 * Extended for 002-real-mode (FR-003) with a `data-key-disclaimer="true"`
 * rule: RealModeToggle.tsx's key-entry prompt must render both halves of
 * data-model.md's disclaimer copy (where the key goes, and the
 * use-at-your-own-risk warning) together, not just one.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { report, type CheckFailure } from "./lib/report";
import { EmbeddingStep } from "../../src/concepts/rag/pipeline/steps/EmbeddingStep";
import { GenerationStep } from "../../src/concepts/rag/pipeline/steps/GenerationStep";
import { RealModeToggle } from "../../src/concepts/rag/realMode/RealModeToggle";
import { openaiProviderConfig } from "../../src/concepts/rag/realMode/providerConfigs";

// Captures the disclosure element's tag name and its full inner markup
// (up to its own matching closing tag, via the \1 backreference) so
// nested markup like `<p data-simulated-disclosure="true"><em>...</em></p>`
// is handled correctly, not just direct text children.
const DISCLOSURE_RE = /<(\w+)([^>]*)\sdata-simulated-disclosure="true"([^>]*)>([\s\S]*?)<\/\1>/;
const KEY_DISCLAIMER_RE = /<(\w+)([^>]*)\sdata-key-disclaimer="true"([^>]*)>([\s\S]*?)<\/\1>/;

function checkSurface(name: string, markup: string): CheckFailure[] {
  const match = markup.match(DISCLOSURE_RE);
  if (!match) {
    return [{ location: name, message: 'missing a data-simulated-disclosure="true" element' }];
  }
  const textContent = match[4].replace(/<[^>]+>/g, "").trim();
  if (textContent.length === 0) {
    return [{ location: name, message: "data-simulated-disclosure element has empty text content" }];
  }
  return [];
}

function checkKeyDisclaimer(name: string, markup: string): CheckFailure[] {
  const match = markup.match(KEY_DISCLAIMER_RE);
  if (!match) {
    return [{ location: name, message: 'missing a data-key-disclaimer="true" element' }];
  }
  const textContent = match[4].replace(/<[^>]+>/g, " ").trim();
  if (textContent.length === 0) {
    return [{ location: name, message: "data-key-disclaimer element has empty text content" }];
  }
  const hasWhereItGoes = /where your key goes/i.test(textContent);
  const hasRiskWarning = /use at your own risk/i.test(textContent);
  if (!hasWhereItGoes || !hasRiskWarning) {
    return [
      {
        location: name,
        message:
          "data-key-disclaimer element must render both halves (where the key goes + use-at-your-own-risk), not just one (FR-003)",
      },
    ];
  }
  return [];
}

const failures: CheckFailure[] = [
  ...checkSurface(
    "EmbeddingStep.tsx",
    renderToStaticMarkup(
      createElement(EmbeddingStep, { docId: "coffee", chunkSize: 60, overlap: 15, chunkingStrategy: "fixed" }),
    ),
  ),
  ...checkSurface(
    "GenerationStep.tsx",
    renderToStaticMarkup(createElement(GenerationStep, { query: "test query", results: [] })),
  ),
  ...checkKeyDisclaimer(
    "RealModeToggle.tsx",
    renderToStaticMarkup(
      createElement(RealModeToggle, {
        realMode: { active: true, provider: openaiProviderConfig, apiKey: null, error: null },
        onRealModeChange: () => {},
      }),
    ),
  ),
];

report("check:disclosure", failures);
