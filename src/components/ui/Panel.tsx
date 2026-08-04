export function Panel({
  children,
  className = "",
  grid = false,
}: {
  children: React.ReactNode;
  className?: string;
  grid?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-chart-line bg-chart-bg-raised ${
        grid ? "bg-chart-grid" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Marginalia-style side note, used for guided explanations next to an interaction. */
export function Marginalia({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-doc-teal/40 pl-4 text-sm leading-relaxed text-ink-300">
      {eyebrow && (
        <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-doc-teal">
          {eyebrow}
        </div>
      )}
      {children}
    </div>
  );
}
