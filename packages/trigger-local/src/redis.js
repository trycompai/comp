'use strict';

const { Redis } = require('ioredis');

// Next.js compiles the shim into several distinct server bundles (RSC pages,
// server actions, route handlers) — each with its own copy of this module and
// therefore its own Redis client. All bundles run inside the same Node process,
// so we hold the singleton connection on globalThis to guarantee a single
// shared client (and a single event-loop footprint) across every runtime.
const GLOBAL_REDIS_KEY = Symbol.for('@trigger.dev/local-trigger/redis.v1');

function redisUrl() {
  return (
    process.env.LOCAL_TRIGGER_REDIS_URL ||
    process.env.REDIS_URL ||
    'redis://localhost:6379'
  );
}

function getRedis() {
  if (typeof globalThis === 'undefined') return null;
  if (!globalThis[GLOBAL_REDIS_KEY]) {
    const client = new Redis(redisUrl(), {
      // Required by BullMQ for its blocking connections: never let a command
      // be rejected because the queue of retries was exhausted.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(250 * Math.pow(2, times), 10_000),
    });
    client.on('error', () => {
      // ioredis logs unhandled errors by default; keep the runtime quiet here.
    });
    globalThis[GLOBAL_REDIS_KEY] = client;
  }
  return globalThis[GLOBAL_REDIS_KEY];
}

module.exports = { getRedis, redisUrl };
