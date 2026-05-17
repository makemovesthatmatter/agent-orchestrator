"use client";

interface DayData {
  date: string;
  cost: number;
}

interface CostChartProps {
  data: DayData[];
}

export function CostChart({ data }: CostChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-[11px] text-[var(--color-text-muted)]">
        No cost data available
      </div>
    );
  }

  const width = 600;
  const height = 80;
  const paddingX = 4;
  const paddingY = 8;

  const maxCost = Math.max(...data.map((d) => d.cost), 0.001);
  const n = data.length;

  const xScale = (i: number) =>
    paddingX + (i / Math.max(n - 1, 1)) * (width - paddingX * 2);
  const yScale = (cost: number) =>
    height - paddingY - (cost / maxCost) * (height - paddingY * 2);

  const points = data.map((d, i) => ({ x: xScale(i), y: yScale(d.cost), ...d }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = [
    linePath,
    `L ${points[points.length - 1].x.toFixed(1)} ${(height - paddingY).toFixed(1)}`,
    `L ${points[0].x.toFixed(1)} ${(height - paddingY).toFixed(1)}`,
    "Z",
  ].join(" ");

  // Show date labels every 5 days
  const labelIndices = points.filter((_, i) => i % 5 === 0).map((_, j) => j * 5);

  return (
    <div className="w-full overflow-hidden rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3">
      <svg
        viewBox={`0 0 ${width} ${height + 16}`}
        className="w-full"
        aria-label="Daily cost trend"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = paddingY + (1 - frac) * (height - paddingY * 2);
          return (
            <line
              key={frac}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="var(--color-bg-subtle)"
              strokeWidth="1"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="var(--color-accent)" fillOpacity="0.08" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--color-accent)">
            <title>{`${p.date}: $${p.cost.toFixed(4)}`}</title>
          </circle>
        ))}

        {/* X-axis date labels */}
        {labelIndices.map((idx) => {
          const p = points[idx];
          if (!p) return null;
          const dateLabel = p.date.slice(5); // MM-DD
          return (
            <text
              key={idx}
              x={p.x}
              y={height + 12}
              textAnchor="middle"
              fontSize="9"
              fill="var(--color-text-muted)"
            >
              {dateLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
