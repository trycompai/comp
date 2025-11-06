'use server';

import { db } from '@db';
/**
 * Server actions for task automation
 * These actions securely call the enterprise API with server-side license key
 */

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

interface EnterpriseApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class EnterpriseApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'EnterpriseApiError';
  }
}

/**
 * Get enterprise API configuration
 */
function getEnterpriseConfig() {
  const enterpriseApiUrl = process.env.NEXT_PUBLIC_ENTERPRISE_API_URL || 'http://localhost:3006';
  const enterpriseApiKey = process.env.ENTERPRISE_API_SECRET;

  if (!enterpriseApiKey) {
    throw new Error('Not authorized to access enterprise API');
  }

  return { enterpriseApiUrl, enterpriseApiKey };
}

/**
 * Make authenticated request to enterprise API
 */
async function callEnterpriseApi<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    body?: any;
    params?: Record<string, string>;
  } = {},
): Promise<T> {
  const { enterpriseApiUrl, enterpriseApiKey } = getEnterpriseConfig();

  const url = new URL(endpoint, enterpriseApiUrl);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  console.log('url', url.toString());

  const method = options.method || 'GET';

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': enterpriseApiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `API request failed: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {}
    throw new EnterpriseApiError(errorMessage, response.status);
  }

  const result: EnterpriseApiResponse<T> = await response.json();

  if (!result.success && result.error) {
    throw new EnterpriseApiError(result.error);
  }

  return result.data || (result as T);
}

/**
 * Revalidate current path
 */
async function revalidateCurrentPath() {
  const headersList = await headers();
  let path = headersList.get('x-pathname') || headersList.get('referer') || '';
  path = path.replace(/\/[a-z]{2}\//, '/');
  revalidatePath(path);
}

/**
 * Upload automation script
 */
export async function uploadAutomationScript(data: {
  orgId: string;
  taskId: string;
  content: string;
  type?: string;
}) {
  try {
    const result = await callEnterpriseApi('/api/tasks-automations/s3/upload', {
      method: 'POST',
      body: data,
    });

    await revalidateCurrentPath();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof EnterpriseApiError ? error.message : 'Failed to upload script',
    };
  }
}

/**
 * Get automation script
 */
