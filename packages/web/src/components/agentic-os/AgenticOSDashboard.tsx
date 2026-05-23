"use client";

import Link from "next/link";
import type { AgenticOSSummary } from "@/lib/agentic-os-db";
import { CostCards } from "./CostCards";
import { CostChart } from "./CostChart";
import { HermesStatusBanner } from "./HermesStatusBanner";
import { HermesSessionsTable } from "./HermesSessionsTable";
import { HermesSourceBreakdown } from "./HermesSourceBreakdown";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function AgenticOSDashboard({ summary }: { summary: AgenticOSSummary }) {
  if (!summary.available && !summary.hermes.status.present) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <p className="mb-2 text-[18px] font-semibold text-[var(--color-text-primary)]">
            Agentic OS not configured
          </p>
          <p className="mb-4 text-[13px] text-[var(--color-text-secondary)]">
            Install Hermes Agent to start tracking sessions:
          </p>
          <code className="rounded bg-[var(--color-bg-subtle)] px-2 py-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
            curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
          </code>
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
            Hermes Agent telemetry — sessions, costs, source breakdown
          </p>
        </div>

        {/* Hermes Status Banner */}
        <Section title="Hermes Agent">
          <HermesStatusBanner status={summary.hermes.status} />
        </Section>

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

        {/* Hermes Sessions */}
        {summary.hermes.status.db_present && (
          <>
            <Section title="Hermes Sessions (recent)">
              <HermesSessionsTable sessions={summary.hermes.recentSessions} />
            </Section>
            {summary.hermes.bySource.length > 0 && (
              <Section title="Hermes by Source (30 days)">
                <HermesSourceBreakdown bySource={summary.hermes.bySource} />
              </Section>
            )}
          </>
        )}

        {/* Health */}
        <Section title="Health">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "DB Size", value: formatBytes(summary.health.dbSizeBytes) },
              { label: "Schema Version", value: summary.schemaVersion !== null ? String(summary.schemaVersion) : "—" },
              { label: "Hermes Version", value: summary.hermes.status.db_present ? "detected" : "—" },
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
