/**
 * Auth API route proxy for the Portal.
 *
 * Proxies all auth requests to the NestJS API server.
 * The actual auth server (better-auth) runs on the API — the portal only forwards requests.
 *
 * SECURITY:
 * - Rate limiting to prevent brute force attacks
 * - Redirect URL validation to prevent open redirects
 * - Conditional logging (development only)
 */

import { NextRequest, NextResponse } from 'next/server';

// IMPORTANT: This proxy must always point to the actual API server.
// Do NOT use BETTER_AUTH_URL here - that may be set to the app's URL which would cause a loop.
const API_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// =============================================================================
// Rate Limiting (in-memory, per-instance)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiter
// In production, consider using Redis or a distributed rate limiter
const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per IP

// Stricter limits for sensitive endpoints
const SENSITIVE_ENDPOINTS = [
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/magic-link',
  '/api/auth/email-otp',
  '/api/auth/verify-otp',
  '/api/auth/reset-password',
];
const SENSITIVE_RATE_LIMIT_MAX = 10; // 10 requests per minute for sensitive endpoints

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${ip}:${pathname}`;

  const isSensitive = SENSITIVE_ENDPOINTS.some((ep) => pathname.startsWith(ep));
  const maxRequests = isSensitive ? SENSITIVE_RATE_LIMIT_MAX : RATE_LIMIT_MAX_REQUESTS;

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// =============================================================================
// Redirect URL Validation
// =============================================================================

function getAllowedHosts(): string[] {
  const hosts = [
    'localhost:3000',
    'localhost:3002',
    'localhost:3333',
    'app.trycomp.ai',
    'portal.trycomp.ai',
    'api.trycomp.ai',
    'app.staging.trycomp.ai',
    'portal.staging.trycomp.ai',
    'api.staging.trycomp.ai',
  ];

  const customHosts = process.env.AUTH_ALLOWED_REDIRECT_HOSTS;
  if (customHosts) {
    hosts.push(...customHosts.split(',').map((h) => h.trim()));
  }

  return hosts;
}

function isAllowedRedirectUrl(redirectUrl: string, requestOrigin: string): boolean {
  try {
    const url = new URL(redirectUrl);
    const allowedHosts = getAllowedHosts();

    const originUrl = new URL(requestOrigin);
    if (url.host === originUrl.host) {
      return true;
    }

    return allowedHosts.includes(url.host);
  } catch {
    return redirectUrl.startsWith('/');
  }
}

// =============================================================================
// Proxy Implementation
// =============================================================================

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const clientIP = getClientIP(request);

  const rateLimit = checkRateLimit(clientIP, url.pathname);
  if (!rateLimit.allowed) {
    if (IS_DEVELOPMENT) {
      console.log(`[auth proxy] Rate limit exceeded for ${clientIP} on ${url.pathname}`);
    }
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter || 60),
        },
      }
    );
  }

  const targetUrl = `${API_URL}${url.pathname}${url.search}`;

  if (IS_DEVELOPMENT) {
    console.log(`[auth proxy] ${request.method} ${url.pathname} -> ${targetUrl}`);
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) => key.toLowerCase() !== 'host'
          )
        ),
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      redirect: 'manual',
    });

    if (IS_DEVELOPMENT) {
      console.log(`[auth proxy] Response: ${response.status} ${response.statusText}`);
    }

    const responseHeaders = new Headers();

    // Handle Set-Cookie headers specially - they need to be appended, not set
    // Use getSetCookie() with fallback for runtimes that don't support it
    let setCookieHeaders: string[] = [];
    if (typeof response.headers.getSetCookie === 'function') {
      setCookieHeaders = response.headers.getSetCookie();
    }

    // Fallback: extract from raw headers if getSetCookie didn't work
    // This handles Vercel/edge runtimes where getSetCookie may not be available
    if (setCookieHeaders.length === 0) {
      const raw = response.headers.get('set-cookie');
      if (raw) {
        // Split on comma-space but NOT within Expires date values
        // e.g. "Expires=Thu, 01 Jan 2026" contains a comma we must not split on
        setCookieHeaders = raw.split(/,(?=\s*[a-zA-Z_\-.]+=)/);
      }
    }

    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'set-cookie') {
        return;
      }
      responseHeaders.set(key, value);
    });

    // Process Set-Cookie headers
    if (setCookieHeaders.length > 0) {
      if (IS_DEVELOPMENT) {
        console.log(`[auth proxy] Forwarding ${setCookieHeaders.length} Set-Cookie headers`);
      }
      for (const cookie of setCookieHeaders) {
        let processedCookie = cookie;

        // In development, cookies between localhost ports
        // need to have their domain removed to work correctly
        if (IS_DEVELOPMENT) {
          processedCookie = processedCookie.replace(/;\s*domain=[^;]*/gi, '');
        }

        responseHeaders.append('set-cookie', processedCookie);

        // When a cookie has a Domain attribute (cross-subdomain), also delete
        // any stale host-only cookie with the same name. Host-only cookies
        // take precedence and would shadow the new cross-subdomain cookie.
        if (!IS_DEVELOPMENT && /;\s*domain=/i.test(processedCookie)) {
          const nameMatch = processedCookie.match(/^([^=]+)=/);
          if (nameMatch) {
            const cookieName = nameMatch[1].trim();
            responseHeaders.append(
              'set-cookie',
              `${cookieName}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`,
            );
          }
        }
      }
    }

    // Handle redirects with URL validation
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const rewrittenLocation = location.replace(API_URL, url.origin);

        if (!isAllowedRedirectUrl(rewrittenLocation, url.origin)) {
          console.error(`[auth proxy] SECURITY: Blocked suspicious redirect to ${rewrittenLocation}`);
          return NextResponse.json(
            { error: 'Invalid redirect URL' },
            { status: 400 }
          );
        }

        if (IS_DEVELOPMENT) {
          console.log(`[auth proxy] Redirect: ${location} -> ${rewrittenLocation}`);
        }
        responseHeaders.set('location', rewrittenLocation);
      }
    }

    const body = response.status === 204 ? null : await response.text();

    return new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[auth proxy] Failed to proxy request:', error);
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return proxyRequest(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return proxyRequest(request);
}
