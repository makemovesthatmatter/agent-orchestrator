import type { HermesBySource } from "@/lib/hermes-db";
import { redactSecrets } from "@/lib/redact";

export function HermesSourceBreakdown({ bySource }: { bySource: HermesBySource[] }) {
  if (bySource.length === 0) {
    return (
      <div className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-4 text-center">
        <p className="text-[12px] text-[var(--color-text-muted)]">No source data</p>
      </div>
    );
  }

  const maxSessions = Math.max(...bySource.map((s) => s.sessions), 1);

  return (
    <div className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        By Source (30 days)
      </div>
      <div className="space-y-2.5">
        {bySource.map((s) => (
          <div key={s.source}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
                {redactSecrets(s.source)}
              </span>
              <div className="flex items-center gap-2 text-[11px] tabular-nums text-[var(--color-text-secondary)]">
                <span>{s.sessions} session{s.sessions !== 1 ? "s" : ""}</span>
                <span className="text-[var(--color-text-muted)]">·</span>
                <span>${s.cost.toFixed(4)}</span>
              </div>
            </div>
            <div
              className="overflow-hidden rounded-full bg-[var(--color-bg-subtle)]"
              style={{ height: "5px" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(s.sessions / maxSessions) * 100}%`,
                  backgroundColor: "var(--color-accent)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
