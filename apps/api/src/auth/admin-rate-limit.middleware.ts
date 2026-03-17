import type { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const MAX_REQUESTS = 10;
const WINDOW = '60 s';

const hasUpstashConfig =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const ratelimit = hasUpstashConfig
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
      prefix: 'ratelimit:admin-auth',
    })
  : null;

/**
 * Express middleware that rate-limits requests to /api/auth/admin/*.
 *
 * better-auth admin routes (impersonation, set-role, ban, etc.) are handled
 * by better-auth's own request handler and never reach NestJS controllers,
 * so the global ThrottlerGuard does not apply to them. This middleware fills
 * that gap with a per-IP sliding window (10 req/min) backed by Upstash Redis
 * so limits are shared across all ECS instances.
 */
export async function adminAuthRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.path.startsWith('/api/auth/admin')) {
    return next();
  }

  if (!ratelimit) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      res.status(429).json({
        error: 'Too many requests to admin endpoints. Try again later.',
      });
      return;
    }
  } catch {
    // If Redis is unreachable, allow the request through rather than
    // blocking all admin operations. The WAF still provides baseline protection.
  }

  return next();
}
