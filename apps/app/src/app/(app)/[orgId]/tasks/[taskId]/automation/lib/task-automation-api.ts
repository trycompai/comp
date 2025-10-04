/**
 * Task Automation API Client
 *
 * Provides a centralized API client for all task automation operations.
 * Uses server actions to securely call enterprise API with license key.
 */

import {
  analyzeAutomationWorkflow,
  executeAutomationScript,
  getAutomationRunStatus,
  getAutomationScript,
  listAutomationScripts,
  uploadAutomationScript,
} from '../actions/task-automation-actions';
import type { TaskAutomationExecuteRequest, TaskAutomationUploadRequest } from './types';

/**
 * Task Automation API
 *
 * All operations use server actions to securely call enterprise API
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
    getScript: async (key: string) => {
      const result = await getAutomationScript(key);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get script');
      }
      return result.data;
    },

    /**
     * List all automation scripts for an organization
     * @param orgId - The organization ID
     */
    listScripts: async (orgId: string) => {
      const result = await listAutomationScripts(orgId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to list scripts');
      }
      return result.data;
    },

    /**
     * Upload a new automation script to S3
     * @param data - Upload request data
     */
    uploadScript: async (data: TaskAutomationUploadRequest) => {
      const result = await uploadAutomationScript(data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload script');
      }
      return result.data;
    },
  },

  /**
   * Execution Operations
   */
  execution: {
    /**
     * Execute an automation script
     * @param data - Execution request data
     */
    executeScript: async (data: TaskAutomationExecuteRequest) => {
      const result = await executeAutomationScript(data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute script');
      }
      return result.data;
    },

    /**
     * Get run status - Enterprise only
     * @param runId - The enterprise run ID
     */
    getRunStatus: async (runId: string) => {
      const result = await getAutomationRunStatus(runId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get run status');
      }
      return result.data;
    },
  },

  /**
   * Workflow Operations
   */
  workflow: {
    /**
     * Analyze a script to extract workflow steps
     * @param scriptContent - The script content to analyze
     */
    analyzeWorkflow: async (scriptContent: string) => {
      const result = await analyzeAutomationWorkflow(scriptContent);
      if (!result.success) {
        throw new Error(result.error || 'Failed to analyze workflow');
      }
      return result.data;
    },
  },
};
