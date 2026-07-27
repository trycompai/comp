export interface OAuthRefreshFailure {
  status?: number;
  errorBody?: string;
}

interface ParsedOAuthError {
  error?: string;
  errorDescription?: string;
  errorSubtype?: string;
}

const TERMINAL_HTTP_STATUSES = new Set([400, 401, 403]);
const RETRYABLE_OAUTH_ERRORS = new Set([
  'temporarily_unavailable',
  'server_error',
]);

function getStringField(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  const field = value[key];
  return typeof field === 'string' && field.trim().length > 0
    ? field.trim()
    : undefined;
}

function parseJsonOAuthError(errorBody: string): ParsedOAuthError | null {
  try {
    const parsed: unknown = JSON.parse(errorBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const body = parsed as Record<string, unknown>;
    return {
      error: getStringField(body, 'error'),
      errorDescription: getStringField(body, 'error_description'),
      errorSubtype: getStringField(body, 'error_subtype'),
    };
  } catch {
    return null;
  }
}

function parseFormOAuthError(errorBody: string): ParsedOAuthError {
  const params = new URLSearchParams(errorBody);
  return {
    error: params.get('error') ?? undefined,
    errorDescription: params.get('error_description') ?? undefined,
    errorSubtype: params.get('error_subtype') ?? undefined,
  };
}

export function parseOAuthRefreshError(
  errorBody?: string,
): ParsedOAuthError {
  if (!errorBody) {
    return {};
  }

  return parseJsonOAuthError(errorBody) ?? parseFormOAuthError(errorBody);
}

export function isTerminalOAuthRefreshFailure(
  failure: OAuthRefreshFailure,
): boolean {
  if (!failure.status || !TERMINAL_HTTP_STATUSES.has(failure.status)) {
    return false;
  }

  const parsed = parseOAuthRefreshError(failure.errorBody);
  if (parsed.error && RETRYABLE_OAUTH_ERRORS.has(parsed.error)) {
    return false;
  }

  return true;
}

export function buildOAuthRefreshErrorMessage(params: {
  providerHost?: string;
  failure: OAuthRefreshFailure;
}): string {
  const parsed = parseOAuthRefreshError(params.failure.errorBody);
  const provider = params.providerHost === 'oauth2.googleapis.com'
    ? 'Google'
    : 'OAuth provider';
  const suffix =
    parsed.errorDescription && parsed.errorDescription !== parsed.error
      ? ` ${parsed.errorDescription}`
      : '';

  if (parsed.errorSubtype === 'invalid_rapt') {
    return `${provider} requires user reauthentication because of session-control policy (invalid_rapt). Please reconnect the integration.`;
  }

  if (parsed.error === 'invalid_grant') {
    return `${provider} rejected the OAuth refresh token (invalid_grant). Please reconnect the integration.${suffix}`;
  }

  if (parsed.error === 'admin_policy_enforced') {
    return `${provider} admin policy blocked one or more requested OAuth scopes. Update OAuth app access policy, then reconnect.${suffix}`;
  }

  if (parsed.error === 'unauthorized_client') {
    return `${provider} OAuth client is not authorized for refresh tokens. Check OAuth app configuration, then reconnect.${suffix}`;
  }

  if (parsed.error === 'invalid_client') {
    return `${provider} OAuth client credentials were rejected. Check the client ID and secret before reconnecting.${suffix}`;
  }

  if (parsed.error === 'invalid_scope') {
    return `${provider} rejected the requested OAuth scopes. Check the integration OAuth scope configuration before reconnecting.${suffix}`;
  }

  if (parsed.error) {
    return `${provider} token refresh failed with ${parsed.error}. Please reconnect the integration.${suffix}`;
  }

  return `${provider} token refresh failed with HTTP ${params.failure.status ?? 'unknown'}. Please reconnect the integration.`;
}
