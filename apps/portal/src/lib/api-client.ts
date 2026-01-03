'use client';

import { env } from '@/env.mjs';
import { jwtManager } from '@/utils/jwt-manager';

interface ApiCallOptions extends Omit<RequestInit, 'headers'> {
  organizationId?: string;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  }

  async call<T = unknown>(
    endpoint: string,
    options: ApiCallOptions = {},
    retryOnAuthError = true,
  ): Promise<ApiResponse<T>> {
    const { organizationId, headers: customHeaders, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (organizationId) {
      headers['X-Organization-Id'] = organizationId;
    }

    if (typeof window !== 'undefined') {
      const token = await jwtManager.getValidToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: 'include',
        ...fetchOptions,
        headers,
      });

      if (response.status === 401 && retryOnAuthError && typeof window !== 'undefined') {
        const newToken = await jwtManager.forceRefresh();
        if (newToken) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            credentials: 'include',
            ...fetchOptions,
            headers: retryHeaders,
          });
          const retryText = await retryResponse.text();
          const retryData = retryText ? (JSON.parse(retryText) as unknown) : null;
          return {
            data: retryResponse.ok ? (retryData as T) : undefined,
            error: !retryResponse.ok
              ? (retryData as { message?: string } | null)?.message ||
                `HTTP ${retryResponse.status}: ${retryResponse.statusText}`
              : undefined,
            status: retryResponse.status,
          };
        }
      }

      const text = response.status === 204 ? '' : await response.text();
      const data = text ? (JSON.parse(text) as unknown) : null;

      return {
        data: response.ok ? (data as T) : undefined,
        error: !response.ok
          ? (data as { message?: string } | null)?.message ||
            `HTTP ${response.status}: ${response.statusText}`
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

  async get<T = unknown>(endpoint: string, organizationId?: string): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, { method: 'GET', organizationId });
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    organizationId?: string,
  ): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      organizationId,
    });
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    organizationId?: string,
  ): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      organizationId,
    });
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    organizationId?: string,
  ): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      organizationId,
    });
  }

  async delete<T = unknown>(endpoint: string, organizationId?: string): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, { method: 'DELETE', organizationId });
  }
}

export const apiClient = new ApiClient();
