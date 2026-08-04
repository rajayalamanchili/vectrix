"use client";

import { useMemo } from "react";
import { sampleDocs, chunkText } from "../../lib/sampleDocs";
import { embed } from "../../lib/mockEmbedding";
import { StarChart, type StarPoint } from "@/components/charts/StarChart";
import { Panel, Marginalia } from "@/components/ui/Panel";

export function EmbeddingStep({
  docId,
  chunkSize,
  overlap,
}: {
  docId: string;
  chunkSize: number;
  overlap: number;
}) {
  const doc = sampleDocs.find((d) => d.id === docId) ?? sampleDocs[0];
  const chunks = chunkText(doc.text, chunkSize, overlap);

  const points: StarPoint[] = useMemo(
    () =>
      chunks.map((c, i) => {
        const { x, y } = embed(c.text);
        return { id: c.id, x, y, label: `#${i}` };
      }),
    [chunks],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <Panel className="p-5">
        <StarChart points={points} showCourseLines={false} />
      </Panel>

      <Marginalia eyebrow="Step 3 -- Embedding">
        <p>
          Every chunk becomes a point in a high-dimensional meaning space
          -- similar chunks land near each other. This chart projects that
          down to 2D so you can see it directly.
        </p>
        <p className="mt-3 text-ink-500">
          <em>
            Simplified for teaching: this uses a lightweight word-overlap
            projection, not a real embedding model, so the geometry is
            illustrative rather than semantically precise. Swap in a real
            embeddings API and the rest of the pipeline is unchanged.
          </em>
        </p>
        <p className="mt-3">
          Move to the next step and type a question -- watch where it
          lands relative to these chunks.
        </p>
      </Marginalia>
    </div>
  );
}
