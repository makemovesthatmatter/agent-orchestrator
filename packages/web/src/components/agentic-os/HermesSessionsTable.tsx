import type { HermesSession } from "@/lib/hermes-db";
import { redactSecrets } from "@/lib/redact";

function formatRelative(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(startedAt: number, endedAt: number | null): string {
  if (!endedAt) return "—";
  const secs = endedAt - startedAt;
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (mins < 60) return `${mins}m ${remSecs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function truncateModel(model: string | null): string {
  if (!model) return "—";
  const slashIdx = model.indexOf("/");
  const stripped = slashIdx !== -1 ? model.slice(slashIdx + 1) : model;
  return redactSecrets(stripped);
}

function truncateTitle(title: string | null, id: string): string {
  if (!title) return id.slice(0, 8);
  const safe = redactSecrets(title);
  return safe.length > 80 ? safe.slice(0, 80) + "…" : safe;
}

const SOURCE_COLORS: Record<string, string> = {
  cli: "var(--color-accent)",
  telegram: "var(--color-status-ready)",
  slack: "var(--color-status-attention)",
  discord: "var(--color-text-secondary)",
};

function SourceBadge({ source }: { source: string }) {
  const safe = redactSecrets(source);
  const color = SOURCE_COLORS[safe.toLowerCase()] ?? "var(--color-text-muted)";
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{
        color,
        backgroundColor: "var(--color-bg-subtle)",
        border: `1px solid ${color}`,
        opacity: 0.9,
      }}
    >
      {safe}
    </span>
  );
}

export function HermesSessionsTable({ sessions }: { sessions: HermesSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-6 text-center">
        <p className="text-[12px] text-[var(--color-text-muted)]">No Hermes sessions yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)]">
            {["Source", "Title", "Model", "Started", "Duration", "Messages", "Cost"].map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                style={{ fontSize: "10px" }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => {
            const cost = s.actual_cost_usd ?? s.estimated_cost_usd ?? 0;
            return (
              <tr
                key={s.id}
                className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-subtle)]"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <SourceBadge source={s.source} />
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate" title={s.title ? redactSecrets(s.title) : s.id}>
                  <a
                    href={`http://localhost:9119/sessions/${encodeURIComponent(s.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline"
                  >
                    {truncateTitle(s.title, s.id)}
                  </a>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--color-text-secondary)]">
                  {truncateModel(s.model)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-[var(--color-text-secondary)]">
                  {formatRelative(s.started_at)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-[var(--color-text-secondary)]">
                  {formatDuration(s.started_at, s.ended_at)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-[var(--color-text-secondary)]">
                  {s.message_count}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-[var(--color-text-primary)]">
                  ${cost.toFixed(4)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
