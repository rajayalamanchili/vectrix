"use client";

import { sampleDocs } from "../../lib/sampleDocs";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { CustomDocumentInput, type CustomDocumentInputProps } from "../../realMode/CustomDocumentInput";
import type { RealModeSession } from "../../realMode/types";

export function DocumentStep({
  docId,
  onSelect,
  realMode,
  customDocument,
}: {
  docId: string;
  onSelect: (id: string) => void;
  realMode?: RealModeSession;
  customDocument: CustomDocumentInputProps;
}) {
  const doc = sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        {customDocument.mode === "sample" && (
          <Panel className="p-5">
            <div className="mb-4 flex gap-2">
              {sampleDocs.map((d) => (
                <button
                  key={d.id}
                  data-doc-chip={d.id}
                  onClick={() => onSelect(d.id)}
                  aria-pressed={d.id === docId}
                  className={`min-h-11 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    d.id === docId
                      ? "border-doc-teal bg-doc-teal/15 text-doc-teal"
                      : "border-chart-line text-ink-500 hover:text-ink-300"
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>
            <div
              tabIndex={0}
              role="region"
              aria-label={`${doc.title} full text`}
              className="max-h-[340px] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink-300 font-body"
            >
              {doc.text}
            </div>
          </Panel>
        )}

        {realMode?.active && <CustomDocumentInput {...customDocument} />}
      </div>

      <Marginalia eyebrow="Step 1 -- The corpus">
        <p>
          Every RAG pipeline starts with source documents the model doesn&apos;t
          already know by heart -- your internal docs, a support handbook,
          a product manual.
        </p>
        <p className="mt-3">
          Pick a document above, then move to the next step to see how it
          gets split into retrievable pieces.
        </p>
        {realMode?.active && (
          <p className="mt-3">
            Real Mode is active -- paste your own document below to run the
            rest of the pipeline against it instead of a sample.
          </p>
        )}
      </Marginalia>
    </div>
  );
}
