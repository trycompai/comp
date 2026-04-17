import { Logger } from '@nestjs/common';
import type { AzureApiStep } from './azure-ai-remediation.prompt';

const logger = new Logger('AzureCommandExecutor');

const MAX_STEP_RETRIES = 3;
const MAX_POLL_MS = 120_000;

export interface AzureStepResult {
  step: AzureApiStep;
  success: boolean;
  statusCode?: number;
  response?: unknown;
  error?: string;
}

export interface AzureExecutionResult {
  results: AzureStepResult[];
  error?: {
    stepIndex: number;
    step: AzureApiStep;
    message: string;
  };
}

/**
 * Execute Azure ARM API steps sequentially with full self-healing:
 * - Auto-registers missing resource providers
 * - Retries on throttling (429) and server errors (5xx)
 * - Waits for resources still provisioning
 * - Auto-rolls back on partial failure
 */
export async function executeAzurePlanSteps(params: {
  steps: AzureApiStep[];
  accessToken: string;
  autoRollbackSteps?: AzureApiStep[];
  isRollback?: boolean;
}): Promise<AzureExecutionResult> {
  const { steps, accessToken, autoRollbackSteps, isRollback } = params;

  // Validate ALL step URLs before executing any — prevents SSRF on read/fix/rollback steps
  const allSteps = [...steps, ...(autoRollbackSteps ?? [])];
  const validationErrors = validateAzurePlanSteps(allSteps);
  if (validationErrors.length > 0) {
    return {
      results: [],
      error: {
        stepIndex: 0,
        step: steps[0] ?? allSteps[0],
        message: `URL validation failed: ${validationErrors.join('; ')}`,
      },
    };
  }

  const results: AzureStepResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const result = await executeWithRetry(step, accessToken, isRollback);
    results.push(result);

    if (!result.success) {
      // Auto-rollback completed steps
      if (autoRollbackSteps && i > 0) {
        logger.warn(
          `Step ${i} failed, auto-rolling back ${Math.min(i, autoRollbackSteps.length)} steps`,
        );
        for (let r = Math.min(i, autoRollbackSteps.length) - 1; r >= 0; r--) {
          const rollbackStep = autoRollbackSteps[r];
          if (!rollbackStep) continue;
          try {
            await executeWithRetry(rollbackStep, accessToken, true);
            logger.log(`Rollback step ${r} succeeded`);
          } catch (err) {
            logger.warn(
              `Rollback step ${r} failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      return {
        results,
        error: {
          stepIndex: i,
          step,
          message:
            result.error || `Step ${i} failed with status ${result.statusCode}`,
        },
      };
    }
  }

  return { results };
}

/**
 * Execute a single API call with up to MAX_STEP_RETRIES attempts.
 * Each retry auto-heals the specific error before retrying.
 */
async function executeWithRetry(
  step: AzureApiStep,
  accessToken: string,
  isRollback?: boolean,
): Promise<AzureStepResult> {
  // Safety: block DELETE unless rolling back
  if (step.method === 'DELETE' && !isRollback) {
    return {
      step,
      success: false,
      error: 'DELETE only allowed during rollback.',
    };
  }

  for (let attempt = 0; attempt < MAX_STEP_RETRIES; attempt++) {
    const result = await executeOnce(step, accessToken);

    if (result.success) return result;

    const err = result.error ?? '';
    const code = result.statusCode ?? 0;
    const canRetry = attempt < MAX_STEP_RETRIES - 1;

    // --- Self-healing by error type ---

    // 429 Throttled → wait and retry
    if (code === 429 && canRetry) {
      const delay = 3000 * (attempt + 1);
      logger.warn(
        `Throttled (429), waiting ${delay}ms before retry ${attempt + 1}`,
      );
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    // 5xx Server error → wait and retry
    if (code >= 500 && canRetry) {
      logger.warn(`Server error (${code}), retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    // Missing resource provider → register and retry
    // Azure returns this as 409 MissingSubscriptionRegistration OR InvalidAuthenticationToken with "register"
    const isProviderMissing =
      (code === 409 || code === 401) &&
      (err.includes('MissingSubscriptionRegistration') ||
        err.includes('Please register the subscription') ||
        err.includes('not registered to use namespace'));
    if (isProviderMissing && canRetry) {
      const providerMatch =
        err.match(/namespace '(Microsoft\.\w+)'/) ||
        err.match(/with (Microsoft\.\w+)/);
      if (providerMatch) {
        await registerProvider(accessToken, step.url, providerMatch[1]);
        continue;
      }
    }

    // 409 Resource provisioning → wait and retry
    if (
      code === 409 &&
      (err.includes('provisioning state') ||
        err.includes('Creating') ||
        err.includes('Updating')) &&
      canRetry
    ) {
      logger.warn('Resource still provisioning, waiting 10s...');
      await new Promise((r) => setTimeout(r, 10_000));
      continue;
    }

    // 409 Conflict "already exists" on write → treat as success
    if (
      code === 409 &&
      step.method !== 'GET' &&
      (err.includes('already exists') || err.includes('AlreadyExists'))
    ) {
      return {
        step,
        success: true,
        statusCode: 409,
        response: { note: 'Already exists' },
      };
    }

    // 409 Soft-deleted → can't auto-heal, return clear error
    if (
      code === 409 &&
      (err.includes('soft-delete') || err.includes('SoftDeleted'))
    ) {
      return {
        step,
        success: false,
        statusCode: 409,
        error: `Name blocked by soft-deleted resource. ${err.slice(0, 200)}`,
      };
    }

    // 404 on GET → valid (resource doesn't exist)
    if (code === 404 && step.method === 'GET') {
      return { step, success: true, statusCode: 404, response: null };
    }

    // 401 → token expired (but NOT if it's a provider registration issue — those are handled above)
    if (code === 401 && !err.includes('register the subscription')) {
      return {
        step,
        success: false,
        statusCode: 401,
        error: 'Access token expired. Reconnect the integration.',
      };
    }

    // 403 → permission denied, return for higher-level self-healing
    if (code === 403) {
      return result;
    }

    // 400 Bad Request → can't self-heal at this level
    if (code === 400) {
      return result;
    }

    // Unknown error on last attempt → return as-is
    return result;
  }

  return { step, success: false, error: 'Max retries exceeded' };
}

/** Execute a single HTTP call and return the result. */
async function executeOnce(
  step: AzureApiStep,
  accessToken: string,
): Promise<AzureStepResult> {
  const url = new URL(step.url);
  if (step.queryParams) {
    for (const [key, value] of Object.entries(step.queryParams)) {
      url.searchParams.set(key, value);
    }
  }

  logger.log(`${step.method} ${url.pathname} — ${step.purpose}`);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: step.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: step.body ? JSON.stringify(step.body) : undefined,
    });
  } catch (err) {
    return {
      step,
      success: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 202 Accepted → poll async operation
  if (response.status === 202) {
    const pollUrl =
      response.headers.get('Azure-AsyncOperation') ||
      response.headers.get('Location');
    if (pollUrl) {
      // Validate poll URL to prevent SSRF via response headers
      try {
        const parsedPoll = new URL(pollUrl);
        if (!AZURE_ALLOWED_HOSTS.has(parsedPoll.hostname)) {
          return {
            step,
            success: false,
            error: `Async poll URL targets disallowed host: ${parsedPoll.hostname}`,
          };
        }
      } catch {
        return { step, success: false, error: 'Async poll URL is malformed' };
      }
      try {
        const finalResult = await pollAsyncOperation(pollUrl, accessToken);
        if (finalResult === null) {
          return {
            step,
            success: false,
            error: 'Async operation timed out or failed to poll',
          };
        }
        return { step, success: true, statusCode: 200, response: finalResult };
      } catch (pollErr) {
        return {
          step,
          success: false,
          error: `Async operation failed: ${pollErr instanceof Error ? pollErr.message : String(pollErr)}`,
        };
      }
    }
    return { step, success: true, statusCode: 202, response: null };
  }

  // 204 No Content
  if (response.status === 204) {
    return { step, success: true, statusCode: 204, response: null };
  }

  // Success
  if (response.ok) {
    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawBody: text };
      }
    }
    return { step, success: true, statusCode: response.status, response: data };
  }

  // Error — read body for diagnostics
  const errorText = await response.text();
  if (response.status === 409) {
    logger.warn(
      `409 for ${step.method} ${url.pathname}: ${errorText.slice(0, 300)}`,
    );
  }

  return {
    step,
    success: false,
    statusCode: response.status,
    error: errorText,
  };
}

