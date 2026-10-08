import type { CheckContext } from '../../types';

export const MAPLE_US_API_URL = 'https://api.maple.dev';
export const MAPLE_EU_API_URL = 'https://api.eu.maple.dev';

const MAX_PAGES = 50;

const credString = (credentials: CheckContext['credentials'], key: string): string => {
  const value = credentials[key];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

/**
 * Resolves the Maple API host for this connection: an explicit self-hosted URL wins,
 * otherwise the Maple Cloud region. Returns null when the self-hosted URL is not HTTPS.
 */
export function resolveMapleBaseUrl(credentials: CheckContext['credentials']): string | null {
  const custom = credString(credentials, 'base_url').trim();
  if (custom) {
    if (!custom.startsWith('https://')) return null;
    return custom.replace(/\/+$/, '');
  }
  return credString(credentials, 'region') === 'eu' ? MAPLE_EU_API_URL : MAPLE_US_API_URL;
}

/** Reports the misconfigured self-hosted URL and returns null, or returns the base URL */
export function requireMapleBaseUrl(ctx: CheckContext): string | null {
  const baseUrl = resolveMapleBaseUrl(ctx.credentials);
  if (baseUrl) return baseUrl;
  ctx.fail({
    title: 'Self-hosted Maple URL must use HTTPS',
    resourceType: 'maple',
    resourceId: 'connection',
    severity: 'high',
    description: 'The self-hosted API URL on this connection does not start with https://.',
    remediation:
      'Reconnect Maple and enter an https:// API URL, or leave the field empty to use Maple Cloud.',
    evidence: { baseUrl: credString(ctx.credentials, 'base_url') },
  });
  return null;
}

/** Fetches every page of a Maple v2 list endpoint */
export function listAll<T>(
  ctx: CheckContext,
  { baseUrl, path, params }: { baseUrl: string; path: string; params?: Record<string, string> },
): Promise<T[]> {
  return ctx.fetchWithCursor<T>(path, {
    baseUrl,
    params: { limit: '100', ...params },
    cursorParam: 'cursor',
    cursorPath: 'next_cursor',
    dataPath: 'data',
    maxPages: MAX_PAGES,
  });
}

const statusOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
};

/** Reports a failed Maple API read with a remediation matched to the HTTP status */
export function failMapleRequest(
  ctx: CheckContext,
  { error, resource, scope }: { error: unknown; resource: string; scope: string },
): void {
  const message = error instanceof Error ? error.message : String(error);
  const status = statusOf(error);

  const remediation =
    status === 401
      ? 'The API key is invalid, expired, or revoked. Create a new key in Maple under Settings → API Keys and reconnect.'
      : status === 403
        ? `The API key is missing the "${scope}" scope. Create a key that includes it in Maple under Settings → API Keys and reconnect.`
        : 'Maple could not be reached. Re-run the check; if it keeps failing, contact Maple support with the error below.';

  ctx.fail({
    title: `Could not read Maple ${resource}`,
    resourceType: 'maple',
    resourceId: resource,
    severity: 'high',
    description:
      status === 401 || status === 403
        ? `Maple rejected the request for ${resource}.`
        : `The request for ${resource} failed.`,
    remediation,
    evidence: { error: message, status: status ?? null, requiredScope: scope },
  });
}

export const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / 86_400_000);
