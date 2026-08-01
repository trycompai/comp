'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('node:crypto');
const db = require('./db');

const als = new AsyncLocalStorage();

// Next.js compiles the shim into several distinct server bundles (RSC pages,
// server actions, route handlers) — each with its own module registry. Module
// state is NOT shared between them, so a task registered by instrumentation
// would be invisible to a server action that triggers it. These bundles all
// run inside the same Node process, so we keep the registry on globalThis to
// guarantee a single, shared task registry across every runtime.
const GLOBAL_REGISTRY_KEY = Symbol.for('@trigger.dev/local-trigger/registry.v1');
const registry =
  (typeof globalThis !== 'undefined' && globalThis[GLOBAL_REGISTRY_KEY]) ||
  (globalThis[GLOBAL_REGISTRY_KEY] = new Map());

const memoryRuns = new Map();
const queueActive = new Map();
const queueWaiters = new Map();
let inited = false;

function getCurrentRun() {
  return als.getStore() || null;
}

function buildRunId() {
  return `run_${crypto.randomBytes(16).toString('hex')}`;
}

function buildBatchId() {
  return `batch_${crypto.randomBytes(16).toString('hex')}`;
}

function registerTask(def) {
  if (!def || typeof def.id !== 'string' || !def.id) {
    throw new Error('[local-trigger] Task definition requires a string id');
  }
  if (registry.has(def.id)) {
    throw new Error(`[local-trigger] Duplicate task id: ${def.id}`);
  }
  registry.set(def.id, def);
  return def;
}

function hasTask(id) {
  return registry.has(id);
}

function assertRegistered(taskId) {
  if (!registry.has(taskId)) {
    throw new Error(
      `[local-trigger] Task "${taskId}" is not registered in this process. ` +
        `Import its module (or a module that imports it) before triggering it.`,
    );
  }
}

async function ensureDb() {
  if (!inited) {
    inited = true;
    await db.init();
  }
  return db.isReady();
}

function withQueueLock(def, fn) {
  const key = def.queue ? def.queue.name : 'default';
  const limit = def.queue ? def.queue.concurrencyLimit || 1 : 1;
  const active = queueActive.get(key) || 0;
  if (active < limit) {
    queueActive.set(key, active + 1);
    return Promise.resolve()
      .then(fn)
      .finally(() => {
        const now = queueActive.get(key) || 1;
        queueActive.set(key, Math.max(0, now - 1));
        const waiter = (queueWaiters.get(key) || []).shift();
        if (waiter) waiter();
      });
  }
  return new Promise((resolve) => {
    const waiters = queueWaiters.get(key) || [];
    waiters.push(() => {
      queueActive.set(key, (queueActive.get(key) || 0) + 1);
      Promise.resolve()
        .then(fn)
        .finally(() => {
          const now = queueActive.get(key) || 1;
          queueActive.set(key, Math.max(0, now - 1));
          const next = (queueWaiters.get(key) || []).shift();
          if (next) next();
        })
        .then(resolve, resolve);
    });
    queueWaiters.set(key, waiters);
  });
}

