'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const runtime = require('./runtime');
const { Scheduler } = require('./scheduler');

const scheduler = new Scheduler();

function toQueue(value) {
  if (typeof value === 'string') return { name: value, concurrencyLimit: 1 };
  if (value && typeof value === 'object') {
    return {
      name: value.name || 'default',
      concurrencyLimit: value.concurrencyLimit || 1,
    };
  }
  return { name: 'default', concurrencyLimit: 1 };
}

function makeHandle(def) {
  return {
    id: def.id,
    trigger(payload, opts) {
      return runtime.createRun(def.id, payload, opts).then((run) => ({ id: run.id }));
    },
    batchTrigger(items, opts) {
      return runtime.batchTrigger(def.id, items, opts);
    },
    triggerAndWait(payload, opts) {
      return runtime.triggerAndWait(def.id, payload, opts);
    },
    batchTriggerAndWait(items, opts) {
      return runtime.batchTriggerAndWait(def.id, items, opts);
    },
  };
}

function normalizeTaskOptions(opts) {
  const def = {
    id: opts.id,
    kind: opts.kind || 'task',
    run: opts.run,
    parsePayload: opts.parsePayload || null,
    retry: opts.retry || null,
    queue: opts.queue ? toQueue(opts.queue) : null,
    cron: opts.cron || null,
    maxDuration: opts.maxDuration || null,
    timezone: opts.timezone || null,
  };
  return def;
}

function task(opts) {
  const def = normalizeTaskOptions({ ...opts, kind: 'task' });
  runtime.registerTask(def);
  return makeHandle(def);
}

function schemaTask(opts) {
  const parsePayload = opts.schema && typeof opts.schema.safeParse === 'function'
    ? (payload) => {
        const parsed = opts.schema.safeParse(payload);
        if (!parsed.success) {
          const issues = parsed.error && parsed.error.issues
            ? parsed.error.issues.map((i) => i.message).join('; ')
            : 'invalid payload';
          throw new Error(`[local-trigger] Schema validation failed: ${issues}`);
        }
        return parsed.data;
      }
    : null;
  const def = normalizeTaskOptions({ ...opts, kind: 'schemaTask', parsePayload });
  runtime.registerTask(def);
  return makeHandle(def);
}

const tasks = {
  trigger(taskId, payload, opts) {
    return runtime.createRun(taskId, payload, opts).then((run) => ({ id: run.id }));
  },
  batchTrigger(taskId, items, opts) {
    return runtime.batchTrigger(taskId, items, opts);
  },
  triggerAndWait(taskId, payload, opts) {
    return runtime.triggerAndWait(taskId, payload, opts);
  },
  batchTriggerAndWait(taskId, items, opts) {
    return runtime.batchTriggerAndWait(taskId, items, opts);
  },
};

const runs = {
  retrieve(runId) {
    return runtime.retrieveRun(runId);
  },
  getRun(runId) {
    return runtime.getRunOrNull(runId);
  },
  cancel(runId) {
    return runtime.cancelRun(runId);
  },
  list(opts) {
    return runtime.listRuns(opts && opts.limit);
  },
};

function parseExpiration(expirationTime) {
  if (expirationTime == null) return null;
  if (typeof expirationTime === 'number') return expirationTime;
  const match = /^(\d+)\s*(ms|s|m|h|d|hr|hrs|days?|hours?|minutes?|seconds?)$/i.exec(
    String(expirationTime).trim(),
  );
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    sec: 1000,
    secs: 1000,
    second: 1000,
    seconds: 1000,
    m: 60_000,
    min: 60_000,
    mins: 60_000,
    minute: 60_000,
    minutes: 60_000,
    h: 3_600_000,
    hr: 3_600_000,
    hrs: 3_600_000,
    hour: 3_600_000,
    hours: 3_600_000,
    d: 86_400_000,
    day: 86_400_000,
    days: 86_400_000,
  };
  const multiplier = multipliers[unit];
  return multiplier ? value * multiplier : null;
}

const memoryTokens = new Map();

async function issueToken(scopes, opts) {
  const token = `public_${crypto.randomBytes(24).toString('hex')}`;
  const expiresAt = parseExpiration(opts && opts.expirationTime);
  const record = {
    token,
    scopes: scopes || {},
    expiresAt: expiresAt ? new Date(Date.now() + expiresAt) : null,
  };
  memoryTokens.set(token, record);
  if (db.isReady()) {
    await db.insertToken(token, scopes || {}, record.expiresAt).catch(() => {});
  }
  return token;
}

const auth = {
  createPublicToken(opts) {
    return issueToken(opts && opts.scopes, opts);
  },
  createTriggerPublicToken(taskId, opts) {
    return issueToken({ trigger: [taskId] }, opts);
  },
  getPayloadFromJWT(token) {
    if (!token) return Promise.resolve(null);
    const local = memoryTokens.get(token);
    if (local) return Promise.resolve(local.scopes);
    return db
      .getToken(token)
      .then((row) => (row ? row.scopes : null))
      .catch(() => null);
  },
};