export async function getAutomationScript(key: string) {
  try {
    const result = await callEnterpriseApi('/api/tasks-automations/s3/get', {
      params: { key },
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof EnterpriseApiError ? error.message : 'Failed to get script',
    };
  }
}

/**
 * List automation scripts
 */
export async function listAutomationScripts(orgId: string) {
  try {
    const result = await callEnterpriseApi('/api/tasks-automations/s3/list', {
      params: { orgId },
    });

    return { success: true, data: result };
  } catch (error) {
    const typedError = error as EnterpriseApiError;

    if (typedError.status === 401) {
      return {
        success: false,
        error: 'Unauthorized. Please contact your administrator.',
      };
    }

    if (typedError.status === 404) {
      return {
        success: false,
        error: 'Files not found.',
      };
    }

    return {
      success: false,
      error: error instanceof EnterpriseApiError ? error.message : 'Failed to list scripts',
    };
  }
}

/**
 * Execute automation script
 */
export async function executeAutomationScript(data: {
  orgId: string;
  taskId: string;
  automationId: string;
  version?: number; // Optional: test specific version
}) {
  try {
    const result = await callEnterpriseApi('/api/tasks-automations/trigger/execute', {
      method: 'POST',
      body: data,
    });

    // Don't revalidate - causes page refresh. Test results are handled via polling/state.
    return { success: true, data: result };
  } catch (error) {
    const typedError = error as EnterpriseApiError;

    if (typedError.status === 401) {
      return {
        success: false,
        error: 'Unauthorized. Please contact your administrator.',
      };
    }

    return {
      success: false,
      error: error instanceof EnterpriseApiError ? error.message : 'Failed to execute script',
    };
  }
}

/**
 * Analyze workflow
 */
export async function analyzeAutomationWorkflow(scriptContent: string) {
  try {
    const result = await callEnterpriseApi('/api/tasks-automations/workflow/analyze', {
      method: 'POST',
      body: { scriptContent },
    });

    return { success: true, data: result };
  } catch (error) {
    const typedError = error as EnterpriseApiError;

    if (typedError.status === 401) {
      return {
        success: false,
        error: 'Unauthorized. Please contact your administrator.',
      };
    }

    return {
      success: false,
      error: error instanceof EnterpriseApiError ? error.message : 'Failed to analyze workflow',
    };
  }
}

export const getAutomationRunStatus = async (runId: string) => {
  try {
    const result = await callEnterpriseApi('/api/tasks-automations/runs/${runId}', {
      params: { runId },
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const typedError = error as EnterpriseApiError;

    if (typedError.status === 401) {
      return {
        success: false,
        error: 'Unauthorized. Please contact your administrator.',
      };
    }

    return {
      success: false,
      error: error instanceof EnterpriseApiError ? error.message : 'Failed to get run status',
    };
  }
};

/**
 * Load chat history for an automation
 */
export async function loadChatHistory(automationId: string, offset = 0, limit = 50) {
  try {
    const response = await callEnterpriseApi<{
      messages: any[];
      total: number;
      hasMore: boolean;
    }>('/api/tasks-automations/chat/history', {
      method: 'GET',
      params: {
        automationId,
        offset: offset.toString(),
        limit: limit.toString(),
      },
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('[loadChatHistory] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load chat history',
    };
  }
}

/**
 * Save chat history for an automation
 */
export async function saveChatHistory(automationId: string, messages: any[]) {
  try {
    await callEnterpriseApi('/api/tasks-automations/chat/save', {
      method: 'POST',
      body: {
        automationId,
        messages,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('[saveChatHistory] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save chat history',
    };
  }
}

/**
 * Publish current draft as a new version
 */
export async function publishAutomation(
  orgId: string,
  taskId: string,
  automationId: string,
  changelog?: string,
) {
  try {
    // Call enterprise API to copy draft → versioned S3 key
    const response = await callEnterpriseApi<{
      success: boolean;
      version: number;
      scriptKey: string;
    }>('/api/tasks-automations/publish', {
      method: 'POST',
      body: {
        orgId,
        taskId,
        automationId,
      },
    });

    if (!response.success) {
      throw new Error('Enterprise API failed to publish');
    }

    // Save version record to database
    const version = await db.evidenceAutomationVersion.create({
      data: {
        evidenceAutomationId: automationId,
        version: response.version,
        scriptKey: response.scriptKey,
        changelog,
      },
    });

    // Enable automation if not already enabled
    await db.evidenceAutomation.update({
      where: { id: automationId },
      data: { isEnabled: true },
    });

    return {
      success: true,
      version,
    };
  } catch (error) {
    console.error('[publishAutomation] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish automation',
    };
  }
}

/**
 * Restore a version to draft
 */
export async function restoreVersion(
  orgId: string,
  taskId: string,
  automationId: string,
  version: number,
) {
  try {
    const response = await callEnterpriseApi<{ success: boolean }>(
      '/api/tasks-automations/restore-version',
      {
        method: 'POST',
        body: {
          orgId,
          taskId,
          automationId,
          version,
        },
      },
    );

    if (!response.success) {
      throw new Error('Enterprise API failed to restore version');
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('[restoreVersion] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore version',
    };
  }
}

/**
 * Update evaluation criteria for an automation
 */
export async function updateEvaluationCriteria(automationId: string, evaluationCriteria: string) {
  try {
    await db.evidenceAutomation.update({
      where: { id: automationId },
      data: { evaluationCriteria },
    });

    await revalidateCurrentPath();

    return {
      success: true,
    };
  } catch (error) {
    console.error('[updateEvaluationCriteria] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update evaluation criteria',
    };
  }
}

/**
 * Toggle automation enabled state
 */
export async function toggleAutomationEnabled(automationId: string, isEnabled: boolean) {
  try {
    await db.evidenceAutomation.update({
      where: { id: automationId },
      data: { isEnabled },
    });

    await revalidateCurrentPath();

    return {
      success: true,
    };
  } catch (error) {
    console.error('[toggleAutomationEnabled] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle automation',
    };
  }
}
