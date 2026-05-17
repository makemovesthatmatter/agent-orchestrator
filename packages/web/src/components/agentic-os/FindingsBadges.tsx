"use client";

interface FindingCounts {
  critical: number;
  warning: number;
  suggestion: number;
  info: number;
}

export function FindingsBadges({ counts }: { counts: FindingCounts }) {
  const badges = [
    {
      label: "Critical",
      count: counts.critical,
      color: "var(--color-status-error)",
      bg: "var(--color-tint-red)",
    },
    {
      label: "Warning",
      count: counts.warning,
      color: "var(--color-status-attention)",
      bg: "var(--color-tint-yellow)",
    },
    {
      label: "Suggestion",
      count: counts.suggestion,
      color: "var(--color-accent)",
      bg: "var(--color-tint-violet)",
    },
    {
      label: "Info",
      count: counts.info,
      color: "var(--color-text-muted)",
      bg: "var(--color-tint-neutral)",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(({ label, count, color, bg }) => (
        <span
          key={label}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium"
          style={{ color, backgroundColor: bg }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          {label}
          <span className="tabular-nums font-semibold">{count}</span>
        </span>
      ))}
    </div>
  );
}
