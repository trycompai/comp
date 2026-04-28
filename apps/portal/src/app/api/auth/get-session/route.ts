import { env } from '@/env.mjs';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE =
  env.BACKEND_API_URL || env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

/**
 * Backwards-compat alias for device-agent installs (pre-PR #2222) that call
 * `${portalUrl}/api/auth/get-session` to verify their session. Better-auth
 * lives on the NestJS API now; cross-subdomain cookies (.trycomp.ai) make
 * the same session token valid against api.trycomp.ai.
 *
 * TODO: Delete after the device-agent fleet has rolled past 1.0.5.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const headers: Record<string, string> = {};
  const cookie = req.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;
  const authorization = req.headers.get('authorization');
  if (authorization) headers['Authorization'] = authorization;

  const response = await fetch(`${API_BASE}/api/auth/get-session`, {
    method: 'GET',
    headers,
    redirect: 'manual',
  });

  const responseHeaders: Record<string, string> = {};
  const contentType = response.headers.get('Content-Type');
  if (contentType) responseHeaders['Content-Type'] = contentType;

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
