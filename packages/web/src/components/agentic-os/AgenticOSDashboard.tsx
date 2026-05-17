"use client";

import Link from "next/link";
import type { AgenticOSSummary } from "@/lib/agentic-os-db";
import { CostCards } from "./CostCards";
import { CostChart } from "./CostChart";
import { DreamRunTable } from "./DreamRunTable";
import { FindingsBadges } from "./FindingsBadges";
import { RecommendationList } from "./RecommendationList";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "never";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const hours = Math.floor(diffMins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function AgenticOSDashboard({ summary }: { summary: AgenticOSSummary }) {
  if (!summary.available) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <p className="mb-2 text-[18px] font-semibold text-[var(--color-text-primary)]">
            Agentic OS not configured
          </p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Run <code className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 font-mono text-[12px]">/dream</code> to create the database and start self-improvement analysis.
          </p>
        </div>
      </div>
    );
  }

  const maxModelCost = Math.max(...summary.costSummary.byModel.map((m) => m.cost), 0.001);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
            Agentic OS
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
            Self-improvement engine — cost tracking, dream analysis, and recommendations
          </p>
        </div>

        {/* Cost Overview */}
        <Section title="Cost Overview">
          <CostCards
            today={summary.costSummary.today}
            week={summary.costSummary.week}
            month={summary.costSummary.month}
          />
        </Section>

        {/* Cost by Model */}
        {summary.costSummary.byModel.length > 0 && (
          <Section title="Cost by Model (7 days)">
            <div className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-3">
              <div className="space-y-2">
                {summary.costSummary.byModel.map((m) => (
                  <div key={m.model} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 truncate text-[11px] text-[var(--color-text-secondary)]" title={m.model}>
                      {m.model}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]" style={{ height: "6px" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(m.cost / maxModelCost) * 100}%`,
                          backgroundColor: "var(--color-accent)",
                        }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-primary)]">
                      ${m.cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Daily Cost Trend */}
        {summary.costSummary.byDay.length > 0 && (
          <Section title="Daily Cost Trend (30 days)">
            <CostChart data={summary.costSummary.byDay} />
          </Section>
        )}

        {/* Findings Summary */}
        <Section title={`Findings — Latest Run`}>
          <FindingsBadges counts={summary.findingCounts} />
        </Section>

        {/* Dream Run History */}
        <Section title="Dream Run History">
          <div className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">
            <DreamRunTable runs={summary.dreamRuns} />
          </div>
        </Section>

        {/* Pending Recommendations */}
        <Section title={`Pending Recommendations (${summary.pendingRecommendations.length})`}>
          <RecommendationList recommendations={summary.pendingRecommendations} />
        </Section>

        {/* Health */}
        <Section title="Health">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Last Dream", value: formatTimestamp(summary.health.lastDreamAt) },
              { label: "Last Scheduled", value: formatTimestamp(summary.health.lastScheduledAt) },
              { label: "DB Size", value: formatBytes(summary.health.dbSizeBytes) },
              { label: "Schema Version", value: summary.schemaVersion !== null ? String(summary.schemaVersion) : "—" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2"
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  {label}
                </div>
                <div className="mt-0.5 text-[13px] text-[var(--color-text-primary)]">{value}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
