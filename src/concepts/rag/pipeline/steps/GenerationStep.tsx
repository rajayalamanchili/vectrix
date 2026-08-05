"use client";

import { Panel, Marginalia } from "@/components/ui/Panel";
import type { RetrievedChunk } from "./RetrievalStep";

/**
 * Placeholder "generation" -- deliberately not a real LLM call, so the
 * playground works with zero API keys and zero server cost. To wire up
 * a real model: replace this function's body with a call to your
 * provider of choice, passing `prompt` through unchanged. Everything
 * upstream (retrieval, prompt assembly) is already provider-agnostic.
 */
function mockGenerate(query: string, chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No context was retrieved, so there's nothing grounded to answer from.";
  }
  const lead = chunks[0].chunk.text.split(/(?<=[.!?])\s/)[0];
  return `Based on chunk #${chunks[0].chunk.id.replace("chunk-", "")} (highest similarity, ${chunks[0].score.toFixed(
    2,
  )}): ${lead} ${
    chunks.length > 1
      ? `This is supported by ${chunks.length - 1} additional retrieved chunk${chunks.length > 2 ? "s" : ""}.`
      : ""
  }`;
}

export function GenerationStep({
  query,
  results,
}: {
  query: string;
  results: RetrievedChunk[];
}) {
  const contextBlock = results.map((r, i) => `[${i + 1}] ${r.chunk.text}`).join("\n\n");
  const prompt = `You are a helpful assistant. Answer the question using ONLY the context below. If the context doesn't contain the answer, say so.

Context:
${contextBlock || "(no context retrieved)"}

Question: ${query || "(no query yet)"}`;

  const answer = mockGenerate(query, results);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <Panel className="p-5">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-doc-teal">
            Assembled prompt sent to the model
          </div>
          <pre className="max-h-[260px] overflow-y-auto whitespace-pre-wrap rounded bg-chart-bg p-3 font-mono text-[11px] leading-relaxed text-ink-300">
            {prompt}
          </pre>
        </Panel>

        <Panel className="p-5 border-query-amber/30">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-query-amber">
            Simulated answer
          </div>
          <p className="text-sm leading-relaxed text-ink-100">{answer}</p>
          <p className="mt-3 text-xs text-ink-700 italic" data-simulated-disclosure="true">
            Simulated, not a real model call -- see the code comment in
            GenerationStep.tsx for the one-function swap to a real API.
          </p>
        </Panel>
      </div>

      <Marginalia eyebrow="Step 5 -- Augmented generation">
        <p>
          This is the &quot;generation&quot; half of RAG: the retrieved
          chunks get stitched into the prompt as context, and the model is
          instructed to answer only from what&apos;s there -- not from its
          own memorized (and possibly outdated or wrong) knowledge.
        </p>
        <p className="mt-3">
          The instruction &quot;if the context doesn&apos;t contain the
          answer, say so&quot; is doing real work: without it, models will
          often answer confidently from their own training data even when
          the retrieved context is unrelated.
        </p>
      </Marginalia>
    </div>
  );
}
