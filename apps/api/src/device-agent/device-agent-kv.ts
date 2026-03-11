import { Redis } from '@upstash/redis';

class InMemoryRedis {
  private storage = new Map<string, { value: unknown; expiresAt?: number }>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const record = this.storage.get(key);
    if (!record) return null;
    if (record.expiresAt && record.expiresAt <= Date.now()) {
      this.storage.delete(key);
      return null;
    }
    return record.value as T;
  }

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number },
  ): Promise<'OK'> {
    const expiresAt = options?.ex ? Date.now() + options.ex * 1000 : undefined;
    this.storage.set(key, { value, expiresAt });
    return 'OK';
  }

  async getdel<T = unknown>(key: string): Promise<T | null> {
    const value = await this.get<T>(key);
    if (value !== null) {
      this.storage.delete(key);
    }
    return value;
  }

  async del(key: string): Promise<number> {
    const existed = this.storage.delete(key);
    return existed ? 1 : 0;
  }
}

const hasUpstashConfig =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

export const deviceAgentRedisClient: Pick<
  Redis,
  'get' | 'set' | 'getdel' | 'del'
> = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : (new InMemoryRedis() as unknown as Pick<
      Redis,
      'get' | 'set' | 'getdel' | 'del'
    >);
