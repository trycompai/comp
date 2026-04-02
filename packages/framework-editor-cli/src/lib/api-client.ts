import { getSessionToken, getApiUrl, clearCredentials } from './config.js';
import { ApiError, AuthRequiredError } from './errors.js';

const FRAMEWORK_EDITOR_PREFIX = '/v1/framework-editor';

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | number | undefined>;
  apiUrl?: string;
  requireAuth?: boolean;
}

function buildUrl(path: string, apiUrl: string, query?: Record<string, string | number | undefined>): string {
  const base = `${apiUrl}${FRAMEWORK_EDITOR_PREFIX}${path}`;
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, apiUrl: apiUrlOverride, requireAuth = true } = options;
  const apiUrl = getApiUrl(apiUrlOverride);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = getSessionToken();
    if (!token) throw new AuthRequiredError();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = buildUrl(path, apiUrl, query);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearCredentials();
    throw new ApiError(401, 'Session expired. Run `comp-framework auth login` to re-authenticate.');
  }

  if (response.status === 403) {
    throw new ApiError(403, 'Access denied. Platform admin privileges are required.');
  }

  if (!response.ok) {
    let message: string;
    try {
      const errorBody = (await response.json()) as { message?: string };
      message = errorBody.message ?? response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

/**
 * Make a raw request to the API (not under /v1/framework-editor prefix).
 * Used for auth endpoints like /api/auth/get-session.
 */
export async function rawApiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, apiUrl: apiUrlOverride, requireAuth = true } = options;
  const apiUrl = getApiUrl(apiUrlOverride);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = getSessionToken();
    if (!token) throw new AuthRequiredError();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${apiUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message: string;
    try {
      const errorBody = (await response.json()) as { message?: string };
      message = errorBody.message ?? response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}
