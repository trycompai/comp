'use strict';

const runtime = require('./runtime');
const queues = require('./queues');

// Schedules are BullMQ repeatable jobs registered with `upsertJobScheduler` on
// this process's run queue. When a repeatable fires, the worker runs
// `handleScheduleFire`, which creates a normal child run (so schedule runs are
// persisted, pollable, and show up in `/api/trigger/runs`) and waits for it.
// The schedule definition itself is registered as a task so the child run can
// execute the schedule's `run` body.

class Scheduler {
  constructor() {
    this.schedules = new Map();
  }

  add(def) {
    if (this.schedules.has(def.id)) {
      throw new Error(`[local-trigger] Duplicate schedule id: ${def.id}`);
    }
    this.schedules.set(def.id, def);
    runtime.registerTask({ ...def });
    if (!queues.isBuilding()) {
      queues.upsertSchedule(def.id, def.cron, def.timezone).catch((err) => {
        console.warn(
          `[local-trigger] Failed to register schedule "${def.id}":`,
          err instanceof Error ? err.message : err,
        );
      });
    }
  }

  has(id) {
    return this.schedules.has(id);
  }

  // Repeatables are registered on `add()` and the worker boots on first task
  // registration; start() only makes sure the worker is running (idempotent).
  start() {
    queues.ensureWorker().catch(() => {});
  }

  stop() {
    for (const id of this.schedules.keys()) {
      queues.removeSchedule(id).catch(() => {});
    }
  }
}

module.exports = { Scheduler };
