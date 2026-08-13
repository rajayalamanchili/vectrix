import Link from "next/link";
import { conceptRegistry } from "@/lib/concept-registry";

export default function Home( {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-chart-line bg-chart-grid">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-doc-teal">
            Vectrix
          </div>
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.1] text-ink-100 max-w-2xl">
            Learn how AI systems work by <em className="text-query-amber not-italic">steering</em> them yourself.
          </h1>
          <p className="mt-5 max-w-xl text-ink-300 leading-relaxed">
            Each module below is a small, interactive chart you can pull apart --
            drag a slider, watch a query land in embedding space, compare
            architectures side by side. Start with Retrieval-Augmented
            Generation or Agents &amp; Tool Use; more concepts will chart their
            own course here over time.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-6 font-mono text-xs uppercase tracking-wider text-ink-500">
          Modules
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {conceptRegistry.map((c) => (
            <Link
              key={c.id}
              href={`/concepts/${c.id}`}
              className="group rounded-lg border border-chart-line bg-chart-bg-raised p-6 transition-colors hover:border-doc-teal/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-doc-teal">
                  {c.category}
                </span>
                <span className="font-mono text-[10px] text-ink-700">{c.estimatedTime}</span>
              </div>
              <h2 className="font-display text-xl text-ink-100 mb-2 group-hover:text-query-amber transition-colors">
                {c.title}
              </h2>
              <p className="text-sm text-ink-300 mb-3">{c.tagline}</p>
              <p className="text-xs text-ink-500 leading-relaxed">{c.description}</p>
            </Link>
          ))}

          <div className="rounded-lg border border-dashed border-chart-line p-6 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-700 mb-2">
              Next module
            </span>
            <p className="text-sm text-ink-500">
              New concepts get charted here as they&apos;re added -- see README.md
              for how to add one.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
