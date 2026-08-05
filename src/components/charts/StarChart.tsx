"use client";

import { useMemo } from "react";

export interface StarPoint {
  id: string;
  x: number; // raw projected coordinate, arbitrary scale
  y: number;
  label: string;
  score?: number; // similarity score, if this point is a retrieval candidate
  highlighted?: boolean;
}

export interface Beacon {
  x: number;
  y: number;
  label: string;
}

/**
 * Renders a set of points ("stars") in 2D embedding space, plus an
 * optional query "beacon" with course-lines drawn to its nearest
 * neighbors. This is the playground's signature visual: RAG retrieval
 * reframed as navigation across a chart.
 */
export function StarChart({
  points,
  beacon,
  width = 560,
  height = 360,
  showCourseLines = true,
}: {
  points: StarPoint[];
  beacon?: Beacon;
  width?: number;
  height?: number;
  showCourseLines?: boolean;
}) {
  const padding = 36;

  const { toScreen } = useMemo(() => {
    const allX = points.map((p) => p.x).concat(beacon ? [beacon.x] : []);
    const allY = points.map((p) => p.y).concat(beacon ? [beacon.y] : []);
    const minX = Math.min(...allX, -0.3);
    const maxX = Math.max(...allX, 0.3);
    const minY = Math.min(...allY, -0.3);
    const maxY = Math.max(...allY, 0.3);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    const toScreen = (x: number, y: number) => ({
      sx: padding + ((x - minX) / spanX) * (width - padding * 2),
      // flip y so "up" on the chart feels natural
      sy: height - padding - ((y - minY) / spanY) * (height - padding * 2),
    });

    return { toScreen };
  }, [points, beacon, width, height]);

  const beaconScreen = beacon ? toScreen(beacon.x, beacon.y) : null;
  const highlighted = points.filter((p) => p.highlighted);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full rounded-md bg-chart-grid"
      role="img"
      aria-label="Embedding space star chart"
    >
      {/* course lines from beacon to highlighted stars */}
      {showCourseLines &&
        beaconScreen &&
        highlighted.map((p) => {
          const s = toScreen(p.x, p.y);
          return (
            <line
              key={`course-${p.id}`}
              x1={beaconScreen.sx}
              y1={beaconScreen.sy}
              x2={s.sx}
              y2={s.sy}
              stroke="var(--query-amber)"
              strokeWidth={1.25}
              strokeDasharray="3 3"
              opacity={0.7}
            />
          );
        })}

      {/* stars (chunks) -- highlighted points use a diamond marker, not
          just a color/size change, so they stay distinguishable for
          learners with color-vision deficiency (FR-005). */}
      {points.map((p) => {
        const s = toScreen(p.x, p.y);
        const r = p.highlighted ? 6 : 4;
        return (
          <g key={p.id}>
            {p.highlighted ? (
              <rect
                x={s.sx - r}
                y={s.sy - r}
                width={r * 2}
                height={r * 2}
                transform={`rotate(45 ${s.sx} ${s.sy})`}
                fill="var(--query-amber)"
                stroke="var(--query-amber)"
                strokeOpacity={0.3}
                strokeWidth={6}
              />
            ) : (
              <circle
                cx={s.sx}
                cy={s.sy}
                r={r}
                fill="var(--doc-teal)"
                opacity={0.75}
              />
            )}
            <text
              x={s.sx + 8}
              y={s.sy + 3}
              fontSize={9.5}
              fontFamily="var(--font-mono)"
              fill={p.highlighted ? "var(--ink-100)" : "var(--ink-500)"}
            >
              {p.label}
              {typeof p.score === "number" ? ` (${p.score.toFixed(2)})` : ""}
            </text>
          </g>
        );
      })}

      {/* beacon (query) */}
      {beaconScreen && beacon && (
        <g>
          <circle
            cx={beaconScreen.sx}
            cy={beaconScreen.sy}
            r={7}
            fill="var(--chart-bg)"
            stroke="var(--query-amber)"
            strokeWidth={2.5}
          />
          <circle cx={beaconScreen.sx} cy={beaconScreen.sy} r={2.5} fill="var(--query-amber)" />
          <text
            x={beaconScreen.sx + 10}
            y={beaconScreen.sy - 8}
            fontSize={10.5}
            fontFamily="var(--font-mono)"
            fill="var(--query-amber)"
            fontWeight={600}
          >
            {beacon.label}
          </text>
        </g>
      )}
    </svg>
  );
}
