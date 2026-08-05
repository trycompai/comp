'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('node:crypto');
const db = require('./db');
const queues = require('./queues');
const { getRedis } = require('./redis');

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

// Task bodies are executed by the single BullMQ worker, so per-queue /
// per-concurrency-key limits only ever contend inside that one process.
const queueActive = new Map();
const queueWaiters = new Map();

// Serialize pg writes per run. The RUNNING update is issued before the task
// body runs and the terminal update afterwards; if they land on different pool
// connections the RUNNING write can commit last and leave the run stuck. Chaining
// every write for a run id guarantees they land in order.
const runWriteTail = new Map();

function enqueueRunWrite(runId, fn) {
  const prev = runWriteTail.get(runId) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => fn())
    .finally(() => {
      if (runWriteTail.get(runId) === next) runWriteTail.delete(runId);
    });
  runWriteTail.set(runId, next);
  return next;
}

let inited = false;

// Populated by the SDK surface (index.js) so `run(payload, ctx)` receives the
// real logger / metadata / tags handles. Avoids a circular require.
let contextExtras = null;

function setContextExtras(extras) {
  contextExtras = extras;
}

function getCurrentRun() {
  const store = als.getStore();
  if (!store) return null;
  return store && store.run ? store.run : store;
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
  queues.ensureWorker().catch(() => {});
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

// Enforce the per-queue concurrency limit from `queue({ name, concurrencyLimit })`
// in-process. Tasks without an explicit queue share the 'default' lane with a
// limit of 1 (Trigger.dev semantics).
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
  return new Promise((resolve, reject) => {
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
        .then(resolve, reject);
    });
    queueWaiters.set(key, waiters);
  });
}

