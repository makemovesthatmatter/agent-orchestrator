import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostCards } from "../../components/agentic-os/CostCards";

describe("CostCards", () => {
  it("renders three cards with correct labels", () => {
    render(<CostCards today={0} week={0} month={0} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("7 Days")).toBeInTheDocument();
    expect(screen.getByText("30 Days")).toBeInTheDocument();
  });

  it("formats dollar amounts with two decimal places", () => {
    render(<CostCards today={3.5} week={12.34} month={50} />);
    expect(screen.getByText("$3.50")).toBeInTheDocument();
    expect(screen.getByText("$12.34")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("formats zero as $0.00", () => {
    render(<CostCards today={0} week={0} month={0} />);
    const zeros = screen.getAllByText("$0.00");
    expect(zeros).toHaveLength(3);
  });

  it("applies green color when value is under 80% of threshold", () => {
    // today=$2 is 40% of $5 threshold → green
    render(<CostCards today={2} week={0} month={0} />);
    const el = screen.getByText("$2.00");
    const style = el.getAttribute("style") ?? "";
    expect(style).toContain("var(--color-status-ready)");
  });

  it("applies yellow color when value is between 80% and 100% of threshold", () => {
    // today=$4.5 is 90% of $5 threshold → yellow
    render(<CostCards today={4.5} week={0} month={0} />);
    const el = screen.getByText("$4.50");
    const style = el.getAttribute("style") ?? "";
    expect(style).toContain("var(--color-status-attention)");
  });

  it("applies red color when value meets or exceeds threshold", () => {
    // today=$6 is 120% of $5 threshold → red
    render(<CostCards today={6} week={0} month={0} />);
    const el = screen.getByText("$6.00");
    const style = el.getAttribute("style") ?? "";
    expect(style).toContain("var(--color-status-error)");
  });

  it("applies red color exactly at 100% of threshold", () => {
    // today=$5 is exactly 100% of $5 → red (ratio >= 1)
    render(<CostCards today={5} week={0} month={0} />);
    const el = screen.getByText("$5.00");
    const style = el.getAttribute("style") ?? "";
    expect(style).toContain("var(--color-status-error)");
  });

  it("applies independent colors per card based on their own threshold", () => {
    // today=$6 (over $5) → red; week=$10 (under 80% of $25) → green
    render(<CostCards today={6} week={10} month={50} />);

    const todayEl = screen.getByText("$6.00");
    expect(todayEl.getAttribute("style") ?? "").toContain("var(--color-status-error)");

    const weekEl = screen.getByText("$10.00");
    expect(weekEl.getAttribute("style") ?? "").toContain("var(--color-status-ready)");
  });
});
