import { z } from 'zod';

const responseSchema = z
  .object({
    success: z.boolean(),
    data: z.unknown().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export class EnterpriseApiError extends Error {}

export function getEnterpriseConfig() {
  const enterpriseApiUrl = process.env.NEXT_PUBLIC_ENTERPRISE_API_URL || 'http://localhost:3006';
  const enterpriseApiKey = process.env.ENTERPRISE_API_SECRET;
  if (!enterpriseApiKey) {
    throw new EnterpriseApiError(
      'Task automations require an enterprise license. Please contact sales@trycomp.ai to learn more.',
    );
  }
  return { enterpriseApiUrl, enterpriseApiKey };
}

export async function callEnterpriseApi({
  endpoint,
  method = 'GET',
  body,
  params,
}: {
  endpoint: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  params?: Record<string, string>;
}): Promise<unknown> {
  const { enterpriseApiUrl, enterpriseApiKey } = getEnterpriseConfig();
  const baseUrl = new URL(enterpriseApiUrl);
  const url = new URL(endpoint, baseUrl);
  if (url.origin !== baseUrl.origin)
    throw new EnterpriseApiError('Invalid enterprise API endpoint');
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.append(key, value);

  const response = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-secret': enterpriseApiKey },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Never forward the shared credential to a redirect destination.
    redirect: 'error',
  });
  if (!response.ok) throw new EnterpriseApiError(`API request failed: ${response.status}`);
  const responseBody: unknown = await response.json();
  // Some enterprise routes return raw data (e.g. a Trigger run), while others
  // wrap it in { success, data }. Preserve both contracts and fail explicit errors.
  if (!responseBody || typeof responseBody !== 'object' || !('success' in responseBody)) {
    return responseBody;
  }
  const result = responseSchema.parse(responseBody);
  if (!result.success)
    throw new EnterpriseApiError(result.error || result.message || 'API request failed');
  return result.data ?? result;
}

export function automationFailure(error: unknown) {
  // Validation details and transport internals are not exposed to RPC callers.
  return {
    success: false as const,
    error:
      error instanceof EnterpriseApiError ||
      (error instanceof Error && error.message === 'Unauthorized')
        ? error.message
        : 'Failed to process automation request',
  };
}
