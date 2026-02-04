'use client';

import { env } from '@/env.mjs';
import { sessionToken } from '@/utils/session-token';

interface ApiCallOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * API client for calling our internal NestJS API.
 * Uses better-auth session tokens (bearer plugin) for authentication.
 * Organization context is carried by the session — no X-Organization-Id header needed.
 */
export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  }

  /**
   * Make an authenticated API call.
   * Automatically handles token refresh on 401 errors.
   */
  async call<T = unknown>(
    endpoint: string,
    options: ApiCallOptions = {},
    retryOnAuthError = true,
  ): Promise<ApiResponse<T>> {
    const { headers: customHeaders, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add session token for authentication
    if (typeof window !== 'undefined') {
      try {
        const token = await sessionToken.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting session token for API call:', error);
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: 'include',
        ...fetchOptions,
        headers,
      });

      // Handle 401 Unauthorized - token might be invalid, try refreshing
      if (response.status === 401 && retryOnAuthError && typeof window !== 'undefined') {
        // Clear cached token and fetch a fresh one
        sessionToken.clear();
        const newToken = await sessionToken.fetchToken();

        if (newToken) {
          // Retry the request with the new token (only once)
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          };

          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            credentials: 'include',
            ...fetchOptions,
            headers: retryHeaders,
          });

          return this.parseResponse<T>(retryResponse);
        } else {
          // Failed to get token, return original error
          return this.parseResponse<T>(response);
        }
      }

      return this.parseResponse<T>(response);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data = null;

    if (response.status === 204) {
      data = null;
    } else {
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
      error: !response.ok
        ? data?.message || `HTTP ${response.status}: ${response.statusText}`
        : undefined,
      status: response.status,
    };
  }

  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, { method: 'GET' });
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = unknown>(
    endpoint: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Convenience functions
export const api = {
  get: <T = unknown>(endpoint: string) =>
    apiClient.get<T>(endpoint),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    apiClient.post<T>(endpoint, body),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    apiClient.put<T>(endpoint, body),

  patch: <T = unknown>(endpoint: string, body?: unknown) =>
    apiClient.patch<T>(endpoint, body),

  delete: <T = unknown>(endpoint: string, body?: unknown) =>
    apiClient.delete<T>(endpoint, body),
};
