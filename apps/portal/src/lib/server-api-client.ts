import { env } from '@/env.mjs';
import { headers } from 'next/headers';

const API_BASE_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export interface ServerApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  organizationId: string;
}

async function getServerJwt(): Promise<string | null> {
  const cookie = (await headers()).get('cookie');
  if (!cookie) return null;

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/token`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (
      typeof json === 'object' &&
      json !== null &&
      'token' in json &&
      typeof (json as { token?: unknown }).token === 'string'
    ) {
      return (json as { token: string }).token;
    }
    return null;
  } catch {
    return null;
  }
}

async function call<T = unknown>(
  endpoint: string,
  options: CallOptions,
): Promise<ServerApiResponse<T>> {
  const { method = 'GET', body, organizationId } = options;
  const token = await getServerJwt();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Organization-Id': organizationId,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    const text = response.status === 204 ? '' : await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    return {
      data: response.ok ? (data as T) : undefined,
      error: !response.ok
        ? (data as { message?: string } | null)?.message || `HTTP ${response.status}`
        : undefined,
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
  get: <T = unknown>(endpoint: string, organizationId: string) =>
    call<T>(endpoint, { method: 'GET', organizationId }),
  post: <T = unknown>(endpoint: string, body: unknown, organizationId: string) =>
    call<T>(endpoint, { method: 'POST', body, organizationId }),
  patch: <T = unknown>(endpoint: string, body: unknown, organizationId: string) =>
    call<T>(endpoint, { method: 'PATCH', body, organizationId }),
};

async function callNoOrg<T = unknown>(
  endpoint: string,
  options: Omit<CallOptions, 'organizationId'>,
): Promise<ServerApiResponse<T>> {
  const { method = 'GET', body } = options;
  const token = await getServerJwt();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    const text = response.status === 204 ? '' : await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    return {
      data: response.ok ? (data as T) : undefined,
      error: !response.ok
        ? (data as { message?: string } | null)?.message || `HTTP ${response.status}`
        : undefined,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

export const serverApiNoOrg = {
  get: <T = unknown>(endpoint: string) => callNoOrg<T>(endpoint, { method: 'GET' }),
};
