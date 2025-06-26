import type { Session } from '@/utils/auth';
import { NextRequest, NextResponse } from 'next/server';

interface MockRequestOptions {
  session?: Session | null;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
  method?: string;
}

export function createMockRequest(pathname: string, options: MockRequestOptions = {}): NextRequest {
  const { headers = {}, searchParams = {}, method = 'GET' } = options;

  // Build URL with search params
  const url = new URL(pathname, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  // Create headers
  const headersInit = new Headers({
    'x-forwarded-for': '127.0.0.1',
    'user-agent': 'test-agent',
    ...headers,
  });

  // Create the request
  const request = new NextRequest(url, {
    method,
    headers: headersInit,
  });

  return request;
}

// Helper to extract redirect location from response
export function getRedirectLocation(response: NextResponse): string | null {
  if (response.status === 307 || response.status === 302 || response.status === 301) {
    return response.headers.get('location');
  }
  return null;
}

// Helper to check if response is a redirect
export function isRedirect(response: NextResponse): boolean {
  return [301, 302, 307, 308].includes(response.status);
}
