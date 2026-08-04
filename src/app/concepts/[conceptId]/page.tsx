import Link from "next/link";
import { notFound } from "next/navigation";
import { conceptRegistry, getConcept } from "@/lib/concept-registry";

export function generateStaticParams() {
  return conceptRegistry.map((c) => ({ conceptId: c.id }));
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ conceptId: string }>;
}) {
  const { conceptId } = await params;
  const concept = getConcept(conceptId);
  if (!concept) notFound();

  const { Component } = concept;

  return (
    <main className="flex-1">
      <div className="border-b border-chart-line bg-chart-grid">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Link href="/" className="text-xs text-ink-500 hover:text-ink-300">
            ← All modules
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-doc-teal">
              {concept.category}
            </span>
            <span className="font-mono text-[10px] text-ink-700">
              {concept.estimatedTime}
            </span>
          </div>
          <h1 className="font-display text-3xl text-ink-100 mt-1">{concept.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-300 leading-relaxed">
            {concept.description}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <Component />
      </div>
    </main>
  );
}
