"use client";

interface CostCardsProps {
  today: number;
  week: number;
  month: number;
}

function formatDollars(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getBudgetColor(value: number, threshold: number): string {
  const ratio = value / threshold;
  if (ratio >= 1) return "var(--color-status-error)";
  if (ratio >= 0.8) return "var(--color-status-attention)";
  return "var(--color-status-ready)";
}

export function CostCards({ today, week, month }: CostCardsProps) {
  const cards = [
    { label: "Today", value: today, threshold: 5 },
    { label: "7 Days", value: week, threshold: 25 },
    { label: "30 Days", value: month, threshold: 100 },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ label, value, threshold }) => (
        <div
          key={label}
          className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-3"
        >
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            {label}
          </div>
          <div
            className="text-[18px] font-semibold tabular-nums"
            style={{ color: getBudgetColor(value, threshold) }}
          >
            {formatDollars(value)}
          </div>
        </div>
      ))}
    </div>
  );
}
