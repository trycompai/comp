import { env } from '@/env.mjs';
import { NextResponse } from 'next/server';

const API_BASE = env.BACKEND_API_URL || env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

/**
 * Thin proxy that forwards device-agent requests to the NestJS API.
 *
 * Existing installed agents still call portal routes with Bearer tokens.
 * This proxy forwards them to the API where HybridAuthGuard handles auth.
 *
 * TODO: Delete after 2-3 device agent release cycles once all agents
 * have auto-updated to call the API directly.
 */
export async function proxyToApi(
  req: Request,
  apiPath: string,
  method: 'GET' | 'POST' | 'HEAD' = 'GET',
): Promise<Response> {
  const url = `${API_BASE}${apiPath}`;

  const headers: Record<string, string> = {};

  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  // Forward auth headers
  const authorization = req.headers.get('authorization');
  if (authorization) {
    headers['Authorization'] = authorization;
  }

  // Forward cookies for browser-based requests
  const cookie = req.headers.get('cookie');
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const fetchOptions: RequestInit = { method, headers };

  if (method === 'POST') {
    try {
      fetchOptions.body = await req.text();
    } catch {
      // No body
    }
  }

  const response = await fetch(url, fetchOptions);

  // Forward the response directly (preserves streaming for binary files)
  const responseHeaders: Record<string, string> = {};
  const contentType = response.headers.get('Content-Type');
  const contentLength = response.headers.get('Content-Length');
  const cacheControl = response.headers.get('Cache-Control');

  if (contentType) responseHeaders['Content-Type'] = contentType;
  if (contentLength) responseHeaders['Content-Length'] = contentLength;
  if (cacheControl) responseHeaders['Cache-Control'] = cacheControl;

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
