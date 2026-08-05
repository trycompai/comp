import 'server-only';

import { Redis } from '@upstash/redis';
import { Redis as LocalRedis } from 'ioredis';

// Mock Redis client for E2E tests
class MockRedis {
  private storage = new Map<string, any>();

  async get(key: string) {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: any, options?: { ex?: number }) {
    this.storage.set(key, value);
    if (options?.ex) {
      // Simple expiration simulation
      setTimeout(() => {
        this.storage.delete(key);
      }, options.ex * 1000);
    }
    return 'OK';
  }

  async del(key: string) {
    this.storage.delete(key);
    return 1;
  }

  async exists(key: string) {
    return this.storage.has(key) ? 1 : 0;
  }

  async keys(pattern: string) {
    const keys = Array.from(this.storage.keys());
    if (pattern === '*') return keys;

    // Simple pattern matching for E2E tests
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter((key) => regex.test(key));
  }

  async expire(key: string, seconds: number) {
    if (this.storage.has(key)) {
      setTimeout(() => {
        this.storage.delete(key);
      }, seconds * 1000);
      return 1;
    }
    return 0;
  }
}

// Local (non-Upstash) Redis client for local development. Mirrors the Upstash
// REST client's JSON semantics: values are serialized to JSON on set and
// parsed on get, so callers can store plain objects. Uses REDIS_URL (RESP)
// so it works from any Next runtime (route handlers vs RSC pages run in
// separate module graphs — an in-memory mock can't share state across them).
class LocalRedisClient {
  private client: LocalRedis;

  constructor(url: string) {
    this.client = new LocalRedis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    this.client.on('error', () => {
      // Connection failures shouldn't crash the process; commands will reject.
    });
  }

  private serialize(value: unknown): string {
    if (value === undefined) return 'undefined';
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  private deserialize(value: string | null): unknown {
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async get(key: string) {
    const value = await this.client.get(key);
    return this.deserialize(value);
  }

  async set(key: string, value: unknown, options?: { ex?: number }) {
    if (options?.ex) {
      await this.client.set(key, this.serialize(value), 'EX', options.ex);
    } else {
      await this.client.set(key, this.serialize(value));
    }
    return 'OK';
  }

  async del(...keys: string[]) {
    return this.client.del(...keys);
  }

  async exists(key: string) {
    return this.client.exists(key);
  }

  async keys(pattern: string) {
    return this.client.keys(pattern);
  }

  async expire(key: string, seconds: number) {
    return this.client.expire(key, seconds);
  }
}

// Use mock client for E2E tests in CI or when explicitly mocked
const isE2ETest = process.env.E2E_TEST_MODE === 'true' && process.env.CI === 'true';
const isMockRequired = process.env.MOCK_REDIS === 'true';
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);
const localRedisUrl = process.env.REDIS_URL;

export const client: Redis = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : localRedisUrl
    ? (new LocalRedisClient(localRedisUrl) as unknown as Redis)
    : isE2ETest || isMockRequired
      ? (new MockRedis() as unknown as Redis)
      : new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });

// Re-export Redis types for convenience
export type { Redis } from '@upstash/redis';
