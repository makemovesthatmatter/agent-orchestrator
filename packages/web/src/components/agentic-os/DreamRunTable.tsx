"use client";

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

export function DreamRunTable({ runs }: { runs: DreamRun[] }) {
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
            {["#", "Date", "Trigger", "Duration", "Findings", "Recs", "Status"].map((h) => (
              <th
                key={h}
                className="py-1.5 pr-4 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)]"
            >
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
