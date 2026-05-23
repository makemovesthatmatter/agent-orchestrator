import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("better-sqlite3", () => ({ default: vi.fn() }));
vi.mock("fs", () => {
  const existsSync = vi.fn().mockReturnValue(false);
  return {
    existsSync,
    default: { existsSync },
  };
});

import * as fs from "fs";
import Database from "better-sqlite3";
import {
  getHermesStatus,
  getRecentHermesSessions,
  getHermesSessionsByDay,
  getHermesSessionsByModel,
  getHermesSessionsBySource,
} from "../../lib/hermes-db";

describe("getHermesStatus", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(Database).mockReset();
  });

  it("returns present=false, db_present=false when ~/.hermes does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const result = getHermesStatus();
    expect(result.present).toBe(false);
    expect(result.db_present).toBe(false);
    expect(result.last_session_at).toBeNull();
    expect(result.session_count).toBe(0);
  });

  it("returns present=true, db_present=false when dir exists but no DB", () => {
    vi.mocked(fs.existsSync).mockImplementation((p: unknown) => {
      const path = String(p);
      return path.endsWith(".hermes") && !path.endsWith("state.db");
    });
    const result = getHermesStatus();
    expect(result.present).toBe(true);
    expect(result.db_present).toBe(false);
    expect(result.session_count).toBe(0);
  });

  it("returns populated status when DB exists with sessions", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(Database).mockImplementation(
      () =>
        ({
          pragma: vi.fn(),
          prepare: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ c: 42, last: 1716000000 }),
          }),
          close: vi.fn(),
        }) as unknown as Database.Database
    );

    const result = getHermesStatus();
    expect(result.present).toBe(true);
    expect(result.db_present).toBe(true);
    expect(result.session_count).toBe(42);
    expect(result.last_session_at).not.toBeNull();
  });
});

describe("getRecentHermesSessions", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(Database).mockReset();
  });

  it("returns empty array when DB is absent", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getRecentHermesSessions()).toEqual([]);
  });

  it("enforces column whitelist — does not select content, tool_calls, or reasoning columns", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    let capturedSql = "";
    vi.mocked(Database).mockImplementation(
      () =>
        ({
          pragma: vi.fn(),
          prepare: vi.fn().mockImplementation((sql: string) => {
            capturedSql = sql;
            return { all: vi.fn().mockReturnValue([]) };
          }),
          close: vi.fn(),
        }) as unknown as Database.Database
    );

    getRecentHermesSessions();

    const forbidden = ["content", "tool_calls", "reasoning_", "system_prompt", "model_config"];
    for (const col of forbidden) {
      expect(capturedSql).not.toContain(col);
    }
  });

  it("returns session records when DB exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const mockSession = {
      id: "abc123",
      source: "cli",
      model: "anthropic/claude-opus-4.6",
      title: "Test session",
      started_at: 1716000000,
      ended_at: 1716003600,
      message_count: 10,
      input_tokens: 500,
      output_tokens: 200,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      actual_cost_usd: 0.05,
      estimated_cost_usd: null,
      parent_session_id: null,
    };
    vi.mocked(Database).mockImplementation(
      () =>
        ({
          pragma: vi.fn(),
          prepare: vi.fn().mockReturnValue({ all: vi.fn().mockReturnValue([mockSession]) }),
          close: vi.fn(),
        }) as unknown as Database.Database
    );

    const result = getRecentHermesSessions();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("abc123");
    expect(result[0].source).toBe("cli");
  });
});

describe("getHermesSessionsByDay", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(Database).mockReset();
  });

  it("returns empty array when DB is absent", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getHermesSessionsByDay()).toEqual([]);
  });
});

describe("getHermesSessionsByModel", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(Database).mockReset();
  });

  it("returns empty array when DB is absent", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getHermesSessionsByModel()).toEqual([]);
  });
});

describe("getHermesSessionsBySource", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(Database).mockReset();
  });

  it("returns empty array when DB is absent", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getHermesSessionsBySource()).toEqual([]);
  });
});
