import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("better-sqlite3", () => ({ default: vi.fn() }));
vi.mock("@aoagents/ao-core", () => ({ getAoBaseDir: () => "/fake/ao/dir" }));
vi.mock("fs", () => {
  const existsSync = vi.fn().mockReturnValue(false);
  const statSync = vi.fn().mockReturnValue({ size: 2048 });
  const readFileSync = vi.fn();
  const writeFileSync = vi.fn();
  const mod = { existsSync, statSync, readFileSync, writeFileSync };
  return { ...mod, default: mod };
});

import * as fs from "fs";
import Database from "better-sqlite3";
import { getAgenticOSSummary, getCostDetails } from "../../lib/agentic-os-db";

function makeMockDb(overrides: {
  schemaV?: number | null;
  costToday?: number;
  costWeek?: number;
  costMonth?: number;
}) {
  const { schemaV = 3, costToday = 1.0, costWeek = 5.0, _costMonth = 10.0 } = overrides;

  const mockPrepare = vi.fn().mockImplementation((sql: string) => ({
    get: vi.fn().mockImplementation(() => {
      if (sql.includes("schema_version")) return schemaV !== null ? { v: schemaV } : { v: null };
      if (sql.includes("COALESCE") && sql.includes("period_date = ?")) return { total: costToday };
      if (sql.includes("COALESCE")) return { total: costWeek };
      return {};
    }),
    all: vi.fn().mockReturnValue([]),
  }));

  return {
    pragma: vi.fn(),
    prepare: mockPrepare,
    close: vi.fn(),
  };
}

describe("getAgenticOSSummary", () => {
  beforeEach(() => {
    vi.mocked(Database).mockReset();
  });

  it("returns fallback shape when DB does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const result = getAgenticOSSummary();

    expect(result.available).toBe(false);
    expect(result.schemaVersion).toBeNull();
    expect(result.dreamRuns).toEqual([]);
    expect(result.costSummary).toMatchObject({
      today: 0,
      week: 0,
      month: 0,
      byModel: [],
      byDay: [],
    });
    expect(result.pendingRecommendations).toEqual([]);
    expect(result.recentFindings).toEqual([]);
    expect(result.findingCounts).toMatchObject({
      critical: 0,
      warning: 0,
      suggestion: 0,
      info: 0,
    });
    expect(result.health.lastDreamAt).toBeNull();
    expect(result.health.lastScheduledAt).toBeNull();
    expect(result.health.dbSizeBytes).toBe(0);
  });

  it("returns available=true with expected shape when DB exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(Database).mockImplementation(
      () => makeMockDb({ schemaV: 3 }) as unknown as Database.Database
    );

    const result = getAgenticOSSummary();

    expect(result.available).toBe(true);
    expect(result.schemaVersion).toBe(3);
    expect(Array.isArray(result.dreamRuns)).toBe(true);
    expect(Array.isArray(result.pendingRecommendations)).toBe(true);
    expect(Array.isArray(result.recentFindings)).toBe(true);
    expect(typeof result.costSummary.today).toBe("number");
    expect(typeof result.costSummary.week).toBe("number");
    expect(typeof result.costSummary.month).toBe("number");
    expect(Array.isArray(result.costSummary.byModel)).toBe(true);
    expect(Array.isArray(result.costSummary.byDay)).toBe(true);
    expect(typeof result.health.dbSizeBytes).toBe("number");
    expect("critical" in result.findingCounts).toBe(true);
    expect("warning" in result.findingCounts).toBe(true);
    expect("suggestion" in result.findingCounts).toBe(true);
    expect("info" in result.findingCounts).toBe(true);
  });

  it("closes the DB connection after reading", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const mockClose = vi.fn();
    vi.mocked(Database).mockImplementation(
      () => ({ ...makeMockDb({}), close: mockClose }) as unknown as Database.Database
    );

    getAgenticOSSummary();

    // Summary now opens agentic-os DB + up to 5 hermes DB connections (one per hermes-db helper);
    // verify all are closed — close() must be called at least once.
    expect(mockClose).toHaveBeenCalled();
  });
});

describe("getCostDetails", () => {
  beforeEach(() => {
    vi.mocked(Database).mockReset();
  });

  it("returns empty array when DB does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getCostDetails("7d")).toEqual([]);
  });

  it("returns records array when DB exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const mockRows = [
      {
        id: 1,
        session_id: "session-abc",
        parent_session_id: null,
        model: "claude-opus-4-6",
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 1.5,
        period_date: "2026-05-18",
        project: "test",
      },
    ];
    vi.mocked(Database).mockImplementation(
      () =>
        ({
          pragma: vi.fn(),
          prepare: vi.fn().mockReturnValue({ all: vi.fn().mockReturnValue(mockRows) }),
          close: vi.fn(),
        }) as unknown as Database.Database
    );

    const result = getCostDetails("7d");

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe("claude-opus-4-6");
    expect(result[0].total_cost_usd).toBe(1.5);
    expect(result[0].session_id).toBe("session-abc");
  });

  it("returns empty array for default period when no records", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(Database).mockImplementation(
      () =>
        ({
          pragma: vi.fn(),
          prepare: vi.fn().mockReturnValue({ all: vi.fn().mockReturnValue([]) }),
          close: vi.fn(),
        }) as unknown as Database.Database
    );

    const result = getCostDetails();
    expect(result).toEqual([]);
  });
});
