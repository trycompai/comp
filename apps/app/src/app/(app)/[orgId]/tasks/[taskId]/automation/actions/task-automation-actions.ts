'use server';

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

  return { enterpriseApiUrl };
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
  const { enterpriseApiUrl } = getEnterpriseConfig();

  const url = new URL(endpoint, enterpriseApiUrl);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const method = options.method || 'GET';

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
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
  sandboxId?: string;
}) {
  try {
    const result = await callEnterpriseApi('/api/tasks-automations/trigger/execute', {
      method: 'POST',
      body: data,
    });

    await revalidateCurrentPath();
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
