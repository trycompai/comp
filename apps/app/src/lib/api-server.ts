import { env } from '@/env.mjs';
import { headers } from 'next/headers';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Server-side API client for calling our internal NestJS API from server components.
 * Forwards cookies for authentication — API resolves the session (including
 * activeOrganizationId) via better-auth, so no X-Organization-Id header is needed.
 */
async function call<T = unknown>(
  endpoint: string,
  options: CallOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body } = options;
  const baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward cookies for auth - better-auth handles session validation
  const headerStore = await headers();
  const cookieHeader = headerStore.get('cookie');
  if (cookieHeader) {
    requestHeaders['Cookie'] = cookieHeader;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
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
  get: <T = unknown>(endpoint: string) =>
    call<T>(endpoint, { method: 'GET' }),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    call<T>(endpoint, { method: 'POST', body }),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    call<T>(endpoint, { method: 'PUT', body }),

  patch: <T = unknown>(endpoint: string, body?: unknown) =>
    call<T>(endpoint, { method: 'PATCH', body }),

  delete: <T = unknown>(endpoint: string, body?: unknown) =>
    call<T>(endpoint, { method: 'DELETE', body }),
};