const metadata = {
  root: undefined,
  parent: undefined,
  set(key, value) {
    const run = runtime.getCurrentRun();
    if (!run) return;
    run.metadata = run.metadata || {};
    run.metadata[key] = value;
    runtime.persistMetadata(run);
  },
  get(key) {
    const run = runtime.getCurrentRun();
    if (!run || !run.metadata) return undefined;
    return run.metadata[key];
  },
  increment(key, amount) {
    const run = runtime.getCurrentRun();
    if (!run) return;
    run.metadata = run.metadata || {};
    const current = typeof run.metadata[key] === 'number' ? run.metadata[key] : 0;
    run.metadata[key] = current + (typeof amount === 'number' ? amount : 1);
    runtime.persistMetadata(run);
  },
  decrement(key, amount) {
    const run = runtime.getCurrentRun();
    if (!run) return;
    run.metadata = run.metadata || {};
    const current = typeof run.metadata[key] === 'number' ? run.metadata[key] : 0;
    run.metadata[key] = current - (typeof amount === 'number' ? amount : 1);
    runtime.persistMetadata(run);
  },
  current() {
    const run = runtime.getCurrentRun();
    return run && run.metadata ? { ...run.metadata } : {};
  },
  snapshot() {
    return metadata.current();
  },
  flush() {
    return Promise.resolve();
  },
};

const tags = {
  add(values) {
    const run = runtime.getCurrentRun();
    if (run) {
      run.tags = run.tags || [];
      run.tags.push(...(Array.isArray(values) ? values : [values]));
    }
    return Promise.resolve();
  },
  set(values) {
    const run = runtime.getCurrentRun();
    if (run) {
      run.tags = Array.isArray(values) ? values.slice() : [];
    }
    return Promise.resolve();
  },
};

function stringifyArgs(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) return arg.stack || arg.message;
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
}

const logger = {
  debug(...args) {
    if (process.env.LOCAL_TRIGGER_LOG_LEVEL !== 'debug') return;
    console.log('[local-trigger:debug]', stringifyArgs(args));
  },
  info(...args) {
    console.log('[local-trigger]', stringifyArgs(args));
  },
  warn(...args) {
    console.warn('[local-trigger:warn]', stringifyArgs(args));
  },
  error(...args) {
    console.error('[local-trigger:error]', stringifyArgs(args));
  },
  log(...args) {
    console.log('[local-trigger]', stringifyArgs(args));
  },
  flush() {
    return Promise.resolve();
  },
};

function queue(value) {
  return toQueue(value);
}

const schedules = {
  task(opts) {
    const def = normalizeTaskOptions({ ...opts, kind: 'schedule' });
    scheduler.add({
      id: def.id,
      cron: def.cron,
      timezone: def.timezone,
      onFire: async (payload) => {
        const run = await runtime.createRun(def.id, payload, null);
        return waitForScheduleRun(run.id);
      },
    });
    return makeHandle(def);
  },
  cron(opts) {
    const taskHandle = opts && opts.task;
    if (taskHandle && taskHandle.id) {
      scheduler.add({
        id: opts.id || `${taskHandle.id}-schedule`,
        cron: opts.cron,
        timezone: opts.timezone,
        onFire: async (payload) => {
          return taskHandle.trigger(payload).then((r) => r.id);
        },
      });
      return { id: opts.id || `${taskHandle.id}-schedule` };
    }
    throw new Error('[local-trigger] schedules.cron requires a task handle');
  },
  start() {
    scheduler.start();
  },
  stop() {
    scheduler.stop();
  },
};

function waitForScheduleRun(runId) {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const shape = runtime.getRunOrNull(runId).then((run) => {
        if (run && run.isCompleted) return resolve(run);
        if (Date.now() - started > 1000 * 60 * 60) return resolve(null);
        setTimeout(check, 50);
      });
      shape.catch(() => setTimeout(check, 50));
    };
    check();
  });
}

function defineConfig(config) {
  return config;
}

function registerFromDirectory(dir, opts) {
  const options = opts || {};
  const ignore = Array.isArray(options.ignore) ? options.ignore : [];

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full);
      if (ignore.some((re) => re.test(rel))) continue;
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(js|cjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        try {
          require(full);
        } catch (err) {
          console.warn(
            `[local-trigger] Failed to register ${rel}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }
  }

  walk(dir);
}

module.exports = {
  task,
  schemaTask,
  tasks,
  runs,
  schedules,
  auth,
  metadata,
  tags,
  logger,
  queue,
  defineConfig,
  registerFromDirectory,
};
