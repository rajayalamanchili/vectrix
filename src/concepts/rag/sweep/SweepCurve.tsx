"use client";

import { useMemo } from "react";
import type { SweepPoint } from "./runSweep";
import { isFlatCurve } from "./runSweep";

/**
 * A decorative, aria-hidden SVG line/axis background with one native
 * <button> per point absolutely positioned on top of it -- native
 * buttons carry correct focus order and Enter/Space activation for
 * free, rather than re-deriving that on an SVG shape (research.md's
 * keyboard-operability decision, Constitution Principle VII).
 *
 * Both the SVG polyline and the buttons are positioned in the same 0-100
 * percentage coordinate space (SVG viewBox="0 0 100 100",
 * preserveAspectRatio="none" stretched to fill the wrapper) so they stay
 * pixel-aligned at any container width.
 */
export function SweepCurve({
  points,
  onPointActivate,
}: {
  points: SweepPoint[];
  onPointActivate: (chunkSize: number) => void;
}) {
  const { minChunk, maxChunk, minScore, maxScore } = useMemo(() => {
    const chunkSizes = points.map((p) => p.chunkSize);
    const scores = points
      .filter((p) => p.status === "done" && p.topOneScore !== null)
      .map((p) => p.topOneScore as number);
    const minS = scores.length > 0 ? Math.min(...scores) : 0;
    const maxS = scores.length > 0 ? Math.max(...scores) : 1;
    const pad = Math.max((maxS - minS) * 0.15, 0.02);
    return {
      minChunk: Math.min(...chunkSizes),
      maxChunk: Math.max(...chunkSizes),
      minScore: minS - pad,
      maxScore: maxS + pad,
    };
  }, [points]);

  const chunkSpan = maxChunk - minChunk || 1;
  const scoreSpan = maxScore - minScore || 1;

  function toPercent(chunkSize: number, score: number) {
    const xPercent = ((chunkSize - minChunk) / chunkSpan) * 100;
    const yPercent = 100 - ((score - minScore) / scoreSpan) * 100;
    return { xPercent, yPercent };
  }

  const donePoints = points.filter((p) => p.status === "done" && p.topOneScore !== null);
  const polylinePoints = donePoints
    .map((p) => {
      const { xPercent, yPercent } = toPercent(p.chunkSize, p.topOneScore as number);
      return `${xPercent},${yPercent}`;
    })
    .join(" ");

  const flat = isFlatCurve(points);

  return (
    <div>
      <div className="relative h-40 w-full rounded-md bg-chart-grid">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          {polylinePoints && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="var(--doc-teal)"
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
              opacity={0.7}
            />
          )}
        </svg>
        {points.map((p) => {
          const score = p.topOneScore ?? minScore;
          const { xPercent, yPercent } = toPercent(p.chunkSize, score);
          const label =
            p.status === "done" && p.topOneScore !== null
              ? `Chunk size ${p.chunkSize}, top match score ${p.topOneScore.toFixed(2)} -- load this configuration`
              : p.status === "error"
                ? `Chunk size ${p.chunkSize}, failed to embed`
                : `Chunk size ${p.chunkSize}, not yet computed`;
          return (
            <button
              key={p.chunkSize}
              type="button"
              disabled={p.status !== "done"}
              onClick={() => onPointActivate(p.chunkSize)}
              aria-label={label}
              title={label}
              style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors ${
                p.status === "done"
                  ? "h-3 w-3 border-doc-teal bg-doc-teal/70 hover:bg-doc-teal focus-visible:bg-doc-teal"
                  : p.status === "error"
                    ? "h-3 w-3 border-danger bg-danger/50"
                    : "h-2.5 w-2.5 border-ink-500 bg-ink-700"
              } disabled:cursor-not-allowed`}
            />
          );
        })}
      </div>
      {flat && (
        <p role="status" className="mt-2 text-xs italic text-ink-500">
          This range doesn&apos;t move the top-match score much for this document/question -- a flat curve is a
          valid result, not a broken one.
        </p>
      )}
    </div>
  );
}
