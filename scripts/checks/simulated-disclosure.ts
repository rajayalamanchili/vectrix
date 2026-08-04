/**
 * SC-003: every simulated/mocked AI behavior surface (the embedding
 * projection, the generated answer) must carry a visible "simulated"
 * disclosure in the rendered UI, not just a code comment. This script
 * statically renders the two surfaces that make this claim
 * (EmbeddingStep, GenerationStep) and asserts each contains a non-empty
 * `data-simulated-disclosure="true"` element -- see data-model.md's
 * "Disclosure marker contract" and contracts/automated-checks-contract.md.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { report, type CheckFailure } from "./lib/report";
import { EmbeddingStep } from "../../src/concepts/rag/pipeline/steps/EmbeddingStep";
import { GenerationStep } from "../../src/concepts/rag/pipeline/steps/GenerationStep";

// Captures the disclosure element's tag name and its full inner markup
// (up to its own matching closing tag, via the \1 backreference) so
// nested markup like `<p data-simulated-disclosure="true"><em>...</em></p>`
// is handled correctly, not just direct text children.
const DISCLOSURE_RE = /<(\w+)([^>]*)\sdata-simulated-disclosure="true"([^>]*)>([\s\S]*?)<\/\1>/;

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
];

report("check:disclosure", failures);
