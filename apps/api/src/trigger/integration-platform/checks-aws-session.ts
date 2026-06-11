import { logger } from '@trigger.dev/sdk';
import type { IntegrationCredentialValues } from './ensure-valid-credentials';

const RESOLVE_SESSION_TIMEOUT_MS = 30_000;

type ResolveSessionResponse =
  | {
      ok: true;
      session: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken: string;
      };
    }
  | { ok: false; reason: 'not_configured' }
  | { ok: false; reason: 'assume_failed'; error?: string };

/**
 * Credential keys injected by {@link injectAwsResolvedSession} and consumed by
 * the AWS manifest checks (`assumeAwsSession` in the integration-platform
 * package). Underscore-prefixed so they never collide with real AWS connection
 * credential fields (roleArn, externalId, regions, awsType, remediationRoleArn).
 */
export const RESOLVED_AWS_SESSION_KEYS = {
  accessKeyId: '__resolvedAccessKeyId',
  secretAccessKey: '__resolvedSecretAccessKey',
  sessionToken: '__resolvedSessionToken',
  error: '__resolvedSessionError',
} as const;

/**
 * For AWS connections, resolve the cross-account session in ECS (which holds the
 * roleAssumer task role + `SECURITY_HUB_ROLE_ASSUMER_ARN`) and inject the
 * resulting short-lived, customer-scoped credentials into `credentials`.
 *
 * Why: the Cloud Tests CHECK path runs inside the Trigger.dev runtime, which has
 * no base AWS credentials or roleAssumer ARN, so it cannot perform the two-hop
 * assume itself. Resolving in ECS keeps the cross-tenant master credential out
 * of Trigger.dev; the check just consumes the temp creds.
 *
 * On a genuine assume failure (or any transport error) an error marker is
 * injected so the AWS check surfaces a real "Could not assume AWS role" finding
 * with the true reason, rather than silently failing or falsely passing.
 * Non-AWS providers and not-configured connections are left untouched.
 *
 * Mutates and returns the same credentials object.
 */
export async function injectAwsResolvedSession(params: {
  credentials: IntegrationCredentialValues;
  apiUrl: string;
  connectionId: string;
  organizationId: string;
  providerSlug: string;
}): Promise<IntegrationCredentialValues> {
  const { credentials, apiUrl, connectionId, organizationId, providerSlug } =
    params;

  if (providerSlug !== 'aws') return credentials;

  const serviceToken = process.env.SERVICE_TOKEN_TRIGGER;
  if (!serviceToken) {
    credentials[RESOLVED_AWS_SESSION_KEYS.error] =
      'SERVICE_TOKEN_TRIGGER is not configured';
    return credentials;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    RESOLVE_SESSION_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `${apiUrl}/v1/cloud-security/resolve-session/${connectionId}`,
      {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': serviceToken,
          'x-organization-id': organizationId,
        },
      },
    );

    if (!response.ok) {
      credentials[RESOLVED_AWS_SESSION_KEYS.error] =
        `Could not resolve AWS session (status ${response.status}).`;
      return credentials;
    }

    const result = (await response.json()) as ResolveSessionResponse;

    if (result.ok) {
      credentials[RESOLVED_AWS_SESSION_KEYS.accessKeyId] =
        result.session.accessKeyId;
      credentials[RESOLVED_AWS_SESSION_KEYS.secretAccessKey] =
        result.session.secretAccessKey;
      credentials[RESOLVED_AWS_SESSION_KEYS.sessionToken] =
        result.session.sessionToken;
      logger.info('Resolved AWS session via ECS for connection', {
        connectionId,
      });
      return credentials;
    }

    if (result.reason === 'assume_failed') {
      credentials[RESOLVED_AWS_SESSION_KEYS.error] =
        result.error || 'The cross-account IAM role could not be assumed.';
    }
    // not_configured -> inject nothing; the check no-ops naturally.
    return credentials;
  } catch (error) {
    credentials[RESOLVED_AWS_SESSION_KEYS.error] = abortController.signal
      .aborted
      ? `Timed out resolving AWS session after ${RESOLVE_SESSION_TIMEOUT_MS}ms.`
      : error instanceof Error
        ? error.message
        : String(error);
    return credentials;
  } finally {
    clearTimeout(timeoutId);
  }
}
