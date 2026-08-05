'use strict';

const { Queue, Worker } = require('bullmq');
const { getRedis } = require('./redis');

// Runs are executed by a BullMQ queue backed by the project's existing Redis.
// Queue, worker and repeatable schedulers are process-scoped singletons kept on
// globalThis so the different Next.js bundles (which each carry their own copy
// of this module) share one worker per process.
const GLOBAL_QUEUES_KEY = Symbol.for('@trigger.dev/local-trigger/queues.v1');

const SCHEDULE_JOB_NAME = '__schedule__';

// Each container (app / api / portal) registers a different set of tasks but
// they share the same Redis. Give every process its own queue so a worker can
// never claim a job whose task isn't registered in its own process.
function queueSuffix() {
  return process.env.LOCAL_TRIGGER_QUEUE_SUFFIX || 'main';
}

function queueName() {
  return `local-trigger-runs-${queueSuffix()}`;
}

function isBuilding() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

function state() {
  if (typeof globalThis === 'undefined') return null;
  if (!globalThis[GLOBAL_QUEUES_KEY]) {
    globalThis[GLOBAL_QUEUES_KEY] = {
      queue: null,
      worker: null,
      startPromise: null,
    };
  }
  return globalThis[GLOBAL_QUEUES_KEY];
}

function getQueue() {
  const s = state();
  if (!s || isBuilding()) return null;
  if (!s.queue) {
    s.queue = new Queue(queueName(), { connection: getRedis() });
  }
  return s.queue;
}

async function ensureWorker() {
  const s = state();
  if (!s) return null;
  if (s.worker) return s.worker;
  if (isBuilding()) return null;
  if (!s.startPromise) {
    s.startPromise = (async () => {
      try {
        const worker = new Worker(
          queueName(),
          async (job) => {
            const runtime = require('./runtime');
            return runtime.processJob(job);
          },
          {
            connection: getRedis(),
            // Per-task concurrency is enforced in-process via `withQueueLock` /
            // `withConcurrencyKeyLock` (matches the shim's historical semantics).
            concurrency: 100,
            lockDuration: 5 * 60 * 1000,
            stalledInterval: 5 * 60 * 1000,
            maxStalledCount: 2,
          },
        );
        worker.on('error', (err) => {
          console.warn('[local-trigger] Worker error:', err.message);
        });
        s.worker = worker;
        return worker;
      } catch (err) {
        s.startPromise = null;
        throw err;
      }
    })();
  }
  return s.startPromise;
}

async function addRunJob(taskId, runId, data, addOpts) {
  const queue = getQueue();
  if (!queue) {
    throw new Error('[local-trigger] Run queue unavailable (Redis not configured)');
  }
  const opts = {
    jobId: runId,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 2000 },
    ...(addOpts || {}),
  };
  return queue.add(taskId, data, opts);
}

async function removeJob(jobId) {
  const queue = getQueue();
  if (!queue) return;
  await queue.remove(jobId).catch(() => {});
}

async function upsertSchedule(scheduleId, cron, timezone) {
  if (isBuilding()) return;
  const queue = getQueue();
  if (!queue) return;
  await queue.upsertJobScheduler(
    scheduleId,
    { pattern: cron, tz: timezone || 'UTC' },
    {
      name: SCHEDULE_JOB_NAME,
      data: { scheduleId },
      opts: {
        attempts: 1,
        removeOnComplete: { count: 20 },
        removeOnFail: { count: 100 },
      },
    },
  );
}

async function removeSchedule(scheduleId) {
  const queue = getQueue();
  if (!queue) return;
  await queue.removeJobScheduler(scheduleId).catch(() => {});
}

module.exports = {
  SCHEDULE_JOB_NAME,
  isBuilding,
  queueName,
  getQueue,
  ensureWorker,
  addRunJob,
  removeJob,
  upsertSchedule,
  removeSchedule,
};
