import type { CheckContext } from '../../types';
import {
  DEFAULT_BACKUP_API_BASE_URL,
  type Msp360LoginResponse,
} from './types';

export function credString(ctx: CheckContext, key: string, fallback = ''): string {
  const value = ctx.credentials[key];
  if (Array.isArray(value)) {
    return String(value[0] ?? fallback);
  }
  if (value == null || value === '') {
    return fallback;
  }
  return String(value);
}

export function backupBaseUrl(ctx: CheckContext): string {
  return credString(ctx, 'baseUrl', DEFAULT_BACKUP_API_BASE_URL).replace(/\/$/, '');
}

export function extractAccessToken(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    const trimmed = payload.trim().replace(/^"|"$/g, '');
    return trimmed || null;
  }
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.access_token,
    record.accessToken,
    record.AccessToken,
    record.token,
    record.Token,
    record.providerSessionToken,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

export function bearerHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Custom auth does not attach a Bearer token. Login, then pass Authorization on every call.
 */
export async function loginBackup(ctx: CheckContext): Promise<{
  token: string;
  baseUrl: string;
} | null> {
  const username = credString(ctx, 'username');
  const password = credString(ctx, 'password');
  const baseUrl = backupBaseUrl(ctx);

  if (!username || !password) {
    ctx.fail({
      title: 'Missing MSP360 Backup credentials',
      description:
        'Provider Login needs a username and password (Management Console → Settings → General → API).',
      resourceType: 'connection',
      resourceId: 'msp360-backup',
      severity: 'high',
      remediation:
        'Reconnect MSP360 Backup and enter the Managed Backup API username and password. Do not use an RMM token here.',
    });
    return null;
  }

  try {
    const response = await ctx.post<Msp360LoginResponse | string>(
      '/api/Provider/Login',
      { UserName: username, Password: password },
      { baseUrl },
    );
    const token = extractAccessToken(response);
    if (!token) {
      ctx.fail({
        title: 'MSP360 Backup login did not return a token',
        description: 'POST /api/Provider/Login succeeded but no access token was found in the response.',
        resourceType: 'connection',
        resourceId: 'msp360-backup',
        severity: 'high',
        remediation:
          'Confirm the API user can log in at api.mspbackups.com and that the account is not locked.',
        evidence: { responseType: typeof response },
      });
      return null;
    }
    return { token, baseUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.fail({
      title: 'MSP360 Backup login failed',
      description: 'Could not authenticate with POST /api/Provider/Login.',
      resourceType: 'connection',
      resourceId: 'msp360-backup',
      severity: 'high',
      remediation:
        'Check username/password, API access, and base URL (default https://api.mspbackups.com). Do not send RMM tokens to this integration.',
      evidence: { error: message },
    });
    return null;
  }
}
