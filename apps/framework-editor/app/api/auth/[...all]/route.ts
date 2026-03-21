/**
 * Auth API proxy route.
 *
 * Forwards auth requests to the NestJS API where better-auth runs.
 * This app does not run its own better-auth instance.
 */
import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

async function proxyToApi(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = `${API_URL}${url.pathname}${url.search}`;

  const proxyHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (
      k === 'cookie' ||
      k === 'origin' ||
      k === 'content-type' ||
      k === 'accept' ||
      k === 'user-agent' ||
      k.startsWith('x-')
    ) {
      proxyHeaders.set(key, value);
    }
  });

  if (!proxyHeaders.has('origin')) {
    proxyHeaders.set('origin', API_URL);
  }

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined;

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: proxyHeaders,
    body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'set-cookie' || k === 'content-type' || k === 'location') {
      responseHeaders.append(key, value);
    }
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyToApi;
export const POST = proxyToApi;
