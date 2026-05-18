import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FindingsBadges } from "../../components/agentic-os/FindingsBadges";

describe("FindingsBadges", () => {
  it("renders badges for all four severity levels", () => {
    const { container } = render(
      <FindingsBadges
        counts={{ critical: 1, warning: 2, suggestion: 3, info: 4 }}
      />
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Critical");
    expect(text).toContain("Warning");
    expect(text).toContain("Suggestion");
    expect(text).toContain("Info");
  });

  it("shows count values correctly for each severity", () => {
    const { container } = render(
      <FindingsBadges
        counts={{ critical: 7, warning: 3, suggestion: 5, info: 2 }}
      />
    );
    const countSpans = container.querySelectorAll(".tabular-nums");
    const counts = Array.from(countSpans).map((s) => Number(s.textContent));
    expect(counts).toEqual([7, 3, 5, 2]);
  });

  it("handles zero counts for all severities", () => {
    const { container } = render(
      <FindingsBadges
        counts={{ critical: 0, warning: 0, suggestion: 0, info: 0 }}
      />
    );
    const countSpans = container.querySelectorAll(".tabular-nums");
    const counts = Array.from(countSpans).map((s) => Number(s.textContent));
    expect(counts).toEqual([0, 0, 0, 0]);
  });

  it("renders exactly four badge elements", () => {
    const { container } = render(
      <FindingsBadges
        counts={{ critical: 1, warning: 1, suggestion: 1, info: 1 }}
      />
    );
    // Each badge is a <span> inside the wrapper div; count via tabular-nums spans
    const countSpans = container.querySelectorAll(".tabular-nums");
    expect(countSpans).toHaveLength(4);
  });

  it("renders large counts without truncation", () => {
    const { container } = render(
      <FindingsBadges
        counts={{ critical: 999, warning: 1234, suggestion: 0, info: 42 }}
      />
    );
    const text = container.textContent ?? "";
    expect(text).toContain("999");
    expect(text).toContain("1234");
    expect(text).toContain("42");
  });
});
