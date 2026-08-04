export function Badge({
  children,
  tone = "doc",
}: {
  children: React.ReactNode;
  tone?: "doc" | "query" | "neutral";
}) {
  const toneClasses = {
    doc: "border-doc-teal/40 text-doc-teal bg-doc-teal/10",
    query: "border-query-amber/40 text-query-amber bg-query-amber/10",
    neutral: "border-ink-500/30 text-ink-300 bg-ink-500/10",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono tracking-wide ${toneClasses}`}
    >
      {children}
    </span>
  );
}
