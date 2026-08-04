export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  tone = "doc",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  tone?: "doc" | "query";
}) {
  const accent = tone === "doc" ? "var(--doc-teal)" : "var(--query-amber)";
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm text-ink-300">{label}</span>
        <span className="font-mono text-sm text-ink-100">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: accent }}
        className="w-full cursor-pointer"
        aria-label={label}
      />
    </label>
  );
}
