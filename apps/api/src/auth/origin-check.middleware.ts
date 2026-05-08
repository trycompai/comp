import type { Request, Response, NextFunction } from 'express';
import { isTrustedOrigin } from './auth.server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Paths exempt from Origin validation (webhooks, public endpoints).
 * These are called by external services that don't send browser Origin headers.
 */
const EXEMPT_PATH_PREFIXES = [
  '/api/auth', // better-auth handles its own CSRF
  '/v1/health', // health check
  '/api/docs', // swagger
  '/v1/trust-access', // public trust portal endpoints (no auth, no cookies)
];

/**
 * Express middleware that validates the Origin header on state-changing requests.
 *
 * This is defense-in-depth against CSRF attacks that bypass CORS:
 * - HTML form submissions (Content-Type: application/x-www-form-urlencoded)
 *   don't trigger CORS preflight, so CORS alone doesn't block them.
 * - This middleware rejects any state-changing request whose Origin header
 *   doesn't match a trusted origin.
 *
 * API keys and service tokens (which don't come from browsers) typically
 * don't send an Origin header, so requests without an Origin are allowed
 * — they'll be authenticated by HybridAuthGuard instead.
 */
export function originCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Allow safe (read-only) methods
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Allow exempt paths (webhooks, auth, etc.)
  const isExempt = EXEMPT_PATH_PREFIXES.some((prefix) =>
    req.path.startsWith(prefix),
  );
  if (isExempt) {
    return next();
  }

  const origin = req.headers['origin'];

  // No Origin header = not a browser request (API key, service token, curl, etc.)
  // These are authenticated via HybridAuthGuard, not cookies, so no CSRF risk.
  if (!origin) {
    return next();
  }

  // Validate Origin against trusted origins (includes dynamic subdomains + custom domains)
  isTrustedOrigin(origin)
    .then((trusted) => {
      if (trusted) {
        return next();
      }
      res.status(403).json({
        statusCode: 403,
        message: 'Forbidden',
      });
    })
    .catch(() => {
      res.status(403).json({
        statusCode: 403,
        message: 'Forbidden',
      });
    });
}
