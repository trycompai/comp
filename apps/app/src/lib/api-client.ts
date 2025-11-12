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

/**
 * API client for calling our internal NestJS API
 * Uses Better Auth Bearer tokens for authentication with organization context
 */
export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  }

  /**
   * Make an authenticated API call
   * Uses Bearer token authentication + explicit org context
   * Automatically handles token refresh on 401 errors
   */
  async call<T = unknown>(
    endpoint: string,
    options: ApiCallOptions = {},
    retryOnAuthError = true,
  ): Promise<ApiResponse<T>> {
    const { organizationId, headers: customHeaders, ...fetchOptions } = options;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add explicit organization context if provided
    if (organizationId) {
      headers['X-Organization-Id'] = organizationId;
    }

    // Add JWT token for authentication
    if (typeof window !== 'undefined') {
      try {
        // Get a valid (non-stale) JWT token
        const token = await jwtManager.getValidToken();

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('❌ Error getting JWT token for API call:', error);
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
        console.log('🔄 Received 401, refreshing token and retrying request...');

        // Force refresh token (clear cache and get fresh one)
        const newToken = await jwtManager.forceRefresh();

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

          let retryData = null;

          // Handle different response types based on status and content
          if (retryResponse.status === 204) {
            retryData = null;
          } else {
            const text = await retryResponse.text();
            if (text) {
              try {
                retryData = JSON.parse(text);
              } catch (parseError) {
                retryData = { message: text };
              }
            }
          }

          return {
            data: retryResponse.ok ? retryData : undefined,
            error: !retryResponse.ok
              ? retryData?.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`
              : undefined,
            status: retryResponse.status,
          };
        } else {
          // Failed to refresh token, read original response and return error
          console.error('❌ Failed to refresh token after 401 error');
          const text = await response.text();
          let errorData = null;
          if (text) {
            try {
              errorData = JSON.parse(text);
            } catch {
              errorData = { message: text };
            }
          }
          return {
            data: undefined,
            error: errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          };
        }
      }

      let data = null;

      // Handle different response types based on status and content
      if (response.status === 204) {
        // 204 No Content - DELETE operations return empty body
        data = null;
      } else {
        // All other responses should have JSON content
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            // If JSON parsing fails but we have text, use it as error message
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
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, organizationId?: string): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, { method: 'GET', organizationId });
  }

  /**
   * POST request
   */
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

  /**
   * PUT request
   */
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

  /**
   * PATCH request
   */
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

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, organizationId?: string): Promise<ApiResponse<T>> {
    return this.call<T>(endpoint, { method: 'DELETE', organizationId });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Convenience functions
export const api = {
  get: <T = unknown>(endpoint: string, organizationId?: string) =>
    apiClient.get<T>(endpoint, organizationId),

  post: <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
    apiClient.post<T>(endpoint, body, organizationId),

  put: <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
    apiClient.put<T>(endpoint, body, organizationId),

  patch: <T = unknown>(endpoint: string, body?: unknown, organizationId?: string) =>
    apiClient.patch<T>(endpoint, body, organizationId),

  delete: <T = unknown>(endpoint: string, organizationId?: string) =>
    apiClient.delete<T>(endpoint, organizationId),
};
