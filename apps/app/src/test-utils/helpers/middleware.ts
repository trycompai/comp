import type { Session } from '@/utils/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getLatestSession } from '@/test-utils/mocks/auth';

interface MockRequestOptions {
  session?: Session | null;
  headers?: Record<string, string>;
  searchParams?: Promise<Record<string, string>>;
  method?: string;
}

export async function createMockRequest(
  pathname: string,
  options: MockRequestOptions = {},
): Promise<NextRequest> {
  const { headers = {}, searchParams = {}, method = 'GET', session } = options;

  // Build URL with search params
  const url = new URL(pathname, 'http://localhost:3000');
  const searchParamsObj = await searchParams;
  Object.entries(searchParamsObj).forEach(([key, value]) => {
    url.searchParams.set(key, value as string);
  });

  // Create headers
  const headersInit = new Headers({
    'x-forwarded-for': '127.0.0.1',
    'user-agent': 'test-agent',
    ...headers,
  });

  // Attach session token cookie when provided
  const sessionToken = session?.token ?? getLatestSession()?.token;

  if (sessionToken) {
    const existingCookies = headersInit.get('cookie');
    const sessionCookies = [
      `__Secure-better-auth.session_token=${sessionToken}`,
      `better-auth.session_token=${sessionToken}`,
    ];
    const cookieHeader = [existingCookies, sessionCookies.join('; ')].filter(Boolean).join('; ');
    headersInit.set('cookie', cookieHeader);
  }

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
