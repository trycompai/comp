import { headers } from 'next/headers';
import { cache } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const resolveBetterAuthBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000';
};

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  organizationId?: string;
}

const getJwtForRequest = cache(async (): Promise<string | null> => {
  try {
    const cookieHeader = (await headers()).get('cookie');
    if (!cookieHeader) {
      console.warn('[serverApi] No cookie header present');
    }
    if (!cookieHeader) return null;

    const baseUrl = resolveBetterAuthBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    const jwtToken = response.headers.get('set-auth-jwt');
    console.log('[serverApi] Session JWT header present:', Boolean(jwtToken));
    return jwtToken ?? null;
  } catch (error) {
    console.error('[serverApi] Failed to fetch JWT token', error);
    return null;
  }
});

/**
 * Server-side API client for calling our internal NestJS API from server components
 * Uses Better Auth session to mint a JWT for API auth
 */
async function call<T = unknown>(
  endpoint: string,
  options: CallOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, organizationId } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (organizationId) {
    requestHeaders['X-Organization-Id'] = organizationId;
  }

  const jwtToken = await getJwtForRequest();
  if (jwtToken) {
    requestHeaders['Authorization'] = `Bearer ${jwtToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    let data = null;
    if (response.status !== 204) {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }
    }

    return {
      data: response.ok ? data : undefined,
      error: !response.ok ? data?.message || `HTTP ${response.status}` : undefined,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

export const serverApi = {
  get: <T = unknown>(endpoint: string, organizationId?: string) =>
    call<T>(endpoint, { method: 'GET', organizationId }),

  post: <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
    call<T>(endpoint, { method: 'POST', body, organizationId }),

  put: <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
    call<T>(endpoint, { method: 'PUT', body, organizationId }),

  patch: <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
    call<T>(endpoint, { method: 'PATCH', body, organizationId }),

  delete: <T = unknown>(endpoint: string, organizationId?: string) =>
    call<T>(endpoint, { method: 'DELETE', organizationId }),
};
