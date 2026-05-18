"use client";

import { useState } from "react";

interface Finding {
  id: number;
  run_id: number;
  dimension: string;
  category: string;
  severity: string;
  title: string;
  detail: string | null;
}

interface DreamRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  trigger: string;
  dimensions: string;
  findings_count: number;
  recommendations_count: number;
  collector_results: string | null;
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "running";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  let color = "var(--color-text-muted)";
  let bg = "var(--color-tint-neutral)";

  if (status === "complete" || status === "completed") {
    color = "var(--color-status-working)";
    bg = "var(--color-tint-green)";
  } else if (status === "failed" || status === "error") {
    color = "var(--color-status-error)";
    bg = "var(--color-tint-red)";
  } else if (status === "running") {
    color = "var(--color-status-attention)";
    bg = "var(--color-tint-yellow)";
  }

  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {status}
    </span>
  );
}

function TriggerBadge({ trigger }: { trigger: string }) {
  const isScheduled = trigger === "scheduled";
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        color: isScheduled ? "var(--color-accent)" : "var(--color-text-secondary)",
        backgroundColor: isScheduled ? "var(--color-tint-violet)" : "var(--color-tint-neutral)",
      }}
    >
      {trigger}
    </span>
  );
}

const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  critical: { color: "var(--color-status-error)", bg: "var(--color-tint-red)" },
  warning: { color: "var(--color-status-attention)", bg: "var(--color-tint-yellow)" },
  suggestion: { color: "var(--color-accent)", bg: "var(--color-tint-violet)" },
  info: { color: "var(--color-text-secondary)", bg: "var(--color-tint-neutral)" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_COLORS[severity] ?? {
    color: "var(--color-text-secondary)",
    bg: "var(--color-tint-neutral)",
  };
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      {severity}
    </span>
  );
}

function formatDetailValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    if (key.includes("token")) return value.toLocaleString();
    if (key.includes("percentage")) return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  }
  return String(value);
}

function DetailPanel({ detail }: { detail: string }) {
  try {
    const parsed = JSON.parse(detail);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        <div className="ml-6 mt-1 mb-2 rounded bg-[var(--color-bg-subtle)] px-3 py-2">
          <div className="space-y-1">
            {Object.entries(parsed).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[11px]">
                <span className="shrink-0 text-[var(--color-text-muted)]">
                  {key.replace(/_/g, " ")}:
                </span>
                <span className="text-[var(--color-text-primary)] font-mono">
                  {formatDetailValue(key, value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  } catch {
    // not JSON, render as text
  }
  return (
    <div className="ml-6 mt-1 mb-2 rounded bg-[var(--color-bg-subtle)] px-3 py-2 text-[11px] text-[var(--color-text-secondary)] whitespace-pre-wrap">
      {detail}
    </div>
  );
}

function FindingsPanel({ findings }: { findings: Finding[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (findings.length === 0) {
    return (
      <div className="py-3 text-center text-[11px] text-[var(--color-text-muted)]">
        No findings for this run
      </div>
    );
  }

  const grouped: Record<string, Finding[]> = {};
  for (const f of findings) {
    (grouped[f.dimension] ??= []).push(f);
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([dimension, items]) => (
        <div key={dimension}>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {dimension} ({items.length})
          </div>
          <div className="space-y-1">
            {items.map((f) => (
              <div key={f.id}>
                <button
                  onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                  className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <svg
                    className="mt-0.5 shrink-0 transition-transform"
                    style={{ transform: expandedId === f.id ? "rotate(90deg)" : "rotate(0deg)" }}
                    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  <SeverityBadge severity={f.severity} />
                  <span className="flex-1 text-[11px] text-[var(--color-text-primary)]">
                    {f.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                    {f.category}
                  </span>
                </button>
                {expandedId === f.id && f.detail && (
                  <DetailPanel detail={f.detail} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DreamRunTable({
  runs,
  findings,
}: {
  runs: DreamRun[];
  findings: Finding[];
}) {
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  if (runs.length === 0) {
    return (
      <div className="py-6 text-center text-[11px] text-[var(--color-text-muted)]">
        No dream runs yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)]">
            {["", "#", "Date", "Trigger", "Duration", "Findings", "Recs", "Status"].map((h) => (
              <th
                key={h || "expand"}
                className="py-1.5 pr-4 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.id;
            const runFindings = findings.filter((f) => f.run_id === run.id);
            return (
              <>
                <tr
                  key={run.id}
                  onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                  className="border-b border-[var(--color-border-subtle)] cursor-pointer hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <td className="py-2 pr-2 text-[var(--color-text-muted)]">
                    <svg
                      className="transition-transform"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                      width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-[var(--color-text-muted)]">{run.id}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-secondary)] whitespace-nowrap">
                    {formatDate(run.started_at)}
                  </td>
                  <td className="py-2 pr-4">
                    <TriggerBadge trigger={run.trigger} />
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-[var(--color-text-secondary)]">
                    {formatDuration(run.started_at, run.finished_at)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-[var(--color-text-primary)]">
                    {run.findings_count}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-[var(--color-text-primary)]">
                    {run.recommendations_count}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={run.status} />
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${run.id}-detail`}>
                    <td colSpan={8} className="p-0">
                      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 py-3">
                        <FindingsPanel findings={runFindings} />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
