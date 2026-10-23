import { describe, expect, test } from 'bun:test';
import { exchangePersonalAccessToken } from './auth';
import type { FetchImpl } from './client';
import { at, rejectionOf } from './test-support';

const PAT = 'pat_secret_value_that_must_never_escape';
const APP_ID = '7tx9q19tn1teq88ml18gc';

interface RecordedRequest {
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

const fakeLogto = ({
  tokenStatus = 200,
  clientAppsStatus = 200,
}: { tokenStatus?: number; clientAppsStatus?: number } = {}) => {
  const requests: RecordedRequest[] = [];

  const fetchImpl: FetchImpl = async (url, init) => {
    requests.push({ url, headers: init?.headers, body: init?.body });

    if (url.includes('/client-apps')) {
      return {
        ok: clientAppsStatus === 200,
        status: clientAppsStatus,
        json: async () => ({ cli: { appId: APP_ID }, vscode: { appId: 'x' } }),
        text: async () => '',
      };
    }

    return {
      ok: tokenStatus === 200,
      status: tokenStatus,
      json: async () => ({ access_token: 'issued-access-token', expires_in: 900 }),
      text: async () => 'invalid_grant',
    };
  };

  return { fetchImpl, requests };
};

const options = (fetchImpl: FetchImpl) => ({
  apiBaseUrl: 'https://api-eu.cybedefend.com',
  logtoEndpoint: 'https://auth-eu.cybedefend.com',
  personalAccessToken: PAT,
  fetchImpl,
});

describe('exchangePersonalAccessToken', () => {
  test('returns the issued access token', async () => {
    const { fetchImpl } = fakeLogto();

    expect(await exchangePersonalAccessToken(options(fetchImpl))).toBe('issued-access-token');
  });

  test('discovers the CLI app id from the public client-apps endpoint', async () => {
    const { fetchImpl, requests } = fakeLogto();

    await exchangePersonalAccessToken(options(fetchImpl));

    expect(at(requests, 0).url).toBe('https://api-eu.cybedefend.com/client-apps');
  });

  test('exchanges against the region Logto endpoint', async () => {
    const { fetchImpl, requests } = fakeLogto();

    await exchangePersonalAccessToken(options(fetchImpl));

    expect(at(requests, 1).url).toBe('https://auth-eu.cybedefend.com/oidc/token');
  });

  test('uses the token-exchange grant with the personal access token subject type', async () => {
    const { fetchImpl, requests } = fakeLogto();

    await exchangePersonalAccessToken(options(fetchImpl));

    const body = new URLSearchParams(at(requests, 1).body);
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:token-exchange');
    expect(body.get('subject_token_type')).toBe('urn:logto:token-type:personal_access_token');
    expect(body.get('client_id')).toBe(APP_ID);
  });

  test('sets the resource to the region API base URL', async () => {
    // A resource from another region yields a token the API refuses.
    const { fetchImpl, requests } = fakeLogto();

    await exchangePersonalAccessToken(options(fetchImpl));

    expect(new URLSearchParams(at(requests, 1).body).get('resource')).toBe(
      'https://api-eu.cybedefend.com',
    );
  });
});

describe('exchangePersonalAccessToken: token handling', () => {
  test('never puts the personal access token in a URL', async () => {
    const { fetchImpl, requests } = fakeLogto();

    await exchangePersonalAccessToken(options(fetchImpl));

    for (const request of requests) {
      expect(request.url).not.toContain(PAT);
    }
  });

  test('never leaks the personal access token when the exchange fails', async () => {
    const { fetchImpl } = fakeLogto({ tokenStatus: 400 });

    const error = await rejectionOf(exchangePersonalAccessToken(options(fetchImpl)));

    expect(error.message).not.toContain(PAT);
  });

  test('reports a 200 whose body is not JSON as an exchange failure', async () => {
    // A proxy or captive portal can answer 200 with HTML; the raw SyntaxError
    // that follows tells the operator nothing about the region or the token.
    const fetchImpl: FetchImpl = async (url) =>
      url.includes('/client-apps')
        ? {
            ok: true,
            status: 200,
            json: async () => ({ cli: { appId: APP_ID } }),
            text: async () => '',
          }
        : {
            ok: true,
            status: 200,
            json: async () => {
              throw new SyntaxError('Unexpected token <');
            },
            text: async () => '<html>gateway</html>',
          };

    const error = await rejectionOf(exchangePersonalAccessToken(options(fetchImpl)));

    expect(error.message).toMatch(/personal access token/i);
    expect(error.message).not.toContain(PAT);
  });

  test('reports a failed exchange rather than returning an empty token', async () => {
    const { fetchImpl } = fakeLogto({ tokenStatus: 400 });

    await expect(exchangePersonalAccessToken(options(fetchImpl))).rejects.toThrow(
      /personal access token/i,
    );
  });

  test('reports an unreachable client-apps endpoint distinctly', async () => {
    const { fetchImpl } = fakeLogto({ clientAppsStatus: 503 });

    await expect(exchangePersonalAccessToken(options(fetchImpl))).rejects.toThrow(/client app/i);
  });
});
