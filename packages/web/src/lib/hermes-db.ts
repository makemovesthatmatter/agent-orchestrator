import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

const HERMES_DB = join(homedir(), '.hermes', 'state.db');

export interface HermesStatus {
  present: boolean;        // ~/.hermes dir exists
  db_present: boolean;     // state.db exists
  last_session_at: string | null;
  session_count: number;
}

export interface HermesSession {
  id: string;
  source: string;
  model: string | null;
  title: string | null;
  started_at: number;
  ended_at: number | null;
  message_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  actual_cost_usd: number | null;
  estimated_cost_usd: number | null;
  parent_session_id: string | null;
}

export interface HermesByDay { day: string; sessions: number; tokens: number; cost: number; }
export interface HermesByModel { model: string; sessions: number; tokens: number; cost: number; }
export interface HermesBySource { source: string; sessions: number; cost: number; }

function openReadOnly(): Database.Database | null {
  if (!existsSync(HERMES_DB)) return null;
  try {
    const db = new Database(HERMES_DB, { readonly: true, fileMustExist: true });
    db.pragma('query_only = ON');
    return db;
  } catch { return null; }
}

export function getHermesStatus(): HermesStatus {
  const hermesHome = join(homedir(), '.hermes');
  const present = existsSync(hermesHome);
  const db_present = existsSync(HERMES_DB);
  if (!db_present) return { present, db_present, last_session_at: null, session_count: 0 };
  const db = openReadOnly();
  if (!db) return { present, db_present, last_session_at: null, session_count: 0 };
  try {
    const row = db
      .prepare(`SELECT COUNT(*) AS c, MAX(started_at) AS last FROM sessions`)
      .get() as { c: number; last: number | null } | undefined;
    return {
      present,
      db_present,
      session_count: row?.c ?? 0,
      last_session_at: row?.last ? new Date(row.last * 1000).toISOString() : null,
    };
  } finally { db.close(); }
}

export function getRecentHermesSessions(limit = 50): HermesSession[] {
  const db = openReadOnly();
  if (!db) return [];
  try {
    // SECURITY: column whitelist — never include content/tool_calls/reasoning_*/system_prompt/model_config
    return db.prepare(`
      SELECT id, source, model, title, started_at, ended_at,
             message_count, input_tokens, output_tokens,
             cache_read_tokens, cache_write_tokens,
             actual_cost_usd, estimated_cost_usd, parent_session_id
      FROM sessions
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit) as HermesSession[];
  } finally { db.close(); }
}

export function getHermesSessionsByDay(days = 30): HermesByDay[] {
  const db = openReadOnly();
  if (!db) return [];
  try {
    const cutoff = Date.now() / 1000 - days * 86400;
    return db.prepare(`
      SELECT date(started_at, 'unixepoch') AS day,
             COUNT(*) AS sessions,
             SUM(COALESCE(input_tokens,0) + COALESCE(output_tokens,0)) AS tokens,
             SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0)) AS cost
      FROM sessions
      WHERE started_at >= ?
      GROUP BY day
      ORDER BY day ASC
    `).all(cutoff) as HermesByDay[];
  } finally { db.close(); }
}

export function getHermesSessionsByModel(days = 30): HermesByModel[] {
  const db = openReadOnly();
  if (!db) return [];
  try {
    const cutoff = Date.now() / 1000 - days * 86400;
    return db.prepare(`
      SELECT COALESCE(model, 'unknown') AS model,
             COUNT(*) AS sessions,
             SUM(COALESCE(input_tokens,0) + COALESCE(output_tokens,0)) AS tokens,
             SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0)) AS cost
      FROM sessions
      WHERE started_at >= ?
      GROUP BY model
      ORDER BY cost DESC
    `).all(cutoff) as HermesByModel[];
  } finally { db.close(); }
}

export function getHermesSessionsBySource(days = 30): HermesBySource[] {
  const db = openReadOnly();
  if (!db) return [];
  try {
    const cutoff = Date.now() / 1000 - days * 86400;
    return db.prepare(`
      SELECT source, COUNT(*) AS sessions,
             SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0)) AS cost
      FROM sessions
      WHERE started_at >= ?
      GROUP BY source
      ORDER BY sessions DESC
    `).all(cutoff) as HermesBySource[];
  } finally { db.close(); }
}
