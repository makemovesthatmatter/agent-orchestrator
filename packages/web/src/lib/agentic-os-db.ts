import "server-only";
import Database from "better-sqlite3";
import { join, resolve } from "path";
import { existsSync, statSync } from "fs";
import { homedir } from "os";
import { getAoBaseDir } from "@aoagents/ao-core";

const DB_PATH = join(getAoBaseDir(), "agentic-os.db");
const DREAM_SCRIPT = resolve(homedir(), ".claude/skills/dream/lib/scheduler.py");

function getDb(): Database.Database | null {
  if (!existsSync(DB_PATH)) return null;
  const db = new Database(DB_PATH, { readonly: true });
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("query_only = ON");
  return db;
}

function getWriteDb(): Database.Database | null {
  if (!existsSync(DB_PATH)) return null;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return db;
}

export interface DreamRun {
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

export interface CostRecord {
  id: number;
  session_id: string;
  parent_session_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_cost_usd: number;
  period_date: string;
  project: string;
}

export interface Recommendation {
  id: number;
  finding_id: number;
  type: string;
  title: string;
  description: string;
  status: string;
  action_payload: string | null;
  created_at: string;
}

export interface Finding {
  id: number;
  run_id: number;
  dimension: string;
  category: string;
  severity: string;
  title: string;
  detail: string | null;
  created_at: string;
}

export interface CostSummary {
  today: number;
  week: number;
  month: number;
  byModel: Array<{ model: string; cost: number; tokens: number }>;
  byDay: Array<{ date: string; cost: number }>;
}

export interface AgenticOSSummary {
  available: boolean;
  schemaVersion: number | null;
  dreamRuns: DreamRun[];
  costSummary: CostSummary;
  pendingRecommendations: Recommendation[];
  recentFindings: Finding[];
  findingCounts: { critical: number; warning: number; suggestion: number; info: number };
  health: {
    lastDreamAt: string | null;
    lastScheduledAt: string | null;
    dbSizeBytes: number;
  };
}

export function getAgenticOSSummary(): AgenticOSSummary {
  const db = getDb();
  if (!db) {
    return {
      available: false,
      schemaVersion: null,
      dreamRuns: [],
      costSummary: { today: 0, week: 0, month: 0, byModel: [], byDay: [] },
      pendingRecommendations: [],
      recentFindings: [],
      findingCounts: { critical: 0, warning: 0, suggestion: 0, info: 0 },
      health: { lastDreamAt: null, lastScheduledAt: null, dbSizeBytes: 0 },
    };
  }

  try {
    const schemaVersion = (db.prepare("SELECT MAX(version) as v FROM schema_version").get() as { v: number })?.v ?? null;

    const dreamRuns = db.prepare(`
      SELECT id, started_at, completed_at as finished_at, status, trigger, dimensions,
        (SELECT COUNT(*) FROM dream_findings WHERE run_id = dream_runs.id) as findings_count,
        recommendations_created as recommendations_count,
        collector_status as collector_results
      FROM dream_runs
      ORDER BY id DESC
      LIMIT 20
    `).all() as DreamRun[];

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const costToday = (db.prepare("SELECT COALESCE(SUM(total_cost_usd), 0) as total FROM cost_records WHERE period_date = ?").get(today) as { total: number }).total;
    const costWeek = (db.prepare("SELECT COALESCE(SUM(total_cost_usd), 0) as total FROM cost_records WHERE period_date >= ?").get(weekAgo) as { total: number }).total;
    const costMonth = (db.prepare("SELECT COALESCE(SUM(total_cost_usd), 0) as total FROM cost_records WHERE period_date >= ?").get(monthAgo) as { total: number }).total;

    const byModel = db.prepare(`
      SELECT model, SUM(total_cost_usd) as cost,
        SUM(input_tokens + output_tokens + cache_creation_tokens + cache_read_tokens) as tokens
      FROM cost_records WHERE period_date >= ?
      GROUP BY model ORDER BY cost DESC
    `).all(weekAgo) as Array<{ model: string; cost: number; tokens: number }>;

    const byDay = db.prepare(`
      SELECT period_date as date, SUM(total_cost_usd) as cost
      FROM cost_records WHERE period_date >= ?
      GROUP BY period_date ORDER BY period_date
    `).all(monthAgo) as Array<{ date: string; cost: number }>;

    const pendingRecommendations = db.prepare(`
      SELECT id, finding_id, type, title, description, status, action_payload, created_at
      FROM recommendations WHERE status = 'created'
      ORDER BY id DESC LIMIT 50
    `).all() as Recommendation[];

    const recentFindings = db.prepare(`
      SELECT id, run_id, dimension, category, severity, title, detail, created_at
      FROM dream_findings ORDER BY id DESC LIMIT 500
    `).all() as Finding[];

    const findingCountRows = db.prepare(`
      SELECT severity, COUNT(*) as count FROM dream_findings
      WHERE run_id = (SELECT MAX(id) FROM dream_runs)
      GROUP BY severity
    `).all() as Array<{ severity: string; count: number }>;

    const findingCounts = { critical: 0, warning: 0, suggestion: 0, info: 0 };
    for (const row of findingCountRows) {
      if (row.severity in findingCounts) {
        findingCounts[row.severity as keyof typeof findingCounts] = row.count;
      }
    }

    const configRows = db.prepare(
      "SELECT key, value FROM config WHERE key IN ('last_dream_at', 'last_scheduled_dream_at')"
    ).all() as Array<{ key: string; value: string }>;

    const configMap = Object.fromEntries(configRows.map(r => [r.key, r.value]));

    let dbSizeBytes = 0;
    try {
      dbSizeBytes = statSync(DB_PATH).size;
    } catch { /* ignore */ }

    return {
      available: true,
      schemaVersion,
      dreamRuns,
      costSummary: { today: costToday, week: costWeek, month: costMonth, byModel, byDay },
      pendingRecommendations,
      recentFindings,
      findingCounts,
      health: {
        lastDreamAt: configMap["last_dream_at"] ?? null,
        lastScheduledAt: configMap["last_scheduled_dream_at"] ?? null,
        dbSizeBytes,
      },
    };
  } finally {
    db.close();
  }
}

export function getCostDetails(period: string = "30d"): CostRecord[] {
  const db = getDb();
  if (!db) return [];

  try {
    const days = parseInt(period) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    return db.prepare(`
      SELECT * FROM cost_records WHERE period_date >= ? ORDER BY period_date DESC, total_cost_usd DESC
    `).all(since) as CostRecord[];
  } finally {
    db.close();
  }
}

export function dismissRecommendation(id: number): boolean {
  const db = getWriteDb();
  if (!db) return false;
  try {
    const result = db.prepare(
      "UPDATE recommendations SET status = 'dismissed', acted_at = datetime('now') WHERE id = ? AND status = 'created'"
    ).run(id);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

export function snoozeRecommendation(id: number, hours: number = 24): boolean {
  const db = getWriteDb();
  if (!db) return false;
  try {
    const until = new Date(Date.now() + hours * 3600000).toISOString();
    const result = db.prepare(
      "UPDATE recommendations SET status = 'snoozed', snoozed_until = ?, acted_at = datetime('now') WHERE id = ? AND status = 'created'"
    ).run(until, id);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

export function applyRecommendation(id: number): { recommendation: Recommendation | null } {
  const db = getWriteDb();
  if (!db) return { recommendation: null };
  try {
    const rec = db.prepare(
      "SELECT id, finding_id, type, title, description, status, action_payload, created_at FROM recommendations WHERE id = ?"
    ).get(id) as Recommendation | undefined;
    if (!rec || rec.status !== "created") return { recommendation: null };
    db.prepare(
      "UPDATE recommendations SET status = 'applied', acted_at = datetime('now') WHERE id = ?"
    ).run(id);
    return { recommendation: rec };
  } finally {
    db.close();
  }
}

export function getDreamScriptPath(): string {
  return DREAM_SCRIPT;
}

export function getRecommendation(id: number): Recommendation | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare(
      "SELECT id, finding_id, type, title, description, status, action_payload, created_at FROM recommendations WHERE id = ?"
    ).get(id) as Recommendation) ?? null;
  } finally {
    db.close();
  }
}
