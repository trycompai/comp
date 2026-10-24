import type { RequestHandler } from 'express';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host);
}

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') && LOOPBACK_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function requiresRequestCredentials(params: {
  host: string;
  disableStaticAuth: boolean;
}): boolean {
  return params.disableStaticAuth || !isLoopbackHost(params.host);
}

export function getRequestSecurityError(params: {
  origin: string | string[] | undefined;
  apiKey: string | string[] | undefined;
  requireCredentials: boolean;
}): { status: number; message: string } | undefined {
  if (
    params.origin !== undefined &&
    (typeof params.origin !== 'string' || !isAllowedOrigin(params.origin))
  ) {
    return { status: 403, message: 'Origin not allowed' };
  }

  if (
    params.requireCredentials &&
    (typeof params.apiKey !== 'string' || params.apiKey.trim().length === 0)
  ) {
    return { status: 401, message: 'An apikey request header is required' };
  }

  return undefined;
}

const REQUEST_ENCODINGS = new Set(['identity', 'gzip', 'deflate']);

/**
 * Refuse a request body in any encoding other than gzip or deflate, before
 * express.json decodes it. Brotli decoders in Node.js and Bun before their
 * October 2026 releases can write out of bounds on crafted input
 * (CVE-2026-111497), and Express 5 decodes `br` bodies by default. This also
 * refuses stacked encodings, such as `gzip, br`.
 */
export const requestEncoding: RequestHandler = (req, res, next) => {
  const encoding = (req.get('content-encoding') || 'identity').trim().toLowerCase();
  if (REQUEST_ENCODINGS.has(encoding)) return next();

  res.status(415).json({ error: 'Unsupported content encoding' });
};
