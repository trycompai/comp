'use strict';

// Minimal 5-field cron (UTC). Supports `*`, numbers, `*/step`, `a-b`, lists `a,b`.
// Suffices for every schedule used by the app/API (e.g. `0 5 * * *`).

function parseField(field, min, max) {
  const values = new Set();
  for (const part of String(field).split(',')) {
    const p = part.trim();
    if (p === '*' || p === '?') {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (p.startsWith('*/')) {
      const step = Number.parseInt(p.slice(2), 10);
      for (let i = min; i <= max; i += step) values.add(i);
    } else if (p.includes('-')) {
      const [a, b] = p.split('-').map(Number);
      for (let i = a; i <= b; i++) values.add(i);
    } else {
      values.add(Number.parseInt(p, 10));
    }
  }
  return values;
}

function parseCron(expression) {
  const parts = String(expression).trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`[local-trigger] Unsupported cron expression: ${expression}`);
  }
  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dayOfMonth: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dayOfWeek: parseField(parts[4], 0, 6),
  };
}

function matches(schedule, date) {
  if (!schedule.month.has(date.getUTCMonth() + 1)) return false;
  if (!schedule.dayOfMonth.has(date.getUTCDate())) return false;
  if (!schedule.hour.has(date.getUTCHours())) return false;
  if (!schedule.minute.has(date.getUTCMinutes())) return false;
  return schedule.dayOfWeek.has(date.getUTCDay());
}

function minuteKey(date) {
  return date.toISOString().slice(0, 16);
}

class Scheduler {
  constructor() {
    this.schedules = new Map();
    this.lastFired = new Map();
    this.timer = null;
    this.started = false;
  }

  add(def) {
    if (this.schedules.has(def.id)) {
      throw new Error(`[local-trigger] Duplicate schedule id: ${def.id}`);
    }
    this.schedules.set(def.id, def);
  }

  has(id) {
    return this.schedules.has(id);
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => void this.tick(), 30_000);
    this.timer.unref?.();
  }

  async tick() {
    const now = new Date();
    const key = minuteKey(now);
    for (const def of this.schedules.values()) {
      const parsed = parseCron(def.cron);
      if (!matches(parsed, now)) continue;
      if (this.lastFired.get(def.id) === key) continue;
      this.lastFired.set(def.id, key);
      const lastTimestamp = def.lastTimestamp ?? null;
      const payload = {
        timestamp: now.toISOString(),
        lastTimestamp,
        runAt: now.toISOString(),
        timezone: def.timezone ?? 'UTC',
      };
      def.lastTimestamp = now.toISOString();
      try {
        await def.onFire(payload);
      } catch (err) {
        console.error(
          `[local-trigger] Schedule "${def.id}" failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.started = false;
  }
}

module.exports = { Scheduler };
