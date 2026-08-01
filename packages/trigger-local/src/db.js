'use strict';

// Next.js compiles the shim into several distinct server bundles (RSC pages,
// server actions, route handlers) — each with its own copy of this module and
// therefore its own `pool` / `ready` state. If the instrumentation bundle
// initialises the DB but a route handler bundle checks `isReady()`, it would
// see `false` and claim runs are missing. All bundles run inside the same Node
// process, so we hold the singleton state on globalThis to guarantee a single
// shared pg pool and readiness flag across every runtime.
const GLOBAL_STATE_KEY = Symbol.for('@trigger.dev/local-trigger/db-state.v1');

function getState() {
  if (typeof globalThis === 'undefined') return null;
  if (!globalThis[GLOBAL_STATE_KEY]) {
    globalThis[GLOBAL_STATE_KEY] = { pool: null, ready: false, initPromise: null };
  }
  return globalThis[GLOBAL_STATE_KEY];
}

function getPool() {
  const s = getState();
  if (!s) return null;
  if (s.pool) return s.pool;
  const url =
    process.env.LOCAL_TRIGGER_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return null;
  // Lazy require so bundlers that accidentally include this module on the
  // client never fail at import time — pg is only loaded when actually used.
  const { Pool } = require('pg');
  s.pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  s.pool.on('error', () => {
    /* keep process alive, log nothing by default */
  });
  return s.pool;
}

function init() {
  const s = getState();
  if (!s) return Promise.resolve(false);
  if (s.initPromise) return s.initPromise;
  const p = getPool();
  if (!p) {
    s.initPromise = Promise.resolve(false);
    return s.initPromise;
  }
  s.initPromise = p
    .query(`
      CREATE TABLE IF NOT EXISTS local_trigger_runs (
        id TEXT PRIMARY KEY,
        task_identifier TEXT NOT NULL,
        status TEXT NOT NULL,
        payload JSONB,
        output JSONB,
        error JSONB,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS local_trigger_tokens (
        token TEXT PRIMARY KEY,
        scopes JSONB NOT NULL DEFAULT '{}'::jsonb,
        expires_at TIMESTAMPTZ
      );
    `)
    .then(() => {
      s.ready = true;
      return true;
    })
    .catch((err) => {
      console.warn('[local-trigger] DB init failed:', err.message);
      return false;
    });
  return s.initPromise;
}

function isReady() {
  const s = getState();
  return !!s && s.ready;
}

async function insertRun(run) {
  const p = getPool();
  await p.query(
    `INSERT INTO local_trigger_runs (id, task_identifier, status, payload, output, error, metadata, started_at, finished_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      run.id,
      run.taskIdentifier,
      run.status,
      run.payload == null ? null : JSON.stringify(run.payload),
      run.output == null ? null : JSON.stringify(run.output),
      run.error == null ? null : JSON.stringify(run.error),
      JSON.stringify(run.metadata || {}),
      run.startedAt ? new Date(run.startedAt) : null,
      run.finishedAt ? new Date(run.finishedAt) : null,
    ],
  );
}

async function updateRun(run) {
  const p = getPool();
  await p.query(
    `UPDATE local_trigger_runs
       SET status = $2, output = $3, error = $4, metadata = $5,
           started_at = $6, finished_at = $7
     WHERE id = $1`,
    [
      run.id,
      run.status,
      run.output == null ? null : JSON.stringify(run.output),
      run.error == null ? null : JSON.stringify(run.error),
      JSON.stringify(run.metadata || {}),
      run.startedAt ? new Date(run.startedAt) : null,
      run.finishedAt ? new Date(run.finishedAt) : null,
    ],
  );
}

async function setMetadata(runId, metadata) {
  const p = getPool();
  await p.query(
    `UPDATE local_trigger_runs SET metadata = $2 WHERE id = $1`,
    [runId, JSON.stringify(metadata)],
  );
}

async function getRun(runId) {
  const p = getPool();
  const res = await p.query(
    `SELECT * FROM local_trigger_runs WHERE id = $1`,
    [runId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return rowToRun(row);
}

async function listRuns(limit) {
  const p = getPool();
  const res = await p.query(
    `SELECT * FROM local_trigger_runs ORDER BY created_at DESC LIMIT $1`,
    [Math.max(1, Math.min(limit ?? 100, 1000))],
  );
  return res.rows.map(rowToRun);
}

async function insertToken(token, scopes, expiresAt) {
  const p = getPool();
  await p.query(
    `INSERT INTO local_trigger_tokens (token, scopes, expires_at)
     VALUES ($1, $2, $3) ON CONFLICT (token) DO NOTHING`,
    [token, JSON.stringify(scopes || {}), expiresAt],
  );
}

async function getToken(token) {
  const p = getPool();
  const res = await p.query(
    `SELECT * FROM local_trigger_tokens WHERE token = $1`,
    [token],
  );
  const row = res.rows[0];
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return null;
  }
  return { token: row.token, scopes: row.scopes || {} };
}

function rowToRun(row) {
  return {
    id: row.id,
    taskIdentifier: row.task_identifier,
    status: row.status,
    payload: row.payload,
    output: row.output,
    error: row.error,
    metadata: row.metadata || {},
    createdAt: row.created_at ? row.created_at.toISOString() : null,
    startedAt: row.started_at ? row.started_at.toISOString() : null,
    finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
  };
}

module.exports = {
  init,
  isReady,
  insertRun,
  updateRun,
  setMetadata,
  getRun,
  listRuns,
  insertToken,
  getToken,
};