// Serialize runs that share the same `concurrencyKey` (per task). The lock is a
// short-TTL Redis key so a crash can never leave a permanent lock behind.
async function withConcurrencyKeyLock(taskId, key, fn) {
  if (!key) return fn();
  const redis = getRedis();
  if (!redis) return fn();
  const lockKey = `local-trigger:concurrency:${taskId}:${key}`;
  for (;;) {
    const ok = await redis
      .set(lockKey, '1', 'PX', 1000 * 60 * 60 * 4, 'NX')
      .catch(() => 'OK');
    if (ok === 'OK' || ok === true || ok === 1) {
      try {
        return await fn();
      } finally {
        await redis.del(lockKey).catch(() => {});
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

function retryConfig(def) {
  const retry = def.retry || {};
  return {
    attempts: Math.max(
      1,
      Number.isFinite(retry.maxAttempts) ? retry.maxAttempts : 1,
    ),
    minDelay: Number.isFinite(retry.minTimeoutInMs)
      ? retry.minTimeoutInMs
      : 1000,
  };
}

// BullMQ invokes this for every job (task runs + schedule fires). Runs that
// fail are retried by BullMQ per the job's attempts/backoff; each attempt
// re-enters this function.
async function processJob(job) {
  if (job.name === queues.SCHEDULE_JOB_NAME) {
    return handleScheduleFire(job);
  }

  const def = registry.get(job.name);
  if (!def) {
    throw new Error(
      `[local-trigger] Task "${job.name}" is not registered in this process.`,
    );
  }

  const data = job.data || {};
  const startedAt = new Date();
  const run = {
    id: job.id,
    taskIdentifier: job.name,
    status: 'QUEUED',
    payload: data.payload ?? null,
    output: null,
    error: null,
    metadata: data.metadata || {},
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: job.timestamp
      ? new Date(job.timestamp).toISOString()
      : startedAt.toISOString(),
    startedAt: null,
    finishedAt: null,
    attempt: (job.attemptsMade || 0) + 1,
  };

  try {
    const ctx = {
      run,
      attempt: run.attempt,
      ...(contextExtras || {}),
    };
    ctx.ctx = ctx;

    const output = await withQueueLock(def, () =>
      withConcurrencyKeyLock(def.id, data.concurrencyKey, () =>
        als.run(ctx, async () => {
          run.status = 'RUNNING';
          run.startedAt = new Date().toISOString();
          enqueueRunWrite(run.id, () => db.updateRun(run)).catch(() => {});
          let payload = run.payload;
          if (def.parsePayload) {
            payload = def.parsePayload(run.payload);
          }
          return def.run(payload, ctx);
        }),
      ),
    );

    run.output = output;
    run.status = 'COMPLETED';
    run.finishedAt = new Date().toISOString();
    await enqueueRunWrite(run.id, () => db.updateRun(run)).catch(() => {});
    return { output };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    run.error = { message: error.message, stack: error.stack };
    // Only persist the terminal FAILED status on the last attempt; BullMQ
    // retries non-final failures automatically, and the poller must not see a
    // run as FAILED while a retry is still pending.
    const attempts = job.opts && job.opts.attempts ? job.opts.attempts : 1;
    const isLastAttempt = (job.attemptsMade || 0) + 1 >= attempts;
    if (isLastAttempt) {
      run.status = 'FAILED';
      run.finishedAt = new Date().toISOString();
    }
    await job
      .updateData({
        ...data,
        lastError: { message: error.message, stack: error.stack },
      })
      .catch(() => {});
    await enqueueRunWrite(run.id, () => db.updateRun(run)).catch(() => {});
    throw error;
  }
}

async function handleScheduleFire(job) {
  const scheduleId = job.data && job.data.scheduleId;
  const def = registry.get(scheduleId);
  if (!def) return { skipped: true };

  const redis = getRedis();
  const lastKey = `local-trigger:schedule:${scheduleId}:last`;
  const previous = redis ? await redis.get(lastKey).catch(() => null) : null;
  const now = new Date();
  const payload = {
    timestamp: now.toISOString(),
    lastTimestamp: previous || null,
    runAt: now.toISOString(),
    timezone: def.timezone || 'UTC',
  };
  if (redis) {
    await redis.set(lastKey, now.toISOString()).catch(() => {});
  }

  const run = await createRun(scheduleId, payload, null);
  await waitForRun(run.id, 1000 * 60 * 60);
  return retrieveRun(run.id);
}

function parseTtl(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(String(value).trim());
  if (!match) return null;
  const multipliers = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * multipliers[match[2].toLowerCase()];
}

async function createRun(taskId, payload, opts) {
  assertRegistered(taskId);
  await ensureDb();
  const def = registry.get(taskId);
  const options = opts || {};

  const runId = buildRunId();
  let claimed = true;
  let idempotencyKey = null;
  let idempotencyTtlMs = null;
  if (options.idempotencyKey) {
    idempotencyKey = `local-trigger:idempotency:${taskId}:${options.idempotencyKey}`;
    idempotencyTtlMs = parseTtl(options.idempotencyKeyTTL) || 1000 * 60 * 60;
    const redis = getRedis();
    const setRes = redis
      ? await redis
          .set(idempotencyKey, runId, 'PX', idempotencyTtlMs, 'NX')
          .catch(() => null)
      : null;
    claimed = setRes === 'OK' || setRes === true || setRes === 1;
    if (!claimed) {
      const winner = redis ? await redis.get(idempotencyKey).catch(() => null) : null;
      if (winner) {
        const existing = await getRunOrNull(winner);
        if (existing) return existing;
      }
      // The winning run isn't visible yet (its pg insert is in flight); take
      // over the key rather than creating a duplicate.
      if (redis) {
        await redis.set(idempotencyKey, runId, 'PX', idempotencyTtlMs).catch(() => {});
      }
    }
  }

  const now = new Date().toISOString();
  const run = {
    id: runId,
    taskIdentifier: taskId,
    status: 'QUEUED',
    payload,
    output: null,
    error: null,
    metadata: {},
    tags: Array.isArray(options.tags) ? options.tags : [],
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    attempt: 0,
  };

  const retry = retryConfig(def);
  const addOpts = { attempts: retry.attempts };
  if (retry.attempts > 1) {
    addOpts.backoff = { type: 'exponential', delay: retry.minDelay };
  }
  if (options.delayUntil) {
    const until =
      options.delayUntil instanceof Date
        ? options.delayUntil.getTime()
        : new Date(options.delayUntil).getTime();
    if (Number.isFinite(until)) addOpts.delay = Math.max(0, until - Date.now());
  }

  // Insert the row before enqueuing so worker updates always find it; a delayed
  // insert would otherwise let UPDATEs no-op and then create a stale QUEUED row.
  if (db.isReady()) {
    await db.insertRun(run).catch((err) => {
      console.warn('[local-trigger] Failed to insert run:', err.message);
    });
  }

  await queues.addRunJob(taskId, runId, {
    payload,
    metadata: {},
    tags: run.tags,
    concurrencyKey: options.concurrencyKey || null,
    lastError: null,
  }, addOpts);

  queues.ensureWorker().catch(() => {});
  return run;
}

function waitForRun(runId, timeoutMs) {
  const id = normalizeRunId(runId);
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      getRunOrNull(id)
        .then((run) => {
          if (run && isTerminal(run.status)) return resolve(run);
          if (Date.now() - started > timeoutMs) {
            return reject(new Error(`[local-trigger] Timed out waiting for run ${id}`));
          }
          setTimeout(check, 100);
        })
        .catch(() => setTimeout(check, 100));
    };
    check();
  });
}

function isTerminal(status) {
  return (
    status === 'COMPLETED' ||
    status === 'FAILED' ||
    status === 'CANCELED' ||
    status === 'SYSTEM_FAILURE' ||
    status === 'TIMED_OUT' ||
    status === 'INTERRUPTED'
  );
}

function toRunShape(run) {
  const status = run.status || 'UNKNOWN';
  const completed = status === 'COMPLETED';
  return {
    id: run.id,
    taskIdentifier: run.taskIdentifier,
    status,
    output: run.output ?? null,
    error: run.error || null,
    metadata: run.metadata || {},
    tags: Array.isArray(run.tags) ? run.tags : [],
    payload: run.payload ?? null,
    createdAt: run.createdAt,
    startedAt: run.startedAt || null,
    finishedAt: run.finishedAt || null,
    attempt: run.attempt || 0,
    isCompleted: isTerminal(status),
    isSuccess: completed,
    isFailed:
      status === 'FAILED' ||
      status === 'SYSTEM_FAILURE' ||
      status === 'TIMED_OUT' ||
      status === 'INTERRUPTED',
    isCancelled: status === 'CANCELED',
    isTimedOut: status === 'TIMED_OUT',
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
  return dbRuns.map((row) => toRunShape(row));
}

async function cancelRun(runId) {
  const id = normalizeRunId(runId);
  if (db.isReady()) {
    const row = await db.getRun(id);
    if (row && !isTerminal(row.status)) {
      row.status = 'CANCELED';
      row.finishedAt = new Date().toISOString();
      await enqueueRunWrite(id, () => db.updateRun(row)).catch(() => {});
    }
  }
  await queues.removeJob(id).catch(() => {});
  return getRunOrNull(runId);
}

async function batchTrigger(taskId, items, opts) {
  assertRegistered(taskId);
  const runs = [];
  for (const item of items) {
    const payload =
      item && typeof item === 'object' && 'payload' in item ? item.payload : item;
    runs.push(await createRun(taskId, payload, opts));
  }
  return {
    batchId: buildBatchId(),
    runs: runs.map((run) => ({ id: run.id })),
  };
}

async function batchTriggerAndWait(taskId, items, opts) {
  const batch = await batchTrigger(taskId, items, opts);
  const timeout = 1000 * 60 * 60;
  await Promise.all(batch.runs.map((run) => waitForRun(run.id, timeout)));
  const completed = await Promise.all(
    batch.runs.map((run) => retrieveRun(run.id).catch(() => null)),
  );
  return { id: batch.batchId, runs: completed.filter(Boolean) };
}

async function triggerAndWait(taskId, payload, opts) {
  const run = await createRun(taskId, payload, opts);
  await waitForRun(run.id, 1000 * 60 * 60);
  return retrieveRun(run.id);
}

function persistMetadata(run) {
  if (!run || !db.isReady()) return;
  enqueueRunWrite(run.id, () => db.setMetadata(run.id, run.metadata)).catch(() => {
    /* best effort */
  });
}

module.exports = {
  getCurrentRun,
  registerTask,
  hasTask,
  setContextExtras,
  createRun,
  batchTrigger,
  batchTriggerAndWait,
  triggerAndWait,
  retrieveRun,
  getRunOrNull,
  listRuns,
  cancelRun,
  waitForRun,
  persistMetadata,
  toRunShape,
  processJob,
};
