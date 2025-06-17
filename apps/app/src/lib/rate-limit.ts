import { env } from '@/env.mjs';
import { client } from '@comp/kv';
import { Ratelimit } from '@upstash/ratelimit';
import type { NextRequest } from 'next/server';

let ratelimit: Ratelimit | undefined;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(20, '10 s'),
  });
}

export async function rateLimit(request: NextRequest) {
  if (!ratelimit) {
    return { success: true };
  }

  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  return { success };
}
