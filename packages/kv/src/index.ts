import 'server-only';

import { Redis } from '@upstash/redis';

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

// Use mock client for E2E tests in CI or when explicitly mocked
const isE2ETest = process.env.E2E_TEST_MODE === 'true' && process.env.CI === 'true';
const isMockRequired = process.env.MOCK_REDIS === 'true';

export const client =
  isE2ETest || isMockRequired
    ? (new MockRedis() as any as Redis)
    : new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

// Re-export Redis types for convenience
export type { Redis } from '@upstash/redis';
