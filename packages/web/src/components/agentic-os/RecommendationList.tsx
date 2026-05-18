"use client";

import { useState } from "react";

interface Recommendation {
  id: number;
  finding_id: number;
  type: string;
  title: string;
  description: string;
  status: string;
  action_payload: string | null;
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
  budget_alert: { color: "var(--color-status-error)", bg: "var(--color-tint-red)" },
  cost_optimization: { color: "var(--color-status-attention)", bg: "var(--color-tint-yellow)" },
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

function ActionButton({
  label,
  variant,
  onClick,
  loading,
}: {
  label: string;
  variant: "primary" | "muted" | "danger";
  onClick: () => void;
  loading?: boolean;
}) {
  const styles = {
    primary: "border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-tint-violet)]",
    muted: "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]",
    danger: "border-[var(--color-status-error)] text-[var(--color-status-error)] hover:bg-[var(--color-tint-red)]",
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={loading}
      className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${styles[variant]}`}
    >
      {loading ? "..." : label}
    </button>
  );
}

export function RecommendationList({
  recommendations,
  onAction,
}: {
  recommendations: Recommendation[];
  onAction?: (id: number, action: "dismiss" | "snooze" | "apply") => Promise<boolean>;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return (
      <div className="py-6 text-center text-[11px] text-[var(--color-text-muted)]">
        No pending recommendations
      </div>
    );
  }

  const handleAction = async (id: number, action: "dismiss" | "snooze" | "apply") => {
    if (!onAction) return;
    setLoadingAction(`${id}-${action}`);
    await onAction(id, action);
    setLoadingAction(null);
  };

  return (
    <div className="space-y-2">
      {recommendations.map((rec) => {
        const isExpanded = expandedId === rec.id;
        return (
          <div
            key={rec.id}
            onClick={() => setExpandedId(isExpanded ? null : rec.id)}
            className="cursor-pointer rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2.5 transition-colors hover:border-[var(--color-border-default)]"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg
                  className="shrink-0 transition-transform"
                  style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <TypeBadge type={rec.type} />
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {formatRelativeTime(rec.created_at)}
              </span>
            </div>
            <div className="mb-0.5 text-[13px] font-medium text-[var(--color-text-primary)]">
              {rec.title}
            </div>
            {!isExpanded && (
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
            )}
            {isExpanded && (
              <div className="mt-1 space-y-3">
                <div className="text-[11px] text-[var(--color-text-secondary)] whitespace-pre-wrap">
                  {rec.description}
                </div>
                {rec.action_payload && (
                  <div className="rounded bg-[var(--color-bg-subtle)] px-3 py-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Action Payload
                    </div>
                    <pre className="text-[10px] text-[var(--color-text-secondary)] whitespace-pre-wrap font-mono">
                      {rec.action_payload}
                    </pre>
                  </div>
                )}
                {onAction && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border-subtle)]">
                    <ActionButton
                      label="Apply"
                      variant="primary"
                      loading={loadingAction === `${rec.id}-apply`}
                      onClick={() => handleAction(rec.id, "apply")}
                    />
                    <ActionButton
                      label="Snooze 24h"
                      variant="muted"
                      loading={loadingAction === `${rec.id}-snooze`}
                      onClick={() => handleAction(rec.id, "snooze")}
                    />
                    <ActionButton
                      label="Dismiss"
                      variant="danger"
                      loading={loadingAction === `${rec.id}-dismiss`}
                      onClick={() => handleAction(rec.id, "dismiss")}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
