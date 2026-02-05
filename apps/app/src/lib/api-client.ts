'use client';

import { env } from '@/env.mjs';

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
 * Uses cookie-based authentication (better-auth session cookies).
 * Organization context is carried by the session — no X-Organization-Id header needed.
 */
export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  }

  async call<T = unknown>(
    endpoint: string,
    options: ApiCallOptions = {},
  ): Promise<ApiResponse<T>> {
    const { headers: customHeaders, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: 'include',
        ...fetchOptions,
        headers,
      });

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
