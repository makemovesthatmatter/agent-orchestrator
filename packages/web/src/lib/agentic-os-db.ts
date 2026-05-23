import "server-only";
import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, statSync } from "fs";
import { getAoBaseDir } from "@aoagents/ao-core";
import {
  getHermesStatus,
  getRecentHermesSessions,
  getHermesSessionsByDay,
  getHermesSessionsByModel,
  getHermesSessionsBySource,
  type HermesStatus,
  type HermesSession,
  type HermesByDay,
  type HermesByModel,
  type HermesBySource,
} from "./hermes-db";

const DB_PATH = join(getAoBaseDir(), "agentic-os.db");

function getDb(): Database.Database | null {
  if (!existsSync(DB_PATH)) return null;
  const db = new Database(DB_PATH, { readonly: true });
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("query_only = ON");
  return db;
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
  costSummary: CostSummary;
  health: {
    dbSizeBytes: number;
  };
  hermes: {
    status: HermesStatus;
    recentSessions: HermesSession[];
    byDay: HermesByDay[];
    byModel: HermesByModel[];
    bySource: HermesBySource[];
  };
}

export type { HermesStatus, HermesSession, HermesByDay, HermesByModel, HermesBySource };

function buildHermesSummary() {
  return {
    status: getHermesStatus(),
    recentSessions: getRecentHermesSessions(50),
    byDay: getHermesSessionsByDay(30),
    byModel: getHermesSessionsByModel(30),
    bySource: getHermesSessionsBySource(30),
  };
}

export function getAgenticOSSummary(): AgenticOSSummary {
  const db = getDb();
  if (!db) {
    return {
      available: false,
      schemaVersion: null,
      costSummary: { today: 0, week: 0, month: 0, byModel: [], byDay: [] },
      health: { dbSizeBytes: 0 },
      hermes: buildHermesSummary(),
    };
  }

  try {
    const schemaVersion = (db.prepare("SELECT MAX(version) as v FROM schema_version").get() as { v: number })?.v ?? null;

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

    let dbSizeBytes = 0;
    try {
      dbSizeBytes = statSync(DB_PATH).size;
    } catch { /* ignore */ }

    return {
      available: true,
      schemaVersion,
      costSummary: { today: costToday, week: costWeek, month: costMonth, byModel, byDay },
      health: { dbSizeBytes },
      hermes: buildHermesSummary(),
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
