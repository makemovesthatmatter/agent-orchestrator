import type { HermesStatus } from "@/lib/hermes-db";

function formatRelative(isoString: string | null): string {
  if (!isoString) return "never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function HermesStatusBanner({ status }: { status: HermesStatus }) {
  if (status.present && status.db_present) {
    return (
      <div className="mb-4 flex items-center justify-between rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-status-ready)" }}
          />
          <span className="text-[12px] text-[var(--color-text-primary)]">
            Hermes detected —{" "}
            <span className="font-medium">{status.session_count}</span> sessions, last activity{" "}
            <span className="font-medium">{formatRelative(status.last_session_at)}</span>
          </span>
        </div>
        <a
          href="http://localhost:9119"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[var(--color-accent)] hover:underline"
        >
          Open UI →
        </a>
      </div>
    );
  }

  if (status.present && !status.db_present) {
    return (
      <div className="mb-4 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-text-muted)" }}
          />
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            Hermes installed but no sessions yet — run{" "}
            <code className="rounded bg-[var(--color-bg-subtle)] px-1 py-0.5 font-mono text-[11px]">
              hermes
            </code>{" "}
            to create your first session
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--color-text-muted)" }}
        />
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          Hermes not detected. Install:{" "}
          <code className="rounded bg-[var(--color-bg-subtle)] px-1 py-0.5 font-mono text-[11px] break-all">
            curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
          </code>
        </span>
      </div>
    </div>
  );
}
