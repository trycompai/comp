import { Injectable, Logger } from '@nestjs/common';
import { getManifest } from '@comp/integration-platform';
import { OAuthCredentialsService } from './oauth-credentials.service';

type OAuthRevokeConfig = {
  url: string;
  method?: 'POST' | 'DELETE';
  auth?: 'basic' | 'bearer' | 'none';
  body?: 'form' | 'json';
  tokenField?: string;
  extraBodyFields?: Record<string, string>;
};

const isOAuthRevokeConfig = (value: unknown): value is OAuthRevokeConfig => {
  if (!value || typeof value !== 'object') return false;

  const v = value as Record<string, unknown>;
  if (typeof v.url !== 'string') return false;

  if (v.method !== undefined && v.method !== 'POST' && v.method !== 'DELETE') {
    return false;
  }

  if (
    v.auth !== undefined &&
    v.auth !== 'basic' &&
    v.auth !== 'bearer' &&
    v.auth !== 'none'
  ) {
    return false;
  }

  if (v.body !== undefined && v.body !== 'form' && v.body !== 'json') {
    return false;
  }

  if (v.tokenField !== undefined && typeof v.tokenField !== 'string') {
    return false;
  }

  if (
    v.extraBodyFields !== undefined &&
    (typeof v.extraBodyFields !== 'object' || v.extraBodyFields === null)
  ) {
    return false;
  }

  return true;
};

@Injectable()
export class OAuthTokenRevocationService {
  private readonly logger = new Logger(OAuthTokenRevocationService.name);

  constructor(
    private readonly oauthCredentialsService: OAuthCredentialsService,
  ) {}

  async revokeAccessToken({
    providerSlug,
    organizationId,
    accessToken,
  }: {
    providerSlug: string;
    organizationId: string;
    accessToken: string;
  }): Promise<void> {
    const manifest = getManifest(providerSlug);
    if (!manifest || manifest.auth.type !== 'oauth2') return;

    const oauthConfig = manifest.auth.config;
    if (!('revoke' in oauthConfig)) return;

    const revokeConfigUnknown = oauthConfig.revoke;
    if (!isOAuthRevokeConfig(revokeConfigUnknown)) return;

    const revokeConfig = {
      url: revokeConfigUnknown.url,
      method: revokeConfigUnknown.method ?? 'POST',
      auth: revokeConfigUnknown.auth ?? 'basic',
      body: revokeConfigUnknown.body ?? 'form',
      tokenField: revokeConfigUnknown.tokenField ?? 'token',
      extraBodyFields: revokeConfigUnknown.extraBodyFields,
    };

    const oauthCreds = await this.oauthCredentialsService.getCredentials(
      providerSlug,
      organizationId,
    );

    const url = revokeConfig.url.replace(
      '{CLIENT_ID}',
      encodeURIComponent(oauthCreds?.clientId ?? ''),
    );

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'CompAI-Integration',
    };

    if (revokeConfig.auth === 'basic') {
      if (!oauthCreds?.clientId || !oauthCreds.clientSecret) {
        this.logger.warn(
          `OAuth credentials not configured; cannot revoke token for ${providerSlug} org ${organizationId}`,
        );
        return;
      }

      const basicAuth = Buffer.from(
        `${oauthCreds.clientId}:${oauthCreds.clientSecret}`,
      ).toString('base64');
      headers.Authorization = `Basic ${basicAuth}`;
    }

    if (revokeConfig.auth === 'bearer') {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let body: string | undefined;
    if (revokeConfig.body === 'json') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        [revokeConfig.tokenField]: accessToken,
        ...(revokeConfig.extraBodyFields ?? {}),
      });
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams({
        [revokeConfig.tokenField]: accessToken,
        ...(revokeConfig.extraBodyFields ?? {}),
      });
      body = params.toString();
    }

    const response = await fetch(url, {
      method: revokeConfig.method,
      headers,
      body,
    });

    // Treat 404 as already revoked.
    if (response.ok || response.status === 404) return;

    const text = await response.text().catch(() => '');
    throw new Error(
      `Token revoke failed for ${providerSlug} (${response.status}): ${text.slice(0, 200)}`,
    );
  }
}
