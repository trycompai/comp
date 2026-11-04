import type { FetchImpl } from './client';

const TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
const PERSONAL_ACCESS_TOKEN_TYPE = 'urn:logto:token-type:personal_access_token';

export interface ExchangePersonalAccessTokenOptions {
  /** Region API base URL. Doubles as the OAuth resource indicator. */
  apiBaseUrl: string;
  /** Region Logto endpoint. */
  logtoEndpoint: string;
  personalAccessToken: string;
  fetchImpl?: FetchImpl;
}

/** Public endpoint: the region's published list of client applications. */
const fetchCliAppId = async ({
  apiBaseUrl,
  fetchImpl,
}: {
  apiBaseUrl: string;
  fetchImpl: FetchImpl;
}): Promise<string> => {
  const response = await fetchImpl(`${apiBaseUrl}/client-apps`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Could not read the CybeDefend client apps registry (HTTP ${response.status}). Check the region.`,
    );
  }

  const registry = (await response.json()) as { cli?: { appId?: unknown } };
  const appId = registry?.cli?.appId;

  if (typeof appId !== 'string' || !appId) {
    throw new Error('The CybeDefend client apps registry did not advertise a CLI client app.');
  }

  return appId;
};

/**
 * The API token lives for minutes: obtained once per run, never cached beyond
 * it. No message below carries the personal access token: they are persisted
 * on the integration result and displayed.
 */
export const exchangePersonalAccessToken = async ({
  apiBaseUrl,
  logtoEndpoint,
  personalAccessToken,
  fetchImpl = globalThis.fetch as unknown as FetchImpl,
}: ExchangePersonalAccessTokenOptions): Promise<string> => {
  const clientId = await fetchCliAppId({ apiBaseUrl, fetchImpl });

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: TOKEN_EXCHANGE_GRANT,
    subject_token: personalAccessToken,
    subject_token_type: PERSONAL_ACCESS_TOKEN_TYPE,
    resource: apiBaseUrl,
  });

  const response = await fetchImpl(`${logtoEndpoint}/oidc/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(
      `CybeDefend rejected the personal access token (HTTP ${response.status}). It may be expired, or issued for a different region.`,
    );
  }

  const payload = (await response.json().catch(() => null)) as { access_token?: unknown } | null;

  if (typeof payload?.access_token !== 'string' || !payload.access_token) {
    throw new Error(
      `CybeDefend returned no usable access token for the personal access token (HTTP ${response.status}).`,
    );
  }

  return payload.access_token;
};
