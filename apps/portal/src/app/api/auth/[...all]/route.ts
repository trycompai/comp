/**
 * Auth API route proxy for the Portal.
 *
 * Proxies all auth requests to the NestJS API server.
 * The actual auth server (better-auth) runs on the API — the portal only forwards requests.
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Rate limiting
interface RateLimitEntry { count: number; resetTime: number; }
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const SENSITIVE_ENDPOINTS = [
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/email-otp',
  '/api/auth/verify-otp',
];
const SENSITIVE_RATE_LIMIT_MAX = 10;

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${ip}:${pathname}`;
  const isSensitive = SENSITIVE_ENDPOINTS.some((ep) => pathname.startsWith(ep));
  const maxRequests = isSensitive ? SENSITIVE_RATE_LIMIT_MAX : RATE_LIMIT_MAX_REQUESTS;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

// Redirect URL validation
function isAllowedRedirectUrl(redirectUrl: string, requestOrigin: string): boolean {
  try {
    const url = new URL(redirectUrl);
    const originUrl = new URL(requestOrigin);
    if (url.host === originUrl.host) return true;
    const allowedHosts = [
      'localhost:3000', 'localhost:3002', 'localhost:3333',
      'app.trycomp.ai', 'portal.trycomp.ai', 'api.trycomp.ai',
      'app.staging.trycomp.ai', 'portal.staging.trycomp.ai', 'api.staging.trycomp.ai',
    ];
    return allowedHosts.includes(url.host);
  } catch {
    return redirectUrl.startsWith('/');
  }
}

// Proxy implementation
async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);

  const rateLimit = checkRateLimit(getClientIP(request), url.pathname);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } },
    );
  }

  const targetUrl = `${API_URL}${url.pathname}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(([key]) => key.toLowerCase() !== 'host'),
        ),
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    const setCookieHeaders = response.headers.getSetCookie?.() || [];

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return;
      responseHeaders.set(key, value);
    });

    if (setCookieHeaders.length > 0) {
      for (const cookie of setCookieHeaders) {
        let processedCookie = cookie;
        if (IS_DEVELOPMENT) {
          processedCookie = processedCookie.replace(/;\s*domain=[^;]*/gi, '');
        }
        responseHeaders.append('set-cookie', processedCookie);
      }
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const rewrittenLocation = location.replace(API_URL, url.origin);
        if (!isAllowedRedirectUrl(rewrittenLocation, url.origin)) {
          console.error(`[auth proxy] Blocked suspicious redirect to ${rewrittenLocation}`);
          return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 });
        }
        responseHeaders.set('location', rewrittenLocation);
      }
    }

    const body = response.status === 204 ? null : await response.text();
    return new NextResponse(body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
  } catch (error) {
    console.error('[auth proxy] Failed to proxy request:', error);
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) { return proxyRequest(request); }
export async function POST(request: NextRequest) { return proxyRequest(request); }
export async function PUT(request: NextRequest) { return proxyRequest(request); }
export async function DELETE(request: NextRequest) { return proxyRequest(request); }
export async function PATCH(request: NextRequest) { return proxyRequest(request); }
