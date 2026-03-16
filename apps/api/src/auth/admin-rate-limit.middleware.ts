import type { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

interface RateEntry {
  count: number;
  resetAt: number;
}

const hits = new Map<string, RateEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Express middleware that rate-limits requests to /api/auth/admin/*.
 *
 * better-auth admin routes (impersonation, set-role, ban, etc.) are handled
 * by better-auth's own request handler and never reach NestJS controllers,
 * so the global ThrottlerGuard does not apply to them. This middleware fills
 * that gap with a per-IP sliding window (10 req/min by default).
 */
export function adminAuthRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.path.startsWith('/api/auth/admin')) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many requests to admin endpoints. Try again later.',
    });
    return;
  }

  return next();
}