// ─── Resource Provider Registration ────────────────────────────────────────

async function registerProvider(
  accessToken: string,
  stepUrl: string,
  providerNamespace: string,
): Promise<void> {
  const subMatch = stepUrl.match(/\/subscriptions\/([^/]+)/);
  if (!subMatch) return;

  logger.log(`Auto-registering provider: ${providerNamespace}`);
  try {
    const resp = await fetch(
      `https://management.azure.com/subscriptions/${subMatch[1]}/providers/${providerNamespace}/register?api-version=2021-04-01`,
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (resp.ok) {
      logger.log(
        `Provider ${providerNamespace} registered — waiting 15s for propagation`,
      );
      await new Promise((r) => setTimeout(r, 15_000));
    } else {
      logger.warn(`Failed to register ${providerNamespace}: ${resp.status}`);
    }
  } catch (err) {
    logger.warn(
      `Provider registration error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ─── Async Operation Polling ───────────────────────────────────────────────

async function pollAsyncOperation(
  pollUrl: string,
  accessToken: string,
): Promise<unknown> {
  const startTime = Date.now();
  let interval = 2000;

  while (Date.now() - startTime < MAX_POLL_MS) {
    await new Promise((r) => setTimeout(r, interval));
    interval = Math.min(interval * 1.5, 10_000);

    const resp = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      logger.warn(`Async poll failed: ${resp.status}`);
      return null;
    }

    const data = (await resp.json()) as Record<string, unknown>;
    const status = (data.status as string)?.toLowerCase();

    if (status === 'succeeded' || status === 'completed') {
      return data;
    }
    if (
      status === 'failed' ||
      status === 'canceled' ||
      status === 'cancelled'
    ) {
      const error = data.error as Record<string, unknown> | undefined;
      throw new Error(
        `Async operation ${status}: ${(error?.message as string) ?? 'unknown'}`,
      );
    }
  }

  logger.warn(`Async operation timed out after ${MAX_POLL_MS}ms`);
  return null;
}

/**
 * Validate Azure API steps for safety.
 */
const AZURE_ALLOWED_HOSTS = new Set([
  'management.azure.com',
  'graph.microsoft.com',
]);

export function validateAzurePlanSteps(steps: AzureApiStep[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step.url) {
      errors.push(`Step ${i}: URL is required`);
      continue;
    }
    if (!step.method) errors.push(`Step ${i}: method is required`);
    try {
      const parsed = new URL(step.url);
      if (parsed.protocol !== 'https:') {
        errors.push(`Step ${i}: URL must use HTTPS`);
      }
      if (!AZURE_ALLOWED_HOSTS.has(parsed.hostname)) {
        errors.push(`Step ${i}: URL must target Azure Management or Graph API`);
      }
    } catch {
      errors.push(`Step ${i}: URL must be a valid absolute URL`);
    }
    if (
      step.method === 'DELETE' &&
      step.url?.match(/\/subscriptions\/[^/]+$/)
    ) {
      errors.push(`Step ${i}: Cannot delete a subscription`);
    }
    if (
      step.method !== 'GET' &&
      step.url?.includes('/providers/Microsoft.Authorization/roleDefinitions/')
    ) {
      errors.push(`Step ${i}: Cannot modify built-in role definitions`);
    }
  }
  return errors;
}
