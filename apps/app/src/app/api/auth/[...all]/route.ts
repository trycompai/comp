/**
 * Auth API route proxy.
 *
 * This route proxies auth requests to the API server.
 * The actual auth server runs on the API - this app only forwards requests.
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
  // Check various headers for the real IP (behind proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  // Fallback - not ideal but better than nothing
  return 'unknown';
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${ip}:${pathname}`;

  // Determine the rate limit based on endpoint sensitivity
  const isSensitive = SENSITIVE_ENDPOINTS.some((ep) => pathname.startsWith(ep));
  const maxRequests = isSensitive ? SENSITIVE_RATE_LIMIT_MAX : RATE_LIMIT_MAX_REQUESTS;

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
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

  // Add any custom allowed hosts from environment
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

    // Allow redirects to the request's own origin
    const originUrl = new URL(requestOrigin);
    if (url.host === originUrl.host) {
      return true;
    }

    // Allow redirects to configured allowed hosts
    return allowedHosts.includes(url.host);
  } catch {
    // If URL parsing fails, check if it's a relative URL (which is safe)
    return redirectUrl.startsWith('/');
  }
}

// =============================================================================
// Proxy Implementation
// =============================================================================

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const clientIP = getClientIP(request);

  // Check rate limit
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
    // Forward the request to the API
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        // Forward all headers except host
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) => key.toLowerCase() !== 'host'
          )
        ),
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      // Don't follow redirects - let the client handle them
      redirect: 'manual',
    });

    if (IS_DEVELOPMENT) {
      console.log(`[auth proxy] Response: ${response.status} ${response.statusText}`);
    }

    // Create response with the same status and headers
    const responseHeaders = new Headers();

    // Handle Set-Cookie headers specially - they need to be appended, not set
    const setCookieHeaders = response.headers.getSetCookie?.() || [];

    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Skip set-cookie here, we'll handle it separately
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

        // In development, cookies between localhost:3000 and localhost:3333
        // need to have their domain removed to work correctly
        if (IS_DEVELOPMENT) {
          // Remove domain attribute so cookie is set for current host
          processedCookie = processedCookie.replace(/;\s*domain=[^;]*/gi, '');
        }

        responseHeaders.append('set-cookie', processedCookie);
      }
    }

    // Handle redirects with URL validation
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // Rewrite API URLs to app URLs in redirects
        const rewrittenLocation = location.replace(API_URL, url.origin);

        // Validate the redirect URL for security
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
