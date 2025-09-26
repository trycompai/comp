/**
 * Task Automation API Client
 *
 * Provides a centralized API client for all task automation operations.
 * Handles S3 operations, script execution, and workflow analysis.
 */

import type {
  TaskAutomationExecuteRequest,
  TaskAutomationExecutionResult,
  TaskAutomationScript,
  TaskAutomationScriptsListResponse,
  TaskAutomationUploadRequest,
  TaskAutomationUploadResponse,
} from './types';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Generic API client with error handling and response parsing
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const apiError = new Error(error.error || error.message || 'Request failed') as ApiError;
      apiError.status = response.status;
      apiError.code = error.code;
      throw apiError;
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    // If endpoint is already a full URL or starts with /, use it directly
    const url =
      endpoint.startsWith('http') || endpoint.startsWith('/')
        ? new URL(endpoint, window.location.origin)
        : new URL(endpoint, this.baseUrl || window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    // Construct proper URL
    const url =
      endpoint.startsWith('http') || endpoint.startsWith('/')
        ? endpoint
        : `${this.baseUrl || ''}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

/**
 * Task Automation API
 *
 * All API operations related to task automation
 */
export const taskAutomationApi = {
  /**
   * S3 Operations
   */
  s3: {
    /**
     * Get a specific automation script from S3
     * @param key - The S3 key (format: orgId/taskId.js)
     */
    getScript: (key: string) =>
      apiClient.get<TaskAutomationScript>('/api/tasks-automations/s3/get', { key }),

    /**
     * List all automation scripts for an organization
     * @param orgId - The organization ID
     */
    listScripts: (orgId: string) =>
      apiClient.get<TaskAutomationScriptsListResponse>('/api/tasks-automations/s3/list', { orgId }),

    /**
     * Upload a new automation script to S3
     * @param data - Upload request data
     */
    uploadScript: (data: TaskAutomationUploadRequest) =>
      apiClient.post<TaskAutomationUploadResponse>('/api/tasks-automations/s3/upload', data),
  },

  /**
   * Execution Operations
   */
  execution: {
    /**
     * Execute an automation script via Trigger.dev
     * @param data - Execution request data
     */
    executeScript: (data: TaskAutomationExecuteRequest) =>
      apiClient.post<TaskAutomationExecutionResult>('/api/tasks-automations/trigger/execute', data),

    /**
     * Get run status
     * @param runId - The Trigger.dev run ID
     */
    getRunStatus: (runId: string) => apiClient.get(`/api/tasks-automations/runs/${runId}`),
  },

  /**
   * Workflow Operations
   */
  workflow: {
    /**
     * Analyze a script to extract workflow steps
     * @param scriptContent - The script content to analyze
     */
    analyzeWorkflow: (scriptContent: string) =>
      apiClient.post<{
        steps: Array<{
          title: string;
          description: string;
          type: string;
          iconType: string;
        }>;
      }>('/api/tasks-automations/workflow/analyze', { scriptContent }),
  },
};
