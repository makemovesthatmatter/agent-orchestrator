"use client";

interface Recommendation {
  id: number;
  run_id: number;
  type: string;
  title: string;
  description: string;
  status: string;
  payload: string | null;
  created_at: string;
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (diffMs < 0) return "just now";
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  alert: { color: "var(--color-status-error)", bg: "var(--color-tint-red)" },
  config_change: { color: "var(--color-accent)", bg: "var(--color-tint-violet)" },
  optimization: { color: "var(--color-status-working)", bg: "var(--color-tint-green)" },
  warning: { color: "var(--color-status-attention)", bg: "var(--color-tint-yellow)" },
};

function TypeBadge({ type }: { type: string }) {
  const style = TYPE_COLORS[type] ?? {
    color: "var(--color-text-secondary)",
    bg: "var(--color-tint-neutral)",
  };
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <div className="py-6 text-center text-[11px] text-[var(--color-text-muted)]">
        No pending recommendations
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2.5"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <TypeBadge type={rec.type} />
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {formatRelativeTime(rec.created_at)}
            </span>
          </div>
          <div className="mb-0.5 text-[13px] font-medium text-[var(--color-text-primary)]">
            {rec.title}
          </div>
          <div
            className="text-[11px] text-[var(--color-text-secondary)] overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {rec.description}
          </div>
        </div>
      ))}
      <p className="pt-1 text-[10px] text-[var(--color-text-muted)]">
        Use <code className="rounded bg-[var(--color-bg-subtle)] px-1 py-0.5 font-mono">/recommend</code> to review and act on these.
      </p>
    </div>
  );
}
