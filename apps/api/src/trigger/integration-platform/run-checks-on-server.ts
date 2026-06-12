import type { runAllChecks } from '@trycompai/integration-platform';

export type RunAllChecksResult = Awaited<ReturnType<typeof runAllChecks>>;

/**
 * Run a connection's checks ON OUR SERVER (ECS) and return the raw result.
 *
 * Used by the AWS Trigger tasks only: AWS S3 calls made from the Trigger.dev
 * runtime egress Trigger.dev's VPC, whose endpoint policy blocks our
 * cross-account reads. Running them on our server egresses our own VPC (where
 * the endpoint allows the read) — matching the in-app manual "Run". The caller
 * still persists the returned result, so AWS runs are recorded exactly like
 * every other provider's.
 *
 * Pass `checkId` to run a single check (scheduled path); omit it to run all of
 * the connection's checks (auto-run-after-connect path).
 *
 * Throws on a transport failure (endpoint unreachable / non-2xx) so the caller's
 * existing try/catch handles it (the task fails and the orchestrator retries).
 * Per-check execution errors come back inside the result as usual.
 */
export async function runChecksOnServer(params: {
  apiUrl: string;
  connectionId: string;
  organizationId: string;
  checkId?: string;
}): Promise<RunAllChecksResult> {
  const { apiUrl, connectionId, organizationId, checkId } = params;

  const serviceToken = process.env.SERVICE_TOKEN_TRIGGER;
  if (!serviceToken) {
    throw new Error('SERVICE_TOKEN_TRIGGER is not configured');
  }

  const response = await fetch(
    `${apiUrl}/v1/integrations/internal/run-connection-checks/${connectionId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-token': serviceToken,
        'x-organization-id': organizationId,
      },
      body: JSON.stringify(checkId ? { checkId } : {}),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      (errorData as { message?: string }).message ||
      `Server-side check run failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as RunAllChecksResult;
}