async function executeRun(run) {
  const def = registry.get(run.taskIdentifier);
  if (!def) return;

  await withQueueLock(def, async () => {
    run.status = 'RUNNING';
    run.startedAt = new Date().toISOString();
    run.metadata = run.metadata || {};

    const maxAttempts = Math.max(
      1,
      def.retry && Number.isFinite(def.retry.maxAttempts)
        ? def.retry.maxAttempts
        : 1,
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      run.attempt = attempt;
      try {
        const output = await als.run(run, async () => {
          let payload = run.payload;
          if (def.parsePayload) {
            payload = def.parsePayload(run.payload);
          }
          return await def.run(payload);
        });
        run.output = output;
        run.error = null;
        run.status = 'COMPLETED';
        break;
      } catch (err) {
        run.error = {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        };
        if (attempt < maxAttempts) {
          const factor = def.retry?.factor ?? 2;
          const min = def.retry?.minTimeoutInMs ?? 500;
          const max = def.retry?.maxTimeoutInMs ?? 30_000;
          const delay = Math.min(max, min * Math.pow(factor, attempt - 1));
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (run.status !== 'COMPLETED') {
      run.status = 'FAILED';
    }
    run.finishedAt = new Date().toISOString();
  });
}

function scheduleExecution(run) {
  setImmediate(() => {
    executeRun(run)
      .then(() => persistRun(run))
      .catch((err) => {
        console.error(
          `[local-trigger] Unexpected executor error for ${run.id}:`,
          err instanceof Error ? err.message : err,
        );
        run.status = 'SYSTEM_FAILURE';
        run.finishedAt = new Date().toISOString();
        persistRun(run);
      });
  });
}

function persistRun(run) {
  if (!db.isReady()) return Promise.resolve();
  return db.updateRun(run).catch((err) => {
    console.warn('[local-trigger] Failed to persist run:', err.message);
  });
}

function persistMetadata(run) {
  if (!run || !db.isReady()) return;
  db.setMetadata(run.id, run.metadata).catch(() => {
    /* best effort */
  });
}

async function createRun(taskId, payload, opts) {
  assertRegistered(taskId);
  await ensureDb();
  const run = {
    id: buildRunId(),
    taskIdentifier: taskId,
    status: 'QUEUED',
    payload,
    output: null,
    error: null,
    metadata: {},
    tags: opts && Array.isArray(opts.tags) ? opts.tags : [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    attempt: 0,
  };
  memoryRuns.set(run.id, run);
  if (db.isReady()) {
    db.insertRun(run).catch((err) => {
      console.warn('[local-trigger] Failed to insert run:', err.message);
    });
  }
  scheduleExecution(run);
  return run;
}

function waitForRun(runId, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const run = memoryRuns.get(runId) || null;
      if (run && isTerminal(run.status)) {
        return resolve(run);
      }
      if (Date.now() - started > timeoutMs) {
        return reject(new Error(`[local-trigger] Timed out waiting for run ${runId}`));
      }
      setTimeout(check, 50);
    };
    check();
  });
}

function isTerminal(status) {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELED';
}

function toRunShape(run) {
  const completed = run.status === 'COMPLETED';
  return {
    id: run.id,
    taskIdentifier: run.taskIdentifier,
    status: run.status,
    output: run.output,
    error: run.error,
    metadata: run.metadata || {},
    tags: run.tags || [],
    payload: run.payload,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    attempt: run.attempt || 0,
    isCompleted: isTerminal(run.status),
    isSuccess: completed,
    ok: completed,
  };
}

// Trigger.dev run ids carry an attempt suffix (e.g. `run_xxx:1`); the
// local shim stores plain ids. Normalise before every lookup so both the
// handle returned by `tasks.trigger` and the id the client polls with work.
function normalizeRunId(runId) {
  return typeof runId === 'string' ? runId.replace(/:\d+$/, '') : runId;
}

async function retrieveRun(runId) {
  const id = normalizeRunId(runId);
  const local = memoryRuns.get(id);
  if (local) return toRunShape(local);
  // Lazily ensure the shared DB is initialised (idempotent — safe to call
  // from any bundle, e.g. a route handler that never ran instrumentation).
  if (!db.isReady()) {
    await db.init().catch(() => false);
  }
  if (db.isReady()) {
    const row = await db.getRun(id);
    if (row) return toRunShape(row);
  }
  throw new Error(`Run ${runId} not found`);
}

async function getRunOrNull(runId) {
  try {
    return await retrieveRun(runId);
  } catch {
    return null;
  }
}

async function listRuns(limit) {
  const dbRuns = db.isReady() ? await db.listRuns(limit) : [];
  return dbRuns.map((row) => ({ ...toRunShape(row), tags: row.tags || [] }));
}

async function cancelRun(runId) {
  const local = memoryRuns.get(runId);
  if (local && !isTerminal(local.status)) {
    local.status = 'CANCELED';
    local.finishedAt = new Date().toISOString();
  }
  if (db.isReady()) {
    const row = await db.getRun(runId);
    if (row) {
      row.status = 'CANCELED';
      row.finishedAt = new Date().toISOString();
      await db.updateRun(row).catch(() => {});
    }
  }
  return getRunOrNull(runId);
}

async function batchTrigger(taskId, items, opts) {
  assertRegistered(taskId);
  const runs = [];
  for (const item of items) {
    const payload = item && typeof item === 'object' && 'payload' in item ? item.payload : item;
    runs.push(await createRun(taskId, payload, opts));
  }
  return {
    batchId: buildBatchId(),
    runs: runs.map((r) => ({ id: r.id })),
  };
}

async function batchTriggerAndWait(taskId, items, opts) {
  const batch = await batchTrigger(taskId, items, opts);
  const timeout = 1000 * 60 * 60; // 1h
  await Promise.all(batch.runs.map((r) => waitForRun(r.id, timeout)));
  const completed = await Promise.all(
    batch.runs.map((r) => retrieveRun(r.id).catch(() => null)),
  );
  return { id: batch.batchId, runs: completed.filter(Boolean) };
}

async function triggerAndWait(taskId, payload, opts) {
  const run = await createRun(taskId, payload, opts);
  await waitForRun(run.id, 1000 * 60 * 60);
  return retrieveRun(run.id);
}

module.exports = {
  getCurrentRun,
  registerTask,
  hasTask,
  createRun,
  batchTrigger,
  batchTriggerAndWait,
  triggerAndWait,
  retrieveRun,
  getRunOrNull,
  listRuns,
  cancelRun,
  persistMetadata,
  toRunShape,
};
