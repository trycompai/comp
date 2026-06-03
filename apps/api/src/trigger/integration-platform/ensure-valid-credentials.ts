export type IntegrationCredentialValues = Record<string, string | string[]>;

export interface ValidCredentialsResult {
  success: boolean;
  credentials?: IntegrationCredentialValues;
  error?: string;
  status?: number;
}

const VALID_CREDENTIALS_REQUEST_TIMEOUT_MS = 30_000;

function getErrorMessage(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
}

function isAbortError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

export function getAccessToken(
  credentials: IntegrationCredentialValues,
): string | undefined {
  const value = credentials.access_token;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function requestValidCredentials(params: {
  apiUrl: string;
  connectionId: string;
  organizationId: string;
  forceRefresh?: boolean;
}): Promise<ValidCredentialsResult> {
  const serviceToken = process.env.SERVICE_TOKEN_TRIGGER;
  if (!serviceToken) {
    return {
      success: false,
      error: 'SERVICE_TOKEN_TRIGGER is not configured',
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, VALID_CREDENTIALS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${params.apiUrl}/v1/integrations/connections/${params.connectionId}/ensure-valid-credentials`,
      {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': serviceToken,
          'x-organization-id': params.organizationId,
        },
        body: JSON.stringify({ forceRefresh: params.forceRefresh === true }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        status: response.status,
        error:
          getErrorMessage(errorData) ||
          `Failed to get valid credentials: ${response.status}`,
      };
    }

    const result = (await response.json()) as {
      success: boolean;
      credentials?: IntegrationCredentialValues;
    };

    if (!result.success || !result.credentials) {
      return {
        success: false,
        error: 'Valid credentials response did not include credentials',
      };
    }

    return {
      success: true,
      credentials: result.credentials,
    };
  } catch (error) {
    if (isAbortError(error) || abortController.signal.aborted) {
      return {
        success: false,
        error: `Timed out after ${VALID_CREDENTIALS_REQUEST_TIMEOUT_MS}ms while requesting valid credentials`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
