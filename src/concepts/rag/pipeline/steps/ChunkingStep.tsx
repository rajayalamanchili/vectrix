"use client";

import { sampleDocs, chunkText } from "../../lib/sampleDocs";
import { Panel, Marginalia } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { Badge } from "@/components/ui/Badge";

const CHUNK_COLORS = [
  "bg-doc-teal/25",
  "bg-query-amber/20",
  "bg-doc-teal/15",
  "bg-query-amber/10",
];

export function ChunkingStep({
  docId,
  chunkSize,
  overlap,
  onChunkSize,
  onOverlap,
}: {
  docId: string;
  chunkSize: number;
  overlap: number;
  onChunkSize: (v: number) => void;
  onOverlap: (v: number) => void;
}) {
  const doc = sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];
  const chunks = chunkText(doc.text, chunkSize, overlap);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <Panel className="p-5">
        <div className="mb-5 grid grid-cols-2 gap-6 max-w-md">
          <Slider
            label="Chunk size"
            value={chunkSize}
            min={20}
            max={120}
            step={5}
            unit=" words"
            onChange={onChunkSize}
          />
          <Slider
            label="Overlap"
            value={overlap}
            min={0}
            max={Math.min(40, chunkSize - 5)}
            step={5}
            unit=" words"
            onChange={onOverlap}
            tone="query"
          />
        </div>

        <div className="mb-2 flex items-center gap-2">
          <Badge tone="doc">{chunks.length} chunks</Badge>
          <span className="text-xs text-ink-500">
            from a {doc.text.split(/\s+/).length}-word document
          </span>
        </div>

        <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
          {chunks.map((c, i) => (
            <div
              key={c.id}
              className={`rounded px-3 py-2 text-xs leading-relaxed text-ink-100 ${CHUNK_COLORS[i % CHUNK_COLORS.length]}`}
            >
              <span className="mr-2 font-mono text-[10px] text-ink-500">
                #{i} · words {c.startWord}-{c.endWord}
              </span>
              {c.text}
            </div>
          ))}
        </div>
      </Panel>

      <Marginalia eyebrow="Step 2 -- Chunking">
        <p>
          Documents get split into overlapping windows before they&apos;re
          embedded. Chunk too big and irrelevant text drowns out the
          relevant sentence; too small and you lose surrounding context.
        </p>
        <p className="mt-3">
          Overlap protects against a fact getting cut in half at a chunk
          boundary, at the cost of storing some text twice.
        </p>
        <p className="mt-3">
          Try dragging chunk size down to ~30 words -- notice how a single
          idea can end up split across two chunks.
        </p>
      </Marginalia>
    </div>
  );
}
