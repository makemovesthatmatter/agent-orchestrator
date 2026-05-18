"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

type DreamStatus = "idle" | "running" | "done" | "error";

function RunDreamButton() {
  const [status, setStatus] = useState<DreamStatus>("idle");
  const router = useRouter();

  const handleRun = useCallback(async () => {
    setStatus("running");
    try {
      const res = await fetch("/api/agentic-os/dream/run", { method: "POST" });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
      setTimeout(() => {
        setStatus("idle");
        router.refresh();
      }, 3000);
    } catch {
      setStatus("error");
    }
  }, [router]);

  return (
    <button
      onClick={handleRun}
      disabled={status === "running"}
      className="inline-flex items-center gap-1.5 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
    >
      {status === "running" && (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      )}
      {status === "done" && (
        <svg className="h-3 w-3 text-[var(--color-status-working)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {status === "error" && (
        <svg className="h-3 w-3 text-[var(--color-status-error)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      )}
      {status === "idle" && (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )}
      {status === "running" ? "Running..." : status === "done" ? "Started" : status === "error" ? "Failed" : "Run Dream"}
    </button>
  );
}

export function AgenticOSDashboard({ summary }: { summary: AgenticOSSummary }) {
  const router = useRouter();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleRecommendationAction = useCallback(async (id: number, action: "dismiss" | "snooze" | "apply") => {
    const res = await fetch("/api/agentic-os/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, snoozeHours: 24 }),
    });
    if (res.ok) {
      const data = await res.json();
      if (action === "apply" && data.session) {
        showToast(`Agent session spawned — applying "${data.recommendation?.title}"`);
      } else if (action === "apply" && data.spawnError) {
        showToast(`Marked as applied but session spawn failed: ${data.spawnError}`, "error");
      } else if (action === "dismiss") {
        showToast("Recommendation dismissed");
      } else if (action === "snooze") {
        showToast("Snoozed for 24 hours");
      }
      router.refresh();
    }
    return res.ok;
  }, [router, showToast]);

  if (!summary.available) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <p className="mb-2 text-[18px] font-semibold text-[var(--color-text-primary)]">
            Agentic OS not configured
          </p>
          <p className="mb-4 text-[13px] text-[var(--color-text-secondary)]">
            Run <code className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 font-mono text-[12px]">/dream</code> to create the database and start self-improvement analysis.
          </p>
          <RunDreamButton />
        </div>
      </div>
    );
  }

  const maxModelCost = Math.max(...summary.costSummary.byModel.map((m) => m.cost), 0.001);

  return (
    <div className="h-screen overflow-y-auto bg-[var(--color-bg-base)]">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <RunDreamButton />
          </div>
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
        <Section title="Findings — Latest Run">
          <FindingsBadges counts={summary.findingCounts} />
        </Section>

        {/* Dream Run History */}
        <Section title="Dream Run History">
          <div className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">
            <DreamRunTable runs={summary.dreamRuns} findings={summary.recentFindings} />
          </div>
        </Section>

        {/* Pending Recommendations */}
        <Section
          title={`Pending Recommendations (${summary.pendingRecommendations.length})`}
          action={
            summary.pendingRecommendations.length > 5 ? (
              <button
                onClick={async () => {
                  for (const rec of summary.pendingRecommendations) {
                    await fetch("/api/agentic-os/recommendations", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: rec.id, action: "dismiss" }),
                    });
                  }
                  router.refresh();
                }}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] transition-colors"
              >
                Dismiss all
              </button>
            ) : null
          }
        >
          <RecommendationList
            recommendations={summary.pendingRecommendations}
            onAction={handleRecommendationAction}
          />
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

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded border px-4 py-3 text-[12px] shadow-lg transition-all"
          style={{
            backgroundColor: "var(--color-bg-elevated)",
            borderColor: toast.type === "error" ? "var(--color-status-error)" : "var(--color-accent)",
            color: "var(--color-text-primary)",
          }}
        >
          <div className="flex items-start gap-2">
            {toast.type === "success" ? (
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-status-error)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
